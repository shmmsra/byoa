#include "window-wrapper.hpp"

WindowWrapper::~WindowWrapper() {
    _window = nullptr;
}

bool WindowWrapper::isVisible() {
    return _isWindowVisible;
}

bool WindowWrapper::isVisible() {
    return _isWindowVisible;
}

std::string WindowWrapper::_getViewURL(const std::string& workflow) {
#ifdef DEBUG
    // Debug mode: Try webpack dev server first for hot reloading
    std::string hostUrl = "http://localhost:3000";
    if (!workflow.empty()) {
        hostUrl.append("?workflow=").append(workflow);
    }
    Logger::getInstance().info("WindowWrapper::_getViewURL: Debug mode - trying dev server: {}", hostUrl);
    return hostUrl;
#else
    // Release mode: Load from bundled Resources folder
    // TODO: Implement Windows-specific resource loading
    Logger::getInstance().warn("WindowWrapper::_getViewURL: Release mode not yet implemented for Windows");
    return "";
#endif
}
