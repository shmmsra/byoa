#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <ApplicationServices/ApplicationServices.h>

#include <saucer/modules/stable/webkit.hpp>

#include "window-wrapper.hpp"
#include "webview-wrapper.hpp"
#include "app-controller.hpp"
#include "logger.hpp"

#ifndef DEBUG
#define MAIN_WINDOW_WIDTH 1500
#define MAIN_WINDOW_HEIGHT 900
#define ASSISTANT_WINDOW_WIDTH 1000
#define ASSISTANT_WINDOW_HEIGHT 600
#else
#define MAIN_WINDOW_WIDTH 1000
#define MAIN_WINDOW_HEIGHT 600
#define ASSISTANT_WINDOW_WIDTH 750
#define ASSISTANT_WINDOW_HEIGHT 450
#endif  // DEBUG

using namespace std;

WindowWrapper::WindowWrapper(saucer::application* app, WINDOW_TYPE windowType): _windowType(windowType) {
    // Create and configure the window
    _window = saucer::window::create(app).value();
    _window->set_title("Build Your Own Assistant");

    if (_windowType == WINDOW_TYPE::POPUP) {
        _window->set_size({ASSISTANT_WINDOW_WIDTH, ASSISTANT_WINDOW_HEIGHT});
    } else {
        _window->set_size({MAIN_WINDOW_WIDTH, MAIN_WINDOW_HEIGHT});
    }
    
    // Handle window close event - hide window instead of closing app
    _window->on<saucer::window::event::close>([&](){
        hide();
        return saucer::policy::block;
    });

    _webview = std::make_shared<WebviewWrapper>(_window);
    _webview->init(_getViewURL(_windowType == WINDOW_TYPE::POPUP ? "assistant" : ""));

    if (_windowType == WINDOW_TYPE::POPUP) {
        _window->set_decorations(saucer::window::decoration::partial);
        saucer::color bgColor = {255, 255, 255, 100};
        _window->set_background(bgColor);

        _window->on<saucer::window::event::focus>([&](bool status) {
            if (status) {
                _isWindowVisible = true;            
                // Call native callback if registered
                sendEventToWebview("on-focus-change", "true");
            } else {
                if (!_isWindowVisible) {
                    return;
                }
                hide();
                _isWindowVisible = false;
                // Call native callback if registered
                sendEventToWebview("on-focus-change", "false");
                // Note: Don't hide here as this might fire too aggressively
            }
        });

        // Set up native escape key handling and focus monitoring
        auto windowNative = _window->native();
        NSWindow *nsWindow = windowNative.window;
        // Add global key event monitoring for escape key when window is active
        [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskKeyDown handler:^NSEvent *(NSEvent *event) {
            if (event.window == nsWindow && event.keyCode == 53 && _isWindowVisible && _windowType == WINDOW_TYPE::POPUP) { // Escape key code is 53
                Logger::getInstance().info("WindowWrapper::WindowWrapper: Native escape key pressed, hiding window");
                hide();
                return nil; // Consume the event
            }
            return event;
        }];
    }
}

WindowWrapper::~WindowWrapper() {
    _window = nullptr;
}

bool WindowWrapper::isVisible() {
    return _isWindowVisible;
}

void WindowWrapper::show() {
    Logger::getInstance().info("WindowWrapper::show: start");
    if (_windowType == WINDOW_TYPE::POPUP) {
        move();
    } else {
        // If not the AssistantPopup then activate the application
        [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyRegular];
    }

    _window->show();
    [[NSApp self] activateIgnoringOtherApps:true];
    _isWindowVisible = true;
}

void WindowWrapper::hide() {
    if (!_isWindowVisible) {
        return;
    }
    
    Logger::getInstance().info("WindowWrapper::hide: start");
    _isWindowVisible = false;
    _window->hide();

    // If the main window is not visible, hide the application to bring the next App into focus
    if (!AppController::getInstance().getMainWindow()->isVisible()) {
        [[NSApplication sharedApplication] hide:nil];
    }

    if (_windowType != WINDOW_TYPE::POPUP) {
        // If not the Assistant Popup then deactivate the application
        [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory];
    }
}

