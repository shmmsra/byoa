#pragma once

#include <spdlog/spdlog.h>
#include <spdlog/fmt/fmt.h>
#include <memory>

class Logger {
    public:
        // Singleton access method
        static Logger& getInstance();

        // Delete copy constructor and assignment operator
        Logger(const Logger&) = delete;
        Logger& operator=(const Logger&) = delete;

        void init();
        
        // Variadic template functions for formatted logging
        template<typename... Args>
        void error(const std::string& fmt, Args&&... args) {
            if (m_logger) {
                m_logger->error(fmt::runtime(fmt), std::forward<Args>(args)...);
            }
        }
        
        template<typename... Args>
        void warn(const std::string& fmt, Args&&... args) {
            if (m_logger) {
                m_logger->warn(fmt::runtime(fmt), std::forward<Args>(args)...);
            }
        }
        
        template<typename... Args>
        void info(const std::string& fmt, Args&&... args) {
            if (m_logger) {
                m_logger->info(fmt::runtime(fmt), std::forward<Args>(args)...);
            }
        }

        // Overloads for simple string messages (no formatting)
        void error(const std::string& message);
        void warn(const std::string& message);
        void info(const std::string& message);

    private:
        Logger() = default;
        ~Logger() = default;
        
        std::shared_ptr<spdlog::logger> m_logger;
};
