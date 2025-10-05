#include <windows.h>
#include <functional>
#include <thread>
#include "shortcut.hpp"
#include "logger.hpp"

// Static message window procedure
static LRESULT CALLBACK HotkeyWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    if (msg == WM_HOTKEY) {
        if (wParam == SHORTCUT_HOTKEY_ID) {
            Logger::getInstance().info("Shortcut: Hotkey pressed (Ctrl+Shift+Space)");
            // Get the Shortcut instance and call the callback
            auto& shortcut = Shortcut::getInstance();
            if (shortcut._shortcutCallback) {
                shortcut._shortcutCallback();
            }
            return 0;
        }
    }
    return DefWindowProc(hwnd, msg, wParam, lParam);
}

Shortcut& Shortcut::getInstance() {
    static Shortcut instance;
    return instance;
}

bool Shortcut::registerHandler(ShortcutCallback&& callback) {
    Logger::getInstance().info("Shortcut::registerHandler: start (Windows)");
    
    _shortcutCallback = std::move(callback);
    
    // Create a message-only window to receive hotkey messages
    std::thread([this]() {
        // Register window class
        WNDCLASSEXW wc = {};
        wc.cbSize = sizeof(WNDCLASSEXW);
        wc.lpfnWndProc = HotkeyWndProc;
        wc.hInstance = GetModuleHandle(nullptr);
        wc.lpszClassName = L"HotkeyWindow";
        
        if (!RegisterClassExW(&wc)) {
            DWORD error = GetLastError();
            if (error != ERROR_CLASS_ALREADY_EXISTS) {
                Logger::getInstance().error("Shortcut: Failed to register window class: {}", error);
                return;
            }
        }
        
        // Create a message-only window
        _hotkeyWindow = CreateWindowExW(
            0,
            L"HotkeyWindow",
            L"Hotkey Window",
            0,
            0, 0, 0, 0,
            HWND_MESSAGE,  // Message-only window
            nullptr,
            GetModuleHandle(nullptr),
            nullptr
        );
        
        if (!_hotkeyWindow) {
            Logger::getInstance().error("Shortcut: Failed to create hotkey window: {}", GetLastError());
            return;
        }
        
        // Register the hotkey
        if (!RegisterHotKey(_hotkeyWindow, SHORTCUT_HOTKEY_ID, MOD_CONTROL | MOD_SHIFT, VK_SPACE)) {
            Logger::getInstance().error("Shortcut: Failed to register hotkey: {}", GetLastError());
            DestroyWindow(_hotkeyWindow);
            _hotkeyWindow = nullptr;
            return;
        }
        
        Logger::getInstance().info("Shortcut: Hotkey registered successfully (Ctrl+Shift+Space)");
        
        // Message loop
        MSG msg;
        while (GetMessage(&msg, nullptr, 0, 0)) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }
        
        // Cleanup
        UnregisterHotKey(_hotkeyWindow, SHORTCUT_HOTKEY_ID);
        DestroyWindow(_hotkeyWindow);
        _hotkeyWindow = nullptr;
    }).detach();
    
    return true;
}

bool Shortcut::unregisterHandler() {
    Logger::getInstance().info("Shortcut::unregisterHandler: start (Windows)");
    
    if (_hotkeyWindow) {
        UnregisterHotKey(_hotkeyWindow, SHORTCUT_HOTKEY_ID);
        PostMessage(_hotkeyWindow, WM_QUIT, 0, 0);
        _hotkeyWindow = nullptr;
    }
    
    _shortcutCallback = nullptr;
    return true;
}
