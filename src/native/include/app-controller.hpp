#pragma once

#include <string>
#include <memory>
#include <saucer/smartview.hpp>
#include <saucer/window.hpp>

class AppController {
public:
	// Singleton access method
	static AppController& getInstance();

	// Delete copy constructor and assignment operator
	AppController(const AppController&) = delete;
	AppController& operator=(const AppController&) = delete;

	void init();
	int start();

    void showWindow();
	void hideWindow();
	void moveWindow();
	void resizeWindow(const int& width, const int& height, const bool& animate = false);

private:
	AppController() = default;
	~AppController() = default;
    
	pid_t _focusedAppPId = 0;
    bool _isWindowVisible = false;
	std::shared_ptr<saucer::window> _window;

    std::string _getViewURL();
	void _copyContent();
	void _pasteContent(const std::string& type, const std::string& data);
};
