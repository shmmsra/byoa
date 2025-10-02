#pragma once

#include <string>
#include <memory>

#ifdef __APPLE__
#import <Cocoa/Cocoa.h>
#endif

class MenubarController {
public:
    // Singleton access method
    static MenubarController& getInstance();

    // Delete copy constructor and assignment operator
    MenubarController(const MenubarController&) = delete;
    MenubarController& operator=(const MenubarController&) = delete;

    void init();
    void cleanup();
    void showSettings();

private:
    MenubarController() = default;
    ~MenubarController() = default;

#ifdef __APPLE__
    NSStatusItem* _statusItem;
    NSMenu* _menu;
    NSWindow* _settingsWindow;
    
    void createMenubarIcon();
    void createMenu();
    void hideSettings();
#endif
};
