#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <ApplicationServices/ApplicationServices.h>
#import <WebKit/WebKit.h>

#include <saucer/window.hpp>
#include <saucer/modules/stable/webkit.hpp>

#include "logger.hpp"
#include "app-controller.hpp"
#include "window-wrapper.hpp"
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
        [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory];
        
        _mainWindow = make_shared<WindowWrapper>(app, WindowWrapper::WINDOW_TYPE::MAIN);
        _assistantWindow = make_shared<WindowWrapper>(app, WindowWrapper::WINDOW_TYPE::POPUP);
        _mainWindow->show();

        // Keep the app running until it finishes
        co_await app->finish();
    };

    Shortcut::getInstance().registerHandler([&]() {
        if (!_assistantWindow->isVisible()) {
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
    [NSApp terminate:nil];
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
