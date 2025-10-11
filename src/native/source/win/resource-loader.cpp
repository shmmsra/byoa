#ifdef _WIN32

#include "resource-loader.hpp"
#include "resource-ids.h"
#include "logger.hpp"
#include <windows.h>
#include <filesystem>
#include <fstream>
#include <shlobj.h>

namespace fs = std::filesystem;

std::string ResourceLoader::_tempPath;
bool ResourceLoader::_extracted = false;

std::optional<std::vector<unsigned char>> ResourceLoader::loadResource(int resourceId) {
    HMODULE hModule = GetModuleHandle(nullptr);
    HRSRC hResource = FindResource(hModule, MAKEINTRESOURCE(resourceId), RT_RCDATA);
    
    if (!hResource) {
        Logger::getInstance().error("ResourceLoader: Failed to find resource {}", resourceId);
        return std::nullopt;
    }

    HGLOBAL hLoadedResource = LoadResource(hModule, hResource);
    if (!hLoadedResource) {
        Logger::getInstance().error("ResourceLoader: Failed to load resource {}", resourceId);
        return std::nullopt;
    }

    LPVOID pResourceData = LockResource(hLoadedResource);
    DWORD resourceSize = SizeofResource(hModule, hResource);
    
    if (!pResourceData || resourceSize == 0) {
        Logger::getInstance().error("ResourceLoader: Invalid resource data for {}", resourceId);
        return std::nullopt;
    }

    std::vector<unsigned char> data(resourceSize);
    memcpy(data.data(), pResourceData, resourceSize);
    
    return data;
}

std::string ResourceLoader::getTempResourcePath() {
    if (!_tempPath.empty()) {
        return _tempPath;
    }

    // Get temp directory
    char tempPath[MAX_PATH];
    DWORD result = GetTempPathA(MAX_PATH, tempPath);
    if (result == 0 || result > MAX_PATH) {
        Logger::getInstance().error("ResourceLoader: Failed to get temp path");
        return "";
    }

    // Create a unique subdirectory for our resources
    fs::path resourceDir = fs::path(tempPath) / "ai_assistant_resources";
    
    try {
        if (fs::exists(resourceDir)) {
            // Clean up old resources
            fs::remove_all(resourceDir);
        }
        fs::create_directories(resourceDir);
        _tempPath = resourceDir.string();
        Logger::getInstance().info("ResourceLoader: Using temp path: {}", _tempPath);
        return _tempPath;
    } catch (const std::exception& e) {
        Logger::getInstance().error("ResourceLoader: Failed to create temp directory: {}", e.what());
        return "";
    }
}

std::optional<std::string> ResourceLoader::extractWebResources() {
    if (_extracted && !_tempPath.empty()) {
        return _tempPath;
    }

    std::string tempDir = getTempResourcePath();
    if (tempDir.empty()) {
        return std::nullopt;
    }

    // Extract index.html first
    auto indexData = loadResource(IDR_WEB_INDEX_HTML);
    if (!indexData) {
        Logger::getInstance().error("ResourceLoader: Failed to load index.html resource");
        return std::nullopt;
    }

    fs::path indexPath = fs::path(tempDir) / "index.html";
    try {
        std::ofstream indexFile(indexPath, std::ios::binary);
        if (!indexFile) {
            Logger::getInstance().error("ResourceLoader: Failed to create index.html");
            return std::nullopt;
        }
        indexFile.write(reinterpret_cast<const char*>(indexData->data()), indexData->size());
        indexFile.close();
        Logger::getInstance().info("ResourceLoader: Extracted index.html");
    } catch (const std::exception& e) {
        Logger::getInstance().error("ResourceLoader: Failed to write index.html: {}", e.what());
        return std::nullopt;
    }

    // Extract all other resources using the generated resource map
    const auto& resourceMap = getResourceMap();
    int extractedCount = 0;

    for (const auto& [resourceId, filename] : resourceMap) {
        // Skip index.html as we already extracted it
        if (resourceId == IDR_WEB_INDEX_HTML) {
            continue;
        }

        auto resourceData = loadResource(resourceId);
        if (!resourceData) {
            Logger::getInstance().warn("ResourceLoader: Failed to load resource {} ({})", resourceId, filename);
            continue;
        }

        // Create subdirectories if needed
        fs::path resourcePath = fs::path(tempDir) / filename;
        fs::path parentDir = resourcePath.parent_path();
        
        if (!parentDir.empty() && !fs::exists(parentDir)) {
            try {
                fs::create_directories(parentDir);
            } catch (const std::exception& e) {
                Logger::getInstance().error("ResourceLoader: Failed to create directory {}: {}", parentDir.string(), e.what());
                continue;
            }
        }

        // Write the resource to file
        try {
            std::ofstream outFile(resourcePath, std::ios::binary);
            if (!outFile) {
                Logger::getInstance().error("ResourceLoader: Failed to create file {}", filename);
                continue;
            }
            outFile.write(reinterpret_cast<const char*>(resourceData->data()), resourceData->size());
            outFile.close();
            extractedCount++;
            Logger::getInstance().info("ResourceLoader: Extracted {}", filename);
        } catch (const std::exception& e) {
            Logger::getInstance().error("ResourceLoader: Failed to write {}: {}", filename, e.what());
            continue;
        }
    }

    Logger::getInstance().info("ResourceLoader: Successfully extracted {} resources", extractedCount);
    
    _extracted = true;
    return tempDir;
}

void ResourceLoader::cleanup() {
    if (_tempPath.empty()) {
        return;
    }

    try {
        if (fs::exists(_tempPath)) {
            fs::remove_all(_tempPath);
            Logger::getInstance().info("ResourceLoader: Cleaned up temp resources");
        }
    } catch (const std::exception& e) {
        Logger::getInstance().warn("ResourceLoader: Failed to clean up temp resources: {}", e.what());
    }

    _tempPath.clear();
    _extracted = false;
}

#endif // _WIN32

