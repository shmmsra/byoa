#include "shortcut.hpp"
#include "app-controller.hpp"
#include "logger.hpp"
#include <functional>
#include <thread>
#include <windows.h>

#ifdef _WIN32
#include <windows.h>
#ifndef SHORTCUT_HOTKEY_ID
#define SHORTCUT_HOTKEY_ID 1000
#endif // SHORTCUT_HOTKEY_ID
#endif // _WIN32

Shortcut &Shortcut::getInstance() {
    static Shortcut instance;
    return instance;
}

bool Shortcut::registerHandler(ShortcutCallback &&callback) {
    Logger::getInstance().info("Shortcut::registerHandler: start (Windows)");

    _shortcutCallback = std::move(callback);
    auto hiddenWindow = AppController::getInstance().getHiddenWindowHandle();

    // Register the hotkey
    if (!RegisterHotKey(hiddenWindow, SHORTCUT_HOTKEY_ID, MOD_CONTROL | MOD_SHIFT, VK_SPACE)) {
        Logger::getInstance().error("Shortcut: Failed to register hotkey: {}", GetLastError());
        return false;
    }

    return true;
}

bool Shortcut::unregisterHandler() {
    Logger::getInstance().info("Shortcut::unregisterHandler: start (Windows)");

    auto hiddenWindow = AppController::getInstance().getHiddenWindowHandle();
    if (hiddenWindow) {
        UnregisterHotKey(hiddenWindow, SHORTCUT_HOTKEY_ID);
        PostMessage(hiddenWindow, WM_QUIT, 0, 0);
    }

    _shortcutCallback = nullptr;
    return true;
}

bool Shortcut::onTrigger(UINT uMsg, WPARAM wParam, LPARAM lParam) {
    if (uMsg == WM_HOTKEY && wParam == SHORTCUT_HOTKEY_ID) {
        Logger::getInstance().info("Shortcut: Hotkey pressed (Ctrl+Shift+Space)");
        if (_shortcutCallback) {
            _shortcutCallback();
        }
        return true;
    }
    return false;
}
