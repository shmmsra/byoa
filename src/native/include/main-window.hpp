#pragma once

#include <memory>
#include <saucer/window.hpp>
#include "webview-wrapper.hpp"

class MainWindow {
public:
	// Singleton access method
	static MainWindow& getInstance();

    // Delete copy constructor and assignment operator
    MainWindow(const MainWindow&) = delete;
    MainWindow& operator=(const MainWindow&) = delete;

    void create(saucer::application* app);
    void destroy();
    bool isVisible();
    void show();
    void hide();

private:
	MainWindow() = default;
	~MainWindow() = default;

    bool _isWindowVisible = false;
    std::shared_ptr<saucer::window> _window;
    std::shared_ptr<WebviewWrapper> _webview;
};
