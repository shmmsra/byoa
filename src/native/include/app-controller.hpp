#pragma once

#include <string>
#include <memory>
#include <cstdint>
#include "window-wrapper.hpp"

// Cross-platform process ID type
#ifdef _WIN32
using process_id_t = uint32_t;
#else
#include <unistd.h>
using process_id_t = pid_t;
#endif

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
    
	process_id_t _focusedAppPId = 0;
	std::shared_ptr<WindowWrapper> _mainWindow;
	std::shared_ptr<WindowWrapper> _assistantWindow;
	void _copyContent();
	void _pasteContent(const std::string& type, const std::string& data);
};
