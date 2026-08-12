#include <SQLiteCpp/SQLiteCpp.h>
#include <cstdlib>
#include <filesystem>
#include <functional>
#include <mutex>
#include <nlohmann/json.hpp>
#include <optional>
#include <sstream>

#include "history.hpp"
#include "logger.hpp"

using json = nlohmann::json;

namespace byoa {

    namespace {

        constexpr const char *APP_DATA_DIR_NAME = "BYOAssistant";
        constexpr const char *DB_FILE_NAME      = "history.db";

        std::mutex g_dbMutex;
        std::optional<SQLite::Database> g_db;

        // Deterministic content fingerprint for the request text. Not cryptographic -
        // it exists to make it easy to spot/dedupe identical requests later, not as a
        // security primitive, so std::hash is sufficient and avoids a crypto dependency.
        std::string fingerprint(const std::string &text) {
            std::size_t hash = std::hash<std::string>{}(text);
            std::ostringstream oss;
            oss << std::hex << hash;
            return oss.str();
        }

        std::string getOptionalString(const json &entry, const char *key) {
            if (entry.contains(key) && entry[key].is_string()) {
                return entry[key].get<std::string>();
            }
            return "";
        }

    } // namespace

    std::string History::resolveDbPath() {
        std::filesystem::path baseDir;

#if defined(_WIN32)
        const char *appData = std::getenv("APPDATA");
        baseDir             = appData ? std::filesystem::path(appData) : std::filesystem::current_path();
#elif defined(__APPLE__)
        const char *home = std::getenv("HOME");
        baseDir          = home ? std::filesystem::path(home) / "Library" / "Application Support" : std::filesystem::current_path();
#else
        const char *xdgDataHome = std::getenv("XDG_DATA_HOME");
        if (xdgDataHome) {
            baseDir = std::filesystem::path(xdgDataHome);
        } else {
            const char *home = std::getenv("HOME");
            baseDir          = home ? std::filesystem::path(home) / ".local" / "share" : std::filesystem::current_path();
        }
#endif

        std::filesystem::path dir = baseDir / APP_DATA_DIR_NAME;
        std::error_code ec;
        std::filesystem::create_directories(dir, ec);
        if (ec) {
            Logger::getInstance().error("Failed to create history data directory: {}", ec.message());
        }

        return (dir / DB_FILE_NAME).string();
    }

