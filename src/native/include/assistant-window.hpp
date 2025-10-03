#pragma once

#include <memory>
#include <saucer/window.hpp>
#include "webview-wrapper.hpp"

class AssistantWindow {
public:
	// Singleton access method
	static AssistantWindow& getInstance();

    // Delete copy constructor and assignment operator
    AssistantWindow(const AssistantWindow&) = delete;
    AssistantWindow& operator=(const AssistantWindow&) = delete;

    void create(saucer::application* app);
    void destroy();
    bool isVisible();
    void show();
    void hide();
    void move();
    void resize(const int& width, const int& height, const bool& animate = false);

private:
	AssistantWindow() = default;
	~AssistantWindow() = default;

    bool _isWindowVisible = false;
    std::shared_ptr<saucer::window> _window;
    std::shared_ptr<WebviewWrapper> _webview;
};
