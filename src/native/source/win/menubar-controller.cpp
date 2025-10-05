#include <windows.h>
#include "menubar-controller.hpp"
#include "logger.hpp"

MenubarController& MenubarController::getInstance() {
    static MenubarController instance;
    return instance;
}

void MenubarController::init() {
    Logger::getInstance().info("MenubarController::init: start (Windows stub)");
    // TODO: Implement Windows system tray icon
}