    bool History::init() {
        std::lock_guard<std::mutex> lock(g_dbMutex);

        if (g_db) {
            return true;
        }

        try {
            g_db.emplace(resolveDbPath(), SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE);

            g_db->exec(R"SQL(
                CREATE TABLE IF NOT EXISTS history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_hash TEXT NOT NULL,
                    request TEXT NOT NULL,
                    system_content TEXT NOT NULL DEFAULT '',
                    response TEXT,
                    model TEXT NOT NULL,
                    llm_config_name TEXT,
                    action_id TEXT,
                    action_name TEXT,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    response_time_ms INTEGER,
                    requested_at TEXT NOT NULL,
                    schema_version INTEGER NOT NULL DEFAULT 1,
                    focused_app_name TEXT NOT NULL DEFAULT ''
                )
            )SQL");

            g_db->exec("CREATE INDEX IF NOT EXISTS idx_history_requested_at ON history(requested_at)");

            // Migrate databases created before newer columns existed.
            bool hasSystemContent  = false;
            bool hasFocusedAppName = false;
            SQLite::Statement pragma(*g_db, "PRAGMA table_info(history)");
            while (pragma.executeStep()) {
                std::string columnName = pragma.getColumn(1).getString();
                if (columnName == "system_content") {
                    hasSystemContent = true;
                } else if (columnName == "focused_app_name") {
                    hasFocusedAppName = true;
                }
            }
            if (!hasSystemContent) {
                g_db->exec("ALTER TABLE history ADD COLUMN system_content TEXT NOT NULL DEFAULT ''");
            }
            if (!hasFocusedAppName) {
                g_db->exec("ALTER TABLE history ADD COLUMN focused_app_name TEXT NOT NULL DEFAULT ''");
            }

            return true;
        } catch (const std::exception &ex) {
            Logger::getInstance().error("Failed to initialize history database: {}", ex.what());
            g_db.reset();
            return false;
        }
    }

    bool History::insertEntry(const std::string &entryJson) {
        std::lock_guard<std::mutex> lock(g_dbMutex);

        if (!g_db) {
            Logger::getInstance().error("History database not initialized");
            return false;
        }

        try {
            json entry = json::parse(entryJson);

            std::string request = getOptionalString(entry, "request");

            SQLite::Statement stmt(*g_db, R"SQL(
                INSERT INTO history (
                    request_hash, request, system_content, response, model, llm_config_name,
                    action_id, action_name, status, error_message,
                    response_time_ms, requested_at, schema_version, focused_app_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            )SQL");

            stmt.bind(1, fingerprint(request));
            stmt.bind(2, request);
            stmt.bind(3, getOptionalString(entry, "systemContent"));

            if (entry.contains("response") && entry["response"].is_string()) {
                stmt.bind(4, entry["response"].get<std::string>());
            } else {
                stmt.bind(4);
            }

            stmt.bind(5, getOptionalString(entry, "model"));
            stmt.bind(6, getOptionalString(entry, "llmConfigName"));
            stmt.bind(7, getOptionalString(entry, "actionId"));
            stmt.bind(8, getOptionalString(entry, "actionName"));
            stmt.bind(9, getOptionalString(entry, "status"));
            stmt.bind(10, getOptionalString(entry, "errorMessage"));

            if (entry.contains("responseTimeMs") && entry["responseTimeMs"].is_number()) {
                stmt.bind(11, static_cast<long long>(entry["responseTimeMs"].get<int64_t>()));
            } else {
                stmt.bind(11);
            }

            stmt.bind(12, getOptionalString(entry, "requestedAt"));
            stmt.bind(13, entry.value("schemaVersion", 1));
            stmt.bind(14, getOptionalString(entry, "focusedAppName"));

            stmt.exec();
            return true;
        } catch (const std::exception &ex) {
            Logger::getInstance().error("Failed to insert history entry: {}", ex.what());
            return false;
        }
    }

    std::string History::queryEntries(const std::string &filterJson) {
        std::lock_guard<std::mutex> lock(g_dbMutex);

        json result     = json::object();
        result["items"] = json::array();
        result["total"] = 0;

        if (!g_db) {
            Logger::getInstance().error("History database not initialized");
            return result.dump();
        }

        try {
            json filter = filterJson.empty() ? json::object() : json::parse(filterJson);

            std::string keyword = getOptionalString(filter, "keyword");
            std::string model   = getOptionalString(filter, "model");
            std::string status  = getOptionalString(filter, "status");
            int64_t limit       = filter.value("limit", 50);
            int64_t offset      = filter.value("offset", 0);

            std::string whereClause = R"SQL(
                WHERE (?1 = '' OR request LIKE '%' || ?1 || '%' OR response LIKE '%' || ?1 || '%'
                       OR system_content LIKE '%' || ?1 || '%')
                  AND (?2 = '' OR model LIKE '%' || ?2 || '%')
                  AND (?3 = '' OR status = ?3)
            )SQL";

            SQLite::Statement countStmt(*g_db, "SELECT COUNT(*) FROM history " + whereClause);
            countStmt.bind(1, keyword);
            countStmt.bind(2, model);
            countStmt.bind(3, status);
            if (countStmt.executeStep()) {
                result["total"] = countStmt.getColumn(0).getInt64();
            }

            SQLite::Statement selectStmt(*g_db, R"SQL(
                SELECT id, request_hash, request, system_content, response, model, llm_config_name,
                       action_id, action_name, status, error_message, response_time_ms,
                       requested_at, schema_version, focused_app_name
                FROM history
            )SQL" + whereClause + "ORDER BY requested_at DESC LIMIT ?4 OFFSET ?5");
            selectStmt.bind(1, keyword);
            selectStmt.bind(2, model);
            selectStmt.bind(3, status);
            selectStmt.bind(4, static_cast<long long>(limit));
            selectStmt.bind(5, static_cast<long long>(offset));

            while (selectStmt.executeStep()) {
                json item;
                item["id"]             = selectStmt.getColumn(0).getInt64();
                item["requestHash"]    = selectStmt.getColumn(1).getString();
                item["request"]        = selectStmt.getColumn(2).getString();
                item["systemContent"]  = selectStmt.getColumn(3).getString();
                item["response"]       = selectStmt.getColumn(4).isNull() ? nullptr : json(selectStmt.getColumn(4).getString());
                item["model"]          = selectStmt.getColumn(5).getString();
                item["llmConfigName"]  = selectStmt.getColumn(6).getString();
                item["actionId"]       = selectStmt.getColumn(7).getString();
                item["actionName"]     = selectStmt.getColumn(8).getString();
                item["status"]         = selectStmt.getColumn(9).getString();
                item["errorMessage"]   = selectStmt.getColumn(10).getString();
                item["responseTimeMs"] = selectStmt.getColumn(11).isNull() ? nullptr : json(selectStmt.getColumn(11).getInt64());
                item["requestedAt"]    = selectStmt.getColumn(12).getString();
                item["schemaVersion"]  = selectStmt.getColumn(13).getInt();
                item["focusedAppName"] = selectStmt.getColumn(14).getString();
                result["items"].push_back(item);
            }
        } catch (const std::exception &ex) {
            Logger::getInstance().error("Failed to query history entries: {}", ex.what());
        }

        return result.dump();
    }

    bool History::deleteEntry(int64_t id) {
        std::lock_guard<std::mutex> lock(g_dbMutex);

        if (!g_db) {
            Logger::getInstance().error("History database not initialized");
            return false;
        }

        try {
            SQLite::Statement stmt(*g_db, "DELETE FROM history WHERE id = ?");
            stmt.bind(1, static_cast<long long>(id));
            stmt.exec();
            return true;
        } catch (const std::exception &ex) {
            Logger::getInstance().error("Failed to delete history entry: {}", ex.what());
            return false;
        }
    }

    bool History::clearAll() {
        std::lock_guard<std::mutex> lock(g_dbMutex);

        if (!g_db) {
            Logger::getInstance().error("History database not initialized");
            return false;
        }

        try {
            g_db->exec("DELETE FROM history");
            return true;
        } catch (const std::exception &ex) {
            Logger::getInstance().error("Failed to clear history: {}", ex.what());
            return false;
        }
    }

} // namespace byoa
