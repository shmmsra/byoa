#pragma once

#include <memory>
#include <saucer/window.hpp>
#include "webview-wrapper.hpp"

#ifdef _WIN32
#include <windows.h>
#endif

class WindowWrapper {
public:
    WindowWrapper(saucer::application* app, bool isPopup);
    ~WindowWrapper();
    bool isVisible();
    void show();
    void hide();
    void move();
    void resize(const int& width, const int& height, const bool& animate = false);

private:

    bool _isPopup = false;
    bool _isWindowVisible = false;
    std::shared_ptr<saucer::window> _window;
    std::shared_ptr<WebviewWrapper> _webview;
    std::string _getViewURL(const std::string& workflow = "");

#ifdef _WIN32
    HHOOK _keyboardHook = nullptr;
    static LRESULT CALLBACK KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam);
    void installKeyboardHook();
    void uninstallKeyboardHook();
#endif
};
