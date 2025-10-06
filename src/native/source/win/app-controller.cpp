#include <windows.h>
#include <saucer/window.hpp>

#include "logger.hpp"
#include "app-controller.hpp"
#include "window-wrapper.hpp"
#include "shortcut.hpp"
#include "clipboard.hpp"
#include "menubar-controller.hpp"

using namespace std;

AppController& AppController::getInstance() {
    static AppController instance;
    return instance;
}

void AppController::init() {
    Logger::getInstance().info("AppController::init: start (Windows)");
    // TODO: Implement Windows-specific initialization
}

int AppController::start() {
    Logger::getInstance().info("AppController::start: start (Windows)");
    
    auto start = [&](saucer::application* app) -> coco::stray {
        Logger::getInstance().info("AppController::init: create window");
        _app = app;
        
        _mainWindow = make_shared<WindowWrapper>(_app, false);
        _assistantWindow = make_shared<WindowWrapper>(_app, true);
        _mainWindow->show();

        // Keep the app running until it finishes
        co_await _app->finish();
    };

    Shortcut::getInstance().registerHandler([&]() {
        if (!_assistantWindow->isVisible()) {
            // TODO: Get the focused window process ID on Windows
            _focusedAppPId = 0;
            _copyContent();

            bool hasString = Clipboard::getInstance().hasString();
            bool hasImage = Clipboard::getInstance().hasImage();
            if (!hasString && !hasImage) {
                Logger::getInstance().warn("Unsupported content");
                return;
            }

            _assistantWindow->show();
        } else {
            _assistantWindow->move();
        }
    });

    auto app = saucer::application::create({.id = "com.byoa.assistant"});
    MenubarController::getInstance().init();
    
    int status = app->run(start);
    return status;
}

int AppController::stop() {
    Logger::getInstance().info("AppController::stop: start");
    _app->quit();
    return 0;
}

std::shared_ptr<WindowWrapper> AppController::getMainWindow() {
    return _mainWindow;
}

std::shared_ptr<WindowWrapper> AppController::getAssistantWindow() {
    return _assistantWindow;
}

void AppController::_copyContent() {
    Logger::getInstance().info("AppController::copyContent: start: pid: {}", _focusedAppPId);
    
    if(_focusedAppPId < 1) {
        return;
    }

    // TODO: Implement Ctrl+C simulation on Windows
    Logger::getInstance().warn("Copy content not yet implemented on Windows");
}

void AppController::_pasteContent(const std::string& type, const std::string& data) {
    Logger::getInstance().info("AppController::pasteContent: start: pid: {}", _focusedAppPId);

    if(_focusedAppPId < 1) {
        return;
    }

    if ((type != "text" && type != "image") || data.empty()) {
        return;
    }

    // TODO: Implement Ctrl+V simulation on Windows
    Logger::getInstance().warn("Paste content not yet implemented on Windows");
    
    _focusedAppPId = 0;
}
