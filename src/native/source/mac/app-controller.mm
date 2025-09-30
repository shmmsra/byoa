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

#define SUB_MODULE_NAME UniConst("AppController")

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
    [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory];
//    RequestAccessibilityPermissions();
}

int AppController::start() {
    Logger::getInstance().info("AppController::start: start");
    auto start = [&](saucer::application* app) -> coco::stray {
        Logger::getInstance().info("AppController::init: create window");
        
        // Create and configure the window
        _window = saucer::window::create(app).value();
        _window->set_title("AI Assistant");
        _window->set_size({750, 450});
        _window->set_decorations(saucer::window::decoration::partial);
        saucer::color bgColor = {255, 255, 255, 100};
        _window->set_background(bgColor);
        auto windowNative = _window->native();
        
         // Create smartview
         auto webview = saucer::smartview<>::create({
             .window = _window
         });
         
         // Set the webview background (this is what you'll actually see)
         webview->set_background({0, 0, 0, 100});

#ifdef DEBUG
         // Enable developer tools for debugging
         webview->set_dev_tools(true);
#endif  // DEBUG
         
         // Get the appropriate URL to load
         std::string viewURL = _getViewURL();
         if (!viewURL.empty()) {
             // Load local HTML content
             webview->set_url(viewURL);
             Logger::getInstance().info("AppController::start: Loading local HTML: {}", viewURL);
         } else {
             Logger::getInstance().info("AppController::start: Loading fallback error page");
             app->quit();
         }

        _window->on<saucer::window::event::focus>([&](bool status) {
            if (status) {
                NSWindow *nsWindow = windowNative.window;
//                nsWindow.collectionBehavior = NSWindowCollectionBehaviorFullScreenNone;
                nsWindow.level = kCGFloatingWindowLevel;
//                nsWindow.movableByWindowBackground = YES;
//                nsWindow.hidesOnDeactivate = NO; // Seems optional
                nsWindow.styleMask = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable |
                NSWindowStyleMaskResizable | NSWindowStyleMaskFullSizeContentView | NSWindowStyleMaskNonactivatingPanel | NSNonactivatingPanelMask;
//                nsWindow.backingType = NSBackingStoreBuffered;

                _isWindowVisible = true;
                Logger::getInstance().info("AppController::start: onFocusChange: true");
            } else {
                _isWindowVisible = false;
                Logger::getInstance().info("AppController::start: onFocusChange: false");
            }
        });
        
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
    int status = app->run(start);
    return status;
}

void AppController::showWindow() {
    Logger::getInstance().info("AppController::showWindow: start");
    moveWindow();

    // Get the native NSWindow to control its display behavior
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    
    // Configure window to appear without activating the app
    nsWindow.level = NSFloatingWindowLevel;  // Appear above other windows
    nsWindow.hidesOnDeactivate = NO;         // Don't hide when app loses focus
    
    // Animate the fade-in effect
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
        // Set the duration of the fade-in animation (in seconds)
        context.duration = 0.5; // Adjust this value for slower or faster fade-in

        // Set the timing function for a smooth transition
        context.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseIn];

        Logger::getInstance().info("AppController::showWindow: animation start");
    } completionHandler:^{
        _isWindowVisible = true;
        
        // Show window without bringing app to focus
        [nsWindow orderFront:nil];  // Use orderFront instead of makeKeyAndOrderFront
        
        Logger::getInstance().info("AppController::showWindow: animation complete");
    }];

    // Note: Commented out to prevent app activation
    // [[NSApp self] activateIgnoringOtherApps:true];
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

    // Define the new top-left point
    NSPoint newTopLeftPoint = [NSEvent mouseLocation]; // Your desired top-left point

    // Get the current frame of the window
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    NSRect currentFrame = [nsWindow frame];

    // Calculate the new frame based on the top-left point
    NSRect newFrame = NSMakeRect(
        newTopLeftPoint.x,
        newTopLeftPoint.y - currentFrame.size.height,
        currentFrame.size.width,
        currentFrame.size.height
    );

    // Iterate through all screens to find a valid screen for the new frame
    NSScreen *validScreen = nil;
    for (NSScreen *screen in [NSScreen screens]) {
        NSRect screenFrame = [screen visibleFrame];

        // Check if the new frame fits within this screen
        if (NSContainsRect(screenFrame, newFrame)) {
            validScreen = screen;
            break;
        }
    }

    // If no valid screen is found, default to the main screen
    if (!validScreen) {
        validScreen = [NSScreen mainScreen];
    }

    NSRect screenFrame = [validScreen visibleFrame];

    // Adjust the new top-left point to ensure it doesn't overflow the screen
    if (NSMaxX(newFrame) > NSMaxX(screenFrame)) {
        newTopLeftPoint.x = NSMaxX(screenFrame) - currentFrame.size.width;
    }

    if (NSMinY(newFrame) < NSMinY(screenFrame)) {
        newTopLeftPoint.y = NSMinY(screenFrame) + currentFrame.size.height;
    }

    // Ensure the left edge doesn't overflow the screen
    if (newTopLeftPoint.x < NSMinX(screenFrame)) {
        newTopLeftPoint.x = NSMinX(screenFrame);
    }

    // Ensure the top edge doesn't overflow the screen
    if (newTopLeftPoint.y > NSMaxY(screenFrame)) {
        newTopLeftPoint.y = NSMaxY(screenFrame);
    }

    // Set the new top-left point to the window
    [nsWindow setFrameTopLeftPoint:newTopLeftPoint];

    _window->set_position({(int)newTopLeftPoint.x, (int)newTopLeftPoint.y});
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
