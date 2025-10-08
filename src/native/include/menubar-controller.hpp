#pragma once

#include <memory>
#include <string>

#ifdef __APPLE__
#import <Cocoa/Cocoa.h>
#endif

#ifdef _WIN32
#include <windows.h>
#include <shellapi.h>
#endif

class MenubarController {
  public:
    // Singleton access method
    static MenubarController &getInstance();

    // Delete copy constructor and assignment operator
    MenubarController(const MenubarController &)            = delete;
    MenubarController &operator=(const MenubarController &) = delete;

    void init();
    void cleanup();
    void showSettings();

#ifdef _WIN32
    bool onTrigger(UINT uMsg, WPARAM wParam, LPARAM lParam);
#else
    bool onTrigger();
#endif // _WIN32

  private:
    MenubarController()  = default;
    ~MenubarController() = default;

#ifdef __APPLE__
    NSStatusItem *_statusItem;
    NSMenu *_menu;
    NSWindow *_settingsWindow;

    void createMenubarIcon();
    void createMenu();
#endif

#ifdef _WIN32
    NOTIFYICONDATAW _notifyIconData;
    HMENU _menu;
    bool _iconAdded;

    void createTrayIcon();
    void createMenu();
    void showContextMenu();
    HICON createFallbackIcon();
#endif
};
