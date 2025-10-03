#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <ApplicationServices/ApplicationServices.h>
#import <WebKit/WebKit.h>

#include <saucer/window.hpp>
#include <saucer/modules/stable/webkit.hpp>

#include "logger.hpp"
#include "app-controller.hpp"
#include "window-controller.hpp"
#include "shortcut.hpp"
#include "clipboard.hpp"
#include "menubar-controller.hpp"

using namespace std;

bool RequestAccessibilityPermissions() {
    Logger::getInstance().info("AppController::RequestAccessibilityPermissions: start");

    @autoreleasepool {
        NSDictionary *options = @{(id)kAXTrustedCheckOptionPrompt: @YES};
        BOOL accessibilityEnabled = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);

        if (!accessibilityEnabled) {
            Logger::getInstance().info("AppController::RequestAccessibilityPermissions: accessibilityEnabled: false");
        } else {
            Logger::getInstance().info("AppController::RequestAccessibilityPermissions: accessibilityEnabled: true");
        }
    }
    return true;
}

bool ActivateAppWithPID(pid_t pid) {
    NSRunningApplication *app = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
    [app activateWithOptions:(NSApplicationActivateIgnoringOtherApps | NSApplicationActivateAllWindows)];

    // Wait until the app is activated
    NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
    int counter = 10000;
    while ([workspace frontmostApplication].processIdentifier != pid) {
        if (counter-- < 1) {
            return false;
        }

        // Small delay to prevent busy-waiting
        [NSThread sleepForTimeInterval:0.1];
    }

    return true;
}

bool PerformCmdShortcut(pid_t pid, CGKeyCode keyCode) {
    bool accessibility = AXIsProcessTrusted();

    if (!accessibility) {
        Logger::getInstance().warn("AppController::PerformCmdShortcut: failed. accessibility: {}", accessibility);
        return false;
    }

    // Step 1: Activate the application
    ActivateAppWithPID(pid);

    @autoreleasepool {
        // Simulate Cmd + keyCode in the currently focused app
        CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);

        // Cmd down
        CGEventRef commandDown = CGEventCreateKeyboardEvent(source, (CGKeyCode)55, true);
        CGEventSetFlags(commandDown, kCGEventFlagMaskCommand);
        CGEventPostToPid(pid, commandDown);
        CFRelease(commandDown);

        // keyCode key down
        CGEventRef keyCodeDown = CGEventCreateKeyboardEvent(source, keyCode, true);
        CGEventSetFlags(keyCodeDown, kCGEventFlagMaskCommand);
        CGEventPostToPid(pid, keyCodeDown);
        CFRelease(keyCodeDown);

        // keyCode key up
        CGEventRef keyCodeUp = CGEventCreateKeyboardEvent(source, keyCode, false);
        CGEventPostToPid(pid, keyCodeUp);
        CFRelease(keyCodeUp);

        // Cmd up
        CGEventRef commandUp = CGEventCreateKeyboardEvent(source, (CGKeyCode)55, false);
        CGEventPostToPid(pid, commandUp);
        CFRelease(commandUp);

        // Release the event source
        CFRelease(source);
    }

    // Wait for a short duration to ensure that
    // the shortcut has been handled by the targetted App
    [NSThread sleepForTimeInterval:0.4];

    return true;
}

bool ShowToastWithMessage(const std::string& message) {
    NSRect screenFrame = [[NSScreen mainScreen] visibleFrame];

    // Calculate the vertical center for the text field
    unsigned int HorizontalPadding = 32;
    unsigned int VerticalPadding = 32;
    NSRect textFieldFrame = NSMakeRect(HorizontalPadding, VerticalPadding, 50, 50);

    NSTextField *textField = [[NSTextField alloc] initWithFrame:textFieldFrame];
    textField.stringValue = [NSString stringWithUTF8String: message.c_str()];
    textField.textColor = [NSColor whiteColor];
    textField.font = [NSFont boldSystemFontOfSize:16.0];
    textField.alignment = NSTextAlignmentCenter;
    textField.bezeled = NO;
    textField.drawsBackground = NO;
    textField.editable = NO;
    textField.selectable = NO;

    CGRect frame = textField.frame;
    [textField sizeToFit];
    frame.size.width = textField.fittingSize.width;
    textField.frame = frame;

    NSRect toastFrame = NSMakeRect(
        NSMidX(screenFrame) - 100,
        250,
        frame.size.width + (2 * HorizontalPadding),
        frame.size.height + (2 * VerticalPadding)
    );
    NSWindow *toastWindow = [[NSWindow alloc] initWithContentRect:toastFrame
                                                        styleMask:NSWindowStyleMaskBorderless
                                                          backing:NSBackingStoreBuffered
                                                            defer:NO];

    toastWindow.backgroundColor = [NSColor clearColor]; // Transparent background
    toastWindow.opaque = NO;
    toastWindow.level = NSStatusWindowLevel;
    toastWindow.hasShadow = YES;

    // Make the content view layer-backed
    toastWindow.contentView.wantsLayer = YES;
    toastWindow.contentView.layer.backgroundColor = [[NSColor colorWithWhite:0.2 alpha:0.9] CGColor];
    toastWindow.contentView.layer.cornerRadius = 20.0;
    toastWindow.contentView.layer.masksToBounds = YES;

    [toastWindow.contentView addSubview:textField];
    [toastWindow makeKeyAndOrderFront:nil];

    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
        context.duration = 0.5;
        toastWindow.animator.alphaValue = 1.0;
    } completionHandler:^{
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
                context.duration = 0.5;
                toastWindow.animator.alphaValue = 0.0;
            } completionHandler:^{
                [toastWindow orderOut:nil];
            }];
        });
    }];
}

