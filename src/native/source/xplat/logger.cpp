#include <spdlog/spdlog.h>
#include <spdlog/sinks/basic_file_sink.h>

#include "logger.hpp"

Logger& Logger::getInstance() {
    static Logger instance;
    return instance;
}

void Logger::init() {
    try {
        // This creates a new logger that writes to "ai_assistant.log" in the working directory
        m_logger = spdlog::basic_logger_mt("BYOA", "/tmp/ai_assistant.log");
        m_logger->flush_on(spdlog::level::info); // Flush on every info and above

        m_logger->info("This log entry will appear in the file!");
        m_logger->info("AI Assistant started!");
    } catch (const spdlog::spdlog_ex& ex) {
        // Fallback to console if file logging fails
        m_logger = spdlog::default_logger();
        m_logger->error("Failed to initialize file logger: {}", ex.what());
    }
}

// Simple string overloads (no formatting)
void Logger::error(const std::string& message) {
    if (m_logger) {
        m_logger->error(message);
    }
}

void Logger::warn(const std::string& message) {
    if (m_logger) {
        m_logger->warn(message);
    }
}

void Logger::info(const std::string& message) {
    if (m_logger) {
        m_logger->info(message);
    }
}
