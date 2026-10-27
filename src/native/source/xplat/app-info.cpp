#include <string>

#include "app-info.hpp"
#include "logger.hpp"

#if defined(_WIN32)
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <filesystem>
#include <vector>
#include <windows.h>
#elif defined(__APPLE__)
#include <libproc.h>
#include <unistd.h>
#endif

namespace byoa {

    std::string AppInfo::getExecutablePath() {
#if defined(_WIN32)
        std::vector<wchar_t> buffer(32768);
        const DWORD length = GetModuleFileNameW(nullptr, buffer.data(), static_cast<DWORD>(buffer.size()));
        if (length == 0 || length >= buffer.size()) {
            Logger::getInstance().error("AppInfo: Failed to get executable path");
            return "";
        }

        const auto utf8Path = std::filesystem::path(std::wstring(buffer.data(), length)).u8string();
        return std::string(utf8Path.begin(), utf8Path.end());
#elif defined(__APPLE__)
        char path[PROC_PIDPATHINFO_MAXSIZE] = {};
        if (proc_pidpath(getpid(), path, sizeof(path)) <= 0) {
            Logger::getInstance().error("AppInfo: Failed to get executable path");
            return "";
        }
        return path;
#else
        Logger::getInstance().error("AppInfo: Executable path is unsupported on this platform");
        return "";
#endif
    }

} // namespace byoa
