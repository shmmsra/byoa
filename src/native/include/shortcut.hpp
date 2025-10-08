#pragma once

#include <functional>
#include <string>
#include <unordered_map>

#ifdef _WIN32
#include <windows.h>
#endif

class Shortcut {
  public:
    typedef std::function<void(void)> ShortcutCallback;

    // Singleton access method
    static Shortcut &getInstance();

    // Delete copy constructor and assignment operator
    Shortcut(const Shortcut &)            = delete;
    Shortcut &operator=(const Shortcut &) = delete;

    // TODO: There could be bugs like memory leak or crashes in this shortcut handler.

    // Register a shortcut handler,
    // currently only one handler can be registered with predefined "cmd+shift+space" shortcut
    bool registerHandler(ShortcutCallback &&callback);
    bool unregisterHandler();

#ifdef _WIN32
    bool onTrigger(UINT uMsg, WPARAM wParam, LPARAM lParam);
#else
    bool onTrigger();
#endif // _WIN32

  private:
    Shortcut()  = default;
    ~Shortcut() = default;

    ShortcutCallback _shortcutCallback;
};
