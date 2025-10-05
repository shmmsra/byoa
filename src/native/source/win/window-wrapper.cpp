#include <windows.h>
#include <saucer/window.hpp>
#include "window-wrapper.hpp"
#include "logger.hpp"

WindowWrapper::WindowWrapper(saucer::application* app, bool isPopup) 
    : _isPopup(isPopup), _isWindowVisible(false) {
    Logger::getInstance().info("WindowWrapper::WindowWrapper: start (Windows)");
    
    // Create window using factory method
    _window = saucer::window::create(app).value();
    _window->set_title("Build Your Own Assistant");
    
    if (_isPopup) {
#ifdef DEBUG
        _window->set_size({1500, 900});
#else
        _window->set_size({750, 450});
#endif  // DEBUG
    } else {
#ifdef DEBUG
        _window->set_size({1500, 900});
#else
        _window->set_size({1000, 600});
#endif  // DEBUG
    }
    
    // Handle window close event - hide window instead of closing app
    _window->on<saucer::window::event::close>([&](){
        hide();
        return saucer::policy::block;
    });
    
    if (_isPopup) {
        // Set decorations BEFORE initializing webview
        _window->set_decorations(saucer::window::decoration::none);
        saucer::color bgColor = {255, 255, 255, 100};
        _window->set_background(bgColor);

        _window->on<saucer::window::event::focus>([&](bool status) {
            if (status) {
                _isWindowVisible = true;            
                // Call native callback if registered
                _webview->triggerEvent("on-focus-change", "true");
            } else {
                if (!_isWindowVisible) {
                    return;
                }
                hide();
                _isWindowVisible = false;
                // Call native callback if registered
                _webview->triggerEvent("on-focus-change", "false");
                // Note: Don't hide here as this might fire too aggressively
            }
        });
    }
    
    _webview = std::make_shared<WebviewWrapper>(_window);
    _webview->init(_getViewURL(_isPopup ? "assistant" : ""));
}

WindowWrapper::~WindowWrapper() {
    Logger::getInstance().info("WindowWrapper::~WindowWrapper: start");
}

void WindowWrapper::show() {
    Logger::getInstance().info("WindowWrapper::show: start");
    if (_window) {
        _window->show();
        _isWindowVisible = true;

#ifdef _WIN32
        if (_isPopup) {
            // Set decorations BEFORE initializing webview
            _window->set_decorations(saucer::window::decoration::partial);
            saucer::color bgColor = { 255, 255, 255, 100 };
            _window->set_background(bgColor);
        }
#endif  // _WIN32
    }
}

void WindowWrapper::hide() {
    Logger::getInstance().info("WindowWrapper::hide: start");
    if (_window) {
        _window->hide();
        _isWindowVisible = false;
    }
}

void WindowWrapper::move() {
    Logger::getInstance().info("WindowWrapper::move: start (Windows stub)");
    // TODO: Implement Windows-specific window positioning
}

void WindowWrapper::resize(const int& width, const int& height, const bool& animate) {
    Logger::getInstance().info("WindowWrapper::resize: start");
    if (_window) {
        _window->set_size({width, height});
    }
}

bool WindowWrapper::isVisible() {
    return _isWindowVisible;
}

std::string WindowWrapper::_getViewURL(const std::string& workflow) {
    return "https://google.com";
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
