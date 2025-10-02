#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>

#include "menubar-controller.hpp"
#include "logger.hpp"

#define SUB_MODULE_NAME "MenubarController"

// Forward declaration for Objective-C interface
@interface MenubarControllerObjC : NSObject
- (void)showSettings:(id)sender;
- (void)quitApp:(id)sender;
@end

MenubarController& MenubarController::getInstance() {
    static MenubarController instance;
    return instance;
}

void MenubarController::init() {
    Logger::getInstance().info("MenubarController::init: start");
    
    // Create status item outside of autorelease pool to ensure it survives
    _statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength: 24.0];
    
    if (!_statusItem) {
        Logger::getInstance().error("MenubarController::init: failed to create status item");
        return;
    }
    
    Logger::getInstance().info("MenubarController::init: status item created successfully");
    
    // Load icon from xcassets with proper resolution handling
    NSImage *icon = nil;
    
    // Try to load from xcassets using the proper method
    NSBundle* mainBundle = [NSBundle mainBundle];
    
    // First try: Load the specific image from the imageset
    icon = [mainBundle imageForResource:@"icon"];
    
    if (!icon) {
        // Second try: Load from the xcassets bundle directly
        NSString *xcassetsPath = [mainBundle pathForResource:@"MenuBar" ofType:@"xcassets"];
        if (xcassetsPath) {
            NSBundle *xcassetsBundle = [NSBundle bundleWithPath:xcassetsPath];
            icon = [xcassetsBundle imageForResource:@"icon"];
        }
    }
    
    if (!icon) {
        // Third try: Use imageNamed which should work with xcassets
        icon = [NSImage imageNamed:@"icon"];
    }
    
    if (!icon) {
        Logger::getInstance().info("MenubarController::init: creating fallback icon");
        // Create a simple icon as fallback
        icon = [[NSImage alloc] initWithSize:NSMakeSize(18, 18)];
        [icon lockFocus];
        
        // Draw a blue circle
        NSRect circleRect = NSMakeRect(1, 1, 16, 16);
        NSBezierPath* circle = [NSBezierPath bezierPathWithOvalInRect:circleRect];
        [[NSColor blueColor] setFill];
        [circle fill];
        
        [icon unlockFocus];
    } else {
        Logger::getInstance().info("MenubarController::init: loaded icon from xcassets successfully");
    }
    
    // Configure the icon for menubar display
    [icon setSize:NSMakeSize(18, 18)]; // Set explicit size for menubar
    [icon setTemplate:YES]; // Make it template so it adapts to dark/light mode
    
    // Set the icon
    _statusItem.button.image = icon;
    _statusItem.button.enabled = YES;
    
    Logger::getInstance().info("MenubarController::init: icon setup complete");
    
    // Create the menu
    createMenu();
}

void MenubarController::cleanup() {
    Logger::getInstance().info("MenubarController::cleanup: start");
    
    @autoreleasepool {
        if (_statusItem) {
            [[NSStatusBar systemStatusBar] removeStatusItem:_statusItem];
            _statusItem = nil;
        }
        
        if (_menu) {
            _menu = nil;
        }
        
        if (_settingsWindow) {
            [_settingsWindow close];
            _settingsWindow = nil;
        }
    }
}


void MenubarController::createMenu() {
    Logger::getInstance().info("MenubarController::createMenu: start");
    
    // Create the menu
    _menu = [[NSMenu alloc] init];
    
    // Create Objective-C delegate object
    MenubarControllerObjC* delegate = [[MenubarControllerObjC alloc] init];
    
    // Add Settings menu item
    NSMenuItem* settingsItem = [[NSMenuItem alloc] initWithTitle:@"Settings"
                                                          action:@selector(showSettings:)
                                                   keyEquivalent:@""];
    settingsItem.target = delegate;
    [_menu addItem:settingsItem];
    
    // Add separator
    [_menu addItem:[NSMenuItem separatorItem]];
    
    // Add Quit menu item
    NSMenuItem* quitItem = [[NSMenuItem alloc] initWithTitle:@"Quit"
                                                      action:@selector(quitApp:)
                                               keyEquivalent:@"q"];
    quitItem.target = delegate;
    [_menu addItem:quitItem];
    
    // Set the menu for the status item
    _statusItem.menu = _menu;
}

void MenubarController::showSettings() {
    Logger::getInstance().info("MenubarController::showSettings: start");
    
    @autoreleasepool {
        // Create settings window if it doesn't exist
        if (!_settingsWindow) {
            NSRect windowRect = NSMakeRect(0, 0, 400, 300);
            _settingsWindow = [[NSWindow alloc] initWithContentRect:windowRect
                                                           styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable
                                                             backing:NSBackingStoreBuffered
                                                               defer:NO];
            
            _settingsWindow.title = @"AI Assistant Settings";
            _settingsWindow.level = NSFloatingWindowLevel;
            _settingsWindow.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces;
            
            // Center the window on screen
            [_settingsWindow center];
            
            // Add a simple label to the settings window
            NSTextField* label = [[NSTextField alloc] initWithFrame:NSMakeRect(50, 150, 300, 30)];
            label.stringValue = @"Settings will be implemented here";
            label.alignment = NSTextAlignmentCenter;
            label.bezeled = NO;
            label.drawsBackground = NO;
            label.editable = NO;
            label.selectable = NO;
            label.font = [NSFont systemFontOfSize:16];
            
            [_settingsWindow.contentView addSubview:label];
        }
        
        // Show the settings window
        [_settingsWindow makeKeyAndOrderFront:nil];
        [NSApp activateIgnoringOtherApps:YES];
    }
}

void MenubarController::hideSettings() {
    Logger::getInstance().info("MenubarController::hideSettings: start");
    
    if (_settingsWindow) {
        [_settingsWindow orderOut:nil];
    }
}

// Objective-C method implementations
@implementation MenubarControllerObjC

- (void)showSettings:(id)sender {
    MenubarController::getInstance().showSettings();
}

- (void)quitApp:(id)sender {
    Logger::getInstance().info("MenubarController::quitApp: start");
    [NSApp terminate:nil];
}

@end
