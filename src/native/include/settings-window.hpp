#pragma once

#include <memory>
#include <saucer/window.hpp>
#include "webview-wrapper.hpp"

class SettingsWindow {
public:
	// Singleton access method
	static SettingsWindow& getInstance();

    // Delete copy constructor and assignment operator
    SettingsWindow(const SettingsWindow&) = delete;
    SettingsWindow& operator=(const SettingsWindow&) = delete;

    void create(saucer::application* app);
    void destroy();
    bool isVisible();
    void show();
    void hide();

private:
	SettingsWindow() = default;
	~SettingsWindow() = default;

    bool _isWindowVisible = false;
    std::shared_ptr<saucer::window> _window;
    std::shared_ptr<WebviewWrapper> _webview;
};
