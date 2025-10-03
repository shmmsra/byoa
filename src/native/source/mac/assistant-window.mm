#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <ApplicationServices/ApplicationServices.h>

#include <saucer/modules/stable/webkit.hpp>

#include "assistant-window.hpp"
#include "app-controller.hpp"
#include "logger.hpp"

using namespace std;

AssistantWindow& AssistantWindow::getInstance() {
    static AssistantWindow instance;
    return instance;
}

void AssistantWindow::create(saucer::application* app) {
    // Create and configure the window
    _window = saucer::window::create(app).value();
    _window->set_title("AI Assistant");
#ifdef DEBUG
    _window->set_size({1500, 900});
#else
    _window->set_size({750, 450});
#endif  // DEBUG
    _window->set_decorations(saucer::window::decoration::partial);
    saucer::color bgColor = {255, 255, 255, 100};
    _window->set_background(bgColor);
    auto windowNative = _window->native();

    _webview = std::make_shared<WebviewWrapper>(_window);
    _webview->init(AppController::getInstance().getViewURL());

    _window->on<saucer::window::event::focus>([&](bool status) {
        if (status) {
            _isWindowVisible = true;
            Logger::getInstance().info("AssistantWindow::create: onFocusChange: true");
            
            // Call native callback if registered
            _webview->triggerEvent("on-focus-change", "true");
        } else {
            if (!_isWindowVisible) {
                return;
            }
            hide();
            _isWindowVisible = false;
            Logger::getInstance().info("AssistantWindow::create: onFocusChange: false");
            
            // Call native callback if registered
            _webview->triggerEvent("on-focus-change", "false");
            // Note: Don't hide here as this might fire too aggressively
        }
    });
    
    // Set up native escape key handling and focus monitoring
    NSWindow *nsWindow = windowNative.window;
    // Add global key event monitoring for escape key when window is active
    [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskKeyDown handler:^NSEvent *(NSEvent *event) {
        if (event.window == nsWindow && event.keyCode == 53 && _isWindowVisible) { // Escape key code is 53
            Logger::getInstance().info("AppController::start: Native escape key pressed, hiding window");
            hide();
            return nil; // Consume the event
        }
        return event;
    }];
}

void AssistantWindow::destroy() {
    _window = nullptr;
}

bool AssistantWindow::isVisible() {
    return _isWindowVisible;
}

void AssistantWindow::show() {
    Logger::getInstance().info("AssistantWindow::show: start");
    move();

    // Get the native NSWindow to control its display behavior
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    
    // Animate the fade-in effect
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
        // Set the duration of the fade-in animation (in seconds)
        context.duration = 0.5; // Adjust this value for slower or faster fade-in

        // Set the timing function for a smooth transition
        context.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseIn];

        Logger::getInstance().info("AssistantWindow::show: animation start");
    } completionHandler:^{
        
        // Show window without bringing app to focus
        [nsWindow orderFront:nil];  // Use orderFront instead of makeKeyAndOrderFront
        [nsWindow makeKeyWindow];  // Make it key to receive events but don't activate app
        
        Logger::getInstance().info("AssistantWindow::show: animation complete");
    }];

    [[NSApp self] activateIgnoringOtherApps:true];
    _isWindowVisible = true;
}

void AssistantWindow::hide() {
    if (!_isWindowVisible) {
        return;
    }

    Logger::getInstance().info("AssistantWindow::hide: start");
    [[NSApplication sharedApplication] hide:nil];
    _isWindowVisible = false;
    
    _window->hide();
}

void AssistantWindow::move() {
    Logger::getInstance().info("AssistantWindow::move: start");

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

void AssistantWindow::resize(const int& width, const int& height, const bool& animate/* = false*/) {
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
