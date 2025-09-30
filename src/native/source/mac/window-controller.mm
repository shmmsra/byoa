#import <Cocoa/Cocoa.h>
#include <cstdlib>

#include "window-controller.hpp"
#include "logger.hpp"

@implementation CustomWindowDelegate

#pragma mark -
#pragma mark NSWindowDelegate Methods

- (BOOL)canBecomeKeyWindow {
    return YES;
}

- (void)windowDidResize:(NSNotification *)notification {
#pragma unused(notification)
}

- (void)windowDidBecomeKey:(NSNotification *)notification {
#pragma unused(notification)
    Logger::getInstance().info("WindowController::windowDidBecomeKey: start");
}

- (void)windowDidResignKey:(NSNotification *)notification {
#pragma unused(notification)
    Logger::getInstance().info("WindowController::windowDidResignKey: start");
}

- (void)windowDidBecomeMain:(NSNotification *)notification {
#pragma unused(notification)
    Logger::getInstance().info("WindowController::windowDidBecomeMain: start");
}

- (void)windowDidResignMain:(NSNotification *)notification {
#pragma unused(notification)
    Logger::getInstance().info("WindowController::windowDidResignMain: start");
}

- (void)windowDidMove:(NSNotification *)notification {
#pragma unused(notification)
}

@end

@implementation CustomNSWindow

// Required to have the resize indicator cursor icons on a frame less window
- (BOOL)canBecomeKeyWindow {
    return YES;
}

- (void)keyDown:(NSEvent *)event {
#pragma unused(event)
    // The following line triggers system beep error, there's no beep without it
    // [super keyDown:theEvent];
}

@end

using namespace std;

WindowController& WindowController::getInstance() {
    static WindowController instance;
    return instance;
}

void* WindowController::createWindow() {
    Logger::getInstance().info("WindowController::createWindow: start");

    NSPoint mouseLocation = [NSEvent mouseLocation];
    NSRect windowRect = NSMakeRect(
        mouseLocation.x,
        mouseLocation.y,
        750,
        450
    );

    window = [
        [CustomNSWindow alloc]
        initWithContentRect:windowRect
        styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable
            | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable
            | NSWindowStyleMaskFullSizeContentView
            | NSWindowStyleMaskNonactivatingPanel
            | NSNonactivatingPanelMask
        backing:NSBackingStoreBuffered
        defer:NO
        screen:[NSScreen mainScreen]
    ];
    [window setAcceptsMouseMovedEvents:YES];
//    [window setOpaque:YES];
    window.minSize = NSMakeSize(300, 200);
    window.titlebarAppearsTransparent = YES;
    window.hasShadow = YES;
    window.collectionBehavior = NSWindowCollectionBehaviorFullScreenNone;
//    window.level = kCGFloatingWindowLevel;
    window.movableByWindowBackground = YES;
//    window.hidesOnDeactivate = YES; // Seems optional

//    windowDelegate = [[CustomWindowDelegate alloc] initWithWindow:window];
    [window setDelegate:(CustomWindowDelegate *)windowDelegate];
    [window setWindowController:(NSWindowController *)windowDelegate];

    removeTrafficLights();
    isWindowVisible = false;

    return window;
}

void WindowController::removeTrafficLights() {
    NSButton* closeButton = [window standardWindowButton:NSWindowCloseButton];
    NSButton* miniaturizeButton = [window standardWindowButton:NSWindowMiniaturizeButton];
    NSButton* zoomButton = [window standardWindowButton:NSWindowZoomButton];

    [closeButton removeFromSuperview];
    [miniaturizeButton removeFromSuperview];
    [zoomButton removeFromSuperview];
}