void WindowWrapper::move() {
    Logger::getInstance().info("WindowWrapper::move: start");

    // Get the mouse location in global screen coordinates
    NSPoint mouseLocation = [NSEvent mouseLocation];
    
    // Get the current frame of the window
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    NSRect currentFrame = [nsWindow frame];

    // Find the screen containing the mouse cursor
    NSScreen *targetScreen = nil;
    for (NSScreen *screen in [NSScreen screens]) {
        NSRect screenFrame = [screen frame]; // Use frame (not visibleFrame) for mouse detection
        if (NSPointInRect(mouseLocation, screenFrame)) {
            targetScreen = screen;
            break;
        }
    }
    
    // If no screen contains the mouse, use the main screen
    if (!targetScreen) {
        targetScreen = [NSScreen mainScreen];
    }
    
    NSRect screenVisibleFrame = [targetScreen visibleFrame];
    
    // Calculate the desired top-left point for the window
    // Position the window so the mouse cursor is near the top-left area
    NSPoint newTopLeftPoint = NSMakePoint(
        mouseLocation.x,
        mouseLocation.y  // mouseLocation.y is already in the correct coordinate system
    );
    
    // Adjust coordinates to keep the window fully on screen
    // Ensure the window doesn't go off the right edge
    if (newTopLeftPoint.x + currentFrame.size.width > NSMaxX(screenVisibleFrame)) {
        newTopLeftPoint.x = NSMaxX(screenVisibleFrame) - currentFrame.size.width;
    }
    
    // Ensure the window doesn't go off the left edge
    if (newTopLeftPoint.x < NSMinX(screenVisibleFrame)) {
        newTopLeftPoint.x = NSMinX(screenVisibleFrame);
    }
    
    // Ensure the window doesn't go off the bottom edge
    if (newTopLeftPoint.y - currentFrame.size.height < NSMinY(screenVisibleFrame)) {
        newTopLeftPoint.y = NSMinY(screenVisibleFrame) + currentFrame.size.height;
    }
    
    // Ensure the window doesn't go off the top edge
    if (newTopLeftPoint.y > NSMaxY(screenVisibleFrame)) {
        newTopLeftPoint.y = NSMaxY(screenVisibleFrame);
    }
    
    // Set the new top-left point to the window
    [nsWindow setFrameTopLeftPoint:newTopLeftPoint];
    
    // Update the saucer window position as well
    // Note: setFrameTopLeftPoint uses top-left coordinates, but set_position might expect bottom-left
    // Calculate the bottom-left point for set_position
    NSPoint bottomLeftPoint = NSMakePoint(
        newTopLeftPoint.x,
        newTopLeftPoint.y - currentFrame.size.height
    );
    _window->set_position({(int)bottomLeftPoint.x, (int)bottomLeftPoint.y});
}

void WindowWrapper::resize(const int& width, const int& height, const bool& animate/* = false*/) {
    // Get the current frame of the window
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    NSRect currentFrame = [nsWindow frame];

    // Get the screen the window is currently on
    NSScreen *currentScreen = [nsWindow screen];
    NSRect screenFrame = [currentScreen visibleFrame];

    // Calculate the new origin
    NSRect newFrame = NSMakeRect(
        currentFrame.origin.x,
        currentFrame.origin.y - (height - currentFrame.size.height),
        width,
        height
    );

    // Adjust the new frame to ensure it doesn't overflow the screen
    if (NSMaxX(newFrame) > NSMaxX(screenFrame)) {
        newFrame.origin.x = NSMaxX(screenFrame) - newFrame.size.width;
    }

    if (NSMinY(newFrame) < NSMinY(screenFrame)) {
        newFrame.origin.y = NSMinY(screenFrame);
    }

    // Ensure the left edge doesn't overflow the screen
    if (NSMinX(newFrame) < NSMinX(screenFrame)) {
        newFrame.origin.x = NSMinX(screenFrame);
    }

    // Ensure the top edge doesn't overflow the screen
    if (NSMaxY(newFrame) > NSMaxY(screenFrame)) {
        newFrame.origin.y = NSMaxY(screenFrame) - newFrame.size.height;
    }

    [nsWindow setFrame:newFrame display:YES];
    _window->set_position({(int)newFrame.origin.x, (int)newFrame.origin.y});
}

void WindowWrapper::sendEventToWebview(const std::string& eventName, const std::string& data) {
    if (_webview) {
        _webview->triggerEvent(eventName, data);
    }
}

std::string WindowWrapper::_getViewURL(const string& workflow/* = ""*/) {
    @autoreleasepool {
#ifdef DEBUG
        // Debug mode: Try webpack dev server first for hot reloading
        std::string hostUrl = "http://localhost:3000";
        if (!workflow.empty()) {
            hostUrl.append("?workflow=").append(workflow);
        }
        Logger::getInstance().info("WindowWrapper::_getViewURL: Debug mode - trying dev server: {}", hostUrl);

        return hostUrl;
#else
        // Release mode: Load from bundled Resources folder
        NSBundle *bundle = [NSBundle mainBundle];
        NSString *resourcesPath = [bundle resourcePath];
        NSString *indexPath = [resourcesPath stringByAppendingPathComponent:@"index.html"];
        
        if ([[NSFileManager defaultManager] fileExistsAtPath:indexPath]) {
            std::string hostUrl = "file://" + std::string([indexPath UTF8String]);
            if (!workflow.empty()) {
                hostUrl.append("?workflow=").append(workflow);
            }
            Logger::getInstance().info("WindowWrapper::_getViewURL: Found HTML in Resources: {}", hostUrl);
            return hostUrl;
        }
#endif
        return "";
    }
}
