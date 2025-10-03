#pragma once

#include <memory>
#include <string>
#include <optional>
#include <saucer/smartview.hpp>
#include <saucer/window.hpp>

class WebviewWrapper {
public:
    WebviewWrapper(std::shared_ptr<saucer::window> window);
    bool init(const std::string& viewURL);
    void triggerEvent(const std::string& eventName, const std::string& data);

private:
    std::optional<saucer::smartview<>> _webview;
};
