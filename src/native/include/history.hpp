#pragma once

#include <cstdint>
#include <string>

namespace byoa {

    /**
     * @brief Helper class for managing local query/response history
     *
     * Stores a flat log of one-shot LLM requests/responses in a local SQLite
     * database. Entries and filters are exchanged as JSON strings so this
     * class can be called directly from the webview IPC bridge without an
     * intermediate serialization layer on the native side.
     */
    class History {
      public:
        /**
         * @brief Open (creating if necessary) the history database and table
         *
         * @return true if the database is ready to use, false otherwise
         */
        static bool init();

        /**
         * @brief Insert a new history entry
         *
         * @param entryJson JSON object with request/response/model/etc. fields
         * @return true if successful, false otherwise
         */
        static bool insertEntry(const std::string &entryJson);

        /**
         * @brief Query history entries matching an optional filter
         *
         * @param filterJson JSON object with optional keyword/model/status/limit/offset fields
         * @return JSON string: {"items": [...], "total": <number>}
         */
        static std::string queryEntries(const std::string &filterJson);

        /**
         * @brief Delete a single history entry
         *
         * @param id The row id of the entry to delete
         * @return true if successful, false otherwise
         */
        static bool deleteEntry(int64_t id);

        /**
         * @brief Delete all history entries
         *
         * @return true if successful, false otherwise
         */
        static bool clearAll();

      private:
        static std::string resolveDbPath();
    };

} // namespace byoa
