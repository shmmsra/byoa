#pragma once

#include <string>
#include <memory>
#include <saucer/smartview.hpp>
#include <saucer/window.hpp>
#include "webview-wrapper.hpp"

// Forward declaration to avoid including Objective-C headers in C++ files
class MenubarController;

class AppController {
public:
	// Singleton access method
	static AppController& getInstance();

	// Delete copy constructor and assignment operator
	AppController(const AppController&) = delete;
	AppController& operator=(const AppController&) = delete;

	void init();
	int start();
    std::string getViewURL(const std::string& workflow = "");

private:
	AppController() = default;
	~AppController() = default;
    
	pid_t _focusedAppPId = 0;
	void _copyContent();
	void _pasteContent(const std::string& type, const std::string& data);
};
