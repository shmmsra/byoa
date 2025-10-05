#include <windows.h>
#include <saucer/window.hpp>
#include "window-wrapper.hpp"
#include "logger.hpp"

// Static map to track WindowWrapper instances for keyboard hook
#include <unordered_map>
static std::unordered_map<HWND, WindowWrapper*> g_windowMap;

// Forward declare the stable natives structure for window
namespace saucer {
    template<typename T> struct stable_natives;
    template<> struct stable_natives<window> { HWND hwnd; };
}

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
    
    if (_isPopup) {
        uninstallKeyboardHook();
    }
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
            
            // Install keyboard hook for Escape key handling
            installKeyboardHook();
        }
#endif  // _WIN32
    }
}

void WindowWrapper::hide() {
    Logger::getInstance().info("WindowWrapper::hide: start");
    if (_window) {
        _window->hide();
        _isWindowVisible = false;
        
#ifdef _WIN32
        if (_isPopup) {
            // Uninstall keyboard hook when hiding
            uninstallKeyboardHook();
        }
#endif  // _WIN32
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

#ifdef _WIN32
// Keyboard hook procedure for Escape key handling
LRESULT CALLBACK WindowWrapper::KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION) {
        KBDLLHOOKSTRUCT* pKeyboard = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
        
        // Check for Escape key press (VK_ESCAPE = 0x1B)
        if (wParam == WM_KEYDOWN && pKeyboard->vkCode == VK_ESCAPE) {
            // Get the foreground window
            HWND foregroundWindow = GetForegroundWindow();
            
            // Check if this window is in our map
            auto it = g_windowMap.find(foregroundWindow);
            if (it != g_windowMap.end()) {
                WindowWrapper* wrapper = it->second;
                if (wrapper && wrapper->_isWindowVisible && wrapper->_isPopup) {
                    Logger::getInstance().info("WindowWrapper: Escape key pressed, hiding window");
                    wrapper->hide();
                    return 1; // Consume the event
                }
            }
        }
    }
    
    return CallNextHookEx(NULL, nCode, wParam, lParam);
}

void WindowWrapper::installKeyboardHook() {
    if (_keyboardHook) {
        return; // Already installed
    }
    
    // Get the native window handle
    auto native_window = _window->native();
    HWND hwnd = native_window.hwnd;
    
    // Add this window to the map
    g_windowMap[hwnd] = this;
    
    // Install a low-level keyboard hook
    _keyboardHook = SetWindowsHookEx(
        WH_KEYBOARD_LL,
        &WindowWrapper::KeyboardHookProc,
        GetModuleHandle(NULL),
        0
    );
    
    if (_keyboardHook) {
        Logger::getInstance().info("WindowWrapper: Keyboard hook installed for Escape key");
    } else {
        Logger::getInstance().error("WindowWrapper: Failed to install keyboard hook: {}", GetLastError());
    }
}

void WindowWrapper::uninstallKeyboardHook() {
    if (!_keyboardHook) {
        return; // Not installed
    }
    
    // Get the native window handle
    auto native_window = _window->native();
    HWND hwnd = native_window.hwnd;
    
    // Remove from map
    g_windowMap.erase(hwnd);
    
    // Uninstall the hook
    if (UnhookWindowsHookEx(_keyboardHook)) {
        Logger::getInstance().info("WindowWrapper: Keyboard hook uninstalled");
    } else {
        Logger::getInstance().error("WindowWrapper: Failed to uninstall keyboard hook: {}", GetLastError());
    }
    
    _keyboardHook = nullptr;
}
#endif  // _WIN32
