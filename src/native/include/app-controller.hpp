#pragma once

#include <string>
#include <memory>
#include "window-wrapper.hpp"

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
	std::shared_ptr<WindowWrapper> getMainWindow();
	std::shared_ptr<WindowWrapper> getAssistantWindow();

private:
	AppController() = default;
	~AppController() = default;
    
	pid_t _focusedAppPId = 0;
	std::shared_ptr<WindowWrapper> _mainWindow;
	std::shared_ptr<WindowWrapper> _assistantWindow;
	void _copyContent();
	void _pasteContent(const std::string& type, const std::string& data);
};
