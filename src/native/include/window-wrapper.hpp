#pragma once

#include <memory>
#include <saucer/window.hpp>
#include "webview-wrapper.hpp"

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
};
