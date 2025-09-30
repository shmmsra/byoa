#pragma once

#include <string>
#include <unordered_map>
#include <functional>

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

private:
    Shortcut() = default;
    ~Shortcut() = default;
};
