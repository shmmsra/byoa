#pragma once

#include <string>
#include <unordered_map>
#include <functional>

#ifdef _WIN32
#include <windows.h>
#ifndef SHORTCUT_HOTKEY_ID
#define SHORTCUT_HOTKEY_ID  1000
#endif  // SHORTCUT_HOTKEY_ID
#endif  // _WIN32

class Shortcut {
public:
    typedef std::function<void(void)> ShortcutCallback;

    // Singleton access method
    static Shortcut& getInstance();

    // Delete copy constructor and assignment operator
    Shortcut(const Shortcut&) = delete;
    Shortcut& operator=(const Shortcut&) = delete;

    // TODO: There could be bugs like memory leak or crashes in this shortcut handler.

    // Register a shortcut handler,
    // currently only one handler can be registered with predefined "cmd+shift+space" shortcut
    bool registerHandler(ShortcutCallback&& callback);
    bool unregisterHandler();

#ifdef _WIN32
    // Public on Windows so the window procedure can access it
    ShortcutCallback _shortcutCallback;
#endif  // _WIN32

private:
    Shortcut() = default;
    ~Shortcut() = default;

#ifdef _WIN32
    HWND _hotkeyWindow = nullptr;
#endif  // _WIN32
};
