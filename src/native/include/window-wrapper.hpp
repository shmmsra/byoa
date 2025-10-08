#pragma once

#include "webview-wrapper.hpp"
#include <memory>
#include <saucer/window.hpp>

#ifdef _WIN32
#include <windows.h>
#endif

class WindowWrapper {
  public:
    enum WINDOW_TYPE { MAIN, POPUP };

    WindowWrapper(saucer::application *app, WINDOW_TYPE windowType);
    ~WindowWrapper();
    bool isVisible();
    void show();
    void hide();
    void move();
    void resize(const int &width, const int &height, const bool &animate = false);
    void sendEventToWebview(const std::string &eventName, const std::string &data);
#ifdef _WIN32
    HWND getWindowHandle();
#endif

  private:
    WINDOW_TYPE _windowType;
    bool _isWindowVisible = false;
    std::shared_ptr<saucer::window> _window;
    std::shared_ptr<WebviewWrapper> _webview;
    std::string _getViewURL(const std::string &workflow = "");

#ifdef _WIN32
    HHOOK _keyboardHook = nullptr;
    static LRESULT CALLBACK KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam);
    void installKeyboardHook();
    void uninstallKeyboardHook();
#endif
};
