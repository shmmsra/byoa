#pragma once

#ifdef __APPLE__
#import <Cocoa/Cocoa.h>
@interface CustomWindowDelegate: NSWindowController <NSWindowDelegate> {
}
@end
@interface CustomNSWindow : NSWindow
@end
#else
#include <Windows.h>
#endif

#include <memory>
#include <string>
#include <saucer/window.hpp>

class WindowController {
public:
	// Singleton access method
	static WindowController& getInstance();

	// Delete copy constructor and assignment operator
	WindowController(const WindowController&) = delete;
	WindowController& operator=(const WindowController&) = delete;

    void* createWindow();

private:
    WindowController() = default;
    ~WindowController() = default;

    __block bool isWindowVisible;

#ifdef __APPLE__
    CustomWindowDelegate *windowDelegate;
    CustomNSWindow *window;
#endif

#ifdef __APPLE__
    void removeTrafficLights();
#endif
};
