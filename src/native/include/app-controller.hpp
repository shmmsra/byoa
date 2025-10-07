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

#ifdef _WIN32
#include <windows.h>
#endif

class AppController {
public:
	// Singleton access method
	static AppController& getInstance();

	// Delete copy constructor and assignment operator
	AppController(const AppController&) = delete;
	AppController& operator=(const AppController&) = delete;

	void init();
	int start();
	int stop();
	std::shared_ptr<WindowWrapper> getMainWindow();
	std::shared_ptr<WindowWrapper> getAssistantWindow();
#ifdef _WIN32
	HWND getHiddenWindowHandle();
#endif

private:
	AppController() = default;
	~AppController() = default;
    
	process_id_t _focusedAppPId = 0;
	saucer::application* _app;
	std::shared_ptr<WindowWrapper> _mainWindow;
	std::shared_ptr<WindowWrapper> _assistantWindow;
	void _copyContent();
	void _pasteContent(const std::string& type, const std::string& data);
};