AppController& AppController::getInstance() {
    static AppController instance;
    return instance;
}

void AppController::init() {
    Logger::getInstance().info("AppController::init: start");
//    RequestAccessibilityPermissions();
}

int AppController::start() {
    Logger::getInstance().info("AppController::start: start");
    auto start = [&](saucer::application* app) -> coco::stray {
        Logger::getInstance().info("AppController::init: create window");
        
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
        _webview->init(_getViewURL());

        _window->on<saucer::window::event::focus>([&](bool status) {
            if (status) {
                _isWindowVisible = true;
                Logger::getInstance().info("AppController::start: onFocusChange: true");
                
                // Call native callback if registered
                _webview->triggerEvent("on-focus-change", "true");
            } else {
                if (!_isWindowVisible) {
                    return;
                }
                hideWindow();
                _isWindowVisible = false;
                Logger::getInstance().info("AppController::start: onFocusChange: false");
                
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
                hideWindow();
                return nil; // Consume the event
            }
            return event;
        }];
        
        // NOTE: It is critical that the activation policy is set after
        // window creation otherwise it doesn't work
        [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory];

        // Keep the app running until it finishes
        co_await app->finish();

        _window = nullptr;
    };

    Shortcut::getInstance().registerHandler([&]() {
        if (!_isWindowVisible) {
            // Get the frontmost application PID
            NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
            NSRunningApplication *focusedApp = [workspace frontmostApplication];
            _focusedAppPId = focusedApp.processIdentifier;
            _copyContent();

            bool hasString = Clipboard::getInstance().hasString();
            bool hasImage = Clipboard::getInstance().hasImage();
            if (!hasString && !hasImage) {
                // Show a native Toast message
                ShowToastWithMessage("Unsupported\ncontent");
                return;
            }

            showWindow();
        } else {
            moveWindow();
        }
    });

    auto app = saucer::application::create({.id = "com.byoa.assistant"});
    MenubarController::getInstance().init();

    int status = app->run(start);
    return status;
}

void AppController::showWindow() {
    Logger::getInstance().info("AppController::showWindow: start");
    moveWindow();

    // Get the native NSWindow to control its display behavior
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    
    // Animate the fade-in effect
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
        // Set the duration of the fade-in animation (in seconds)
        context.duration = 0.5; // Adjust this value for slower or faster fade-in

        // Set the timing function for a smooth transition
        context.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseIn];

        Logger::getInstance().info("AppController::showWindow: animation start");
    } completionHandler:^{
        
        // Show window without bringing app to focus
        [nsWindow orderFront:nil];  // Use orderFront instead of makeKeyAndOrderFront
        [nsWindow makeKeyWindow];  // Make it key to receive events but don't activate app
        
        Logger::getInstance().info("AppController::showWindow: animation complete");
    }];

    [[NSApp self] activateIgnoringOtherApps:true];
    _isWindowVisible = true;
}

void AppController::hideWindow() {
    if (!_isWindowVisible) {
        return;
    }
    
    Logger::getInstance().info("AppController::hideWindow: start");
    [[NSApplication sharedApplication] hide:nil];
    _isWindowVisible = false;
    
    _window->hide();
}

void AppController::moveWindow() {
    Logger::getInstance().info("AppController::moveWindow: start");

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

void AppController::resizeWindow(const int& width, const int& height, const bool& animate/* = false*/) {
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

std::string AppController::_getViewURL() {
    @autoreleasepool {
#ifdef DEBUG
        // Debug mode: Try webpack dev server first for hot reloading
        std::string devServerUrl = "http://localhost:3000";
        Logger::getInstance().info("AppController::_getViewURL: Debug mode - trying dev server: {}", devServerUrl);

        return devServerUrl;
#else
        // Release mode: Load from bundled Resources folder
        NSBundle *bundle = [NSBundle mainBundle];
        NSString *resourcesPath = [bundle resourcePath];
        NSString *indexPath = [resourcesPath stringByAppendingPathComponent:@"index.html"];
        
        if ([[NSFileManager defaultManager] fileExistsAtPath:indexPath]) {
            std::string indexUrl = "file://" + std::string([indexPath UTF8String]);
            Logger::getInstance().info("AppController::_getViewURL: Found HTML in Resources: {}", indexUrl);
            return indexUrl;
        }
#endif
        return "";
    }
}

void AppController::_copyContent() {
    Logger::getInstance().info("AppController::copyContent: start: pid: {}", _focusedAppPId);

    if(_focusedAppPId < 1) {
        return;
    }

    // Perform Cmd + C (copy) in the currently focused app
    PerformCmdShortcut(_focusedAppPId, 8);
}

void AppController::_pasteContent(const std::string& type, const std::string& data) {
    Logger::getInstance().info("AppController::pasteContent: start: pid: {}", _focusedAppPId);

    // Show a native Toast message
    ShowToastWithMessage("Copied to\nClipboard");

    if(_focusedAppPId < 1) {
        return;
    }

    if ((type != "text" && type != "image") || data.empty()) {
        return;
    }

    // Perform Cmd + V (paste) in the currently focused app
    PerformCmdShortcut(_focusedAppPId, 9);

    _focusedAppPId = 0;
}
