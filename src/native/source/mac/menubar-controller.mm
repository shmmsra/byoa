#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>

#include "app-controller.hpp"
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
    AppController::getInstance().getMainWindow()->show();
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

// NOOP for Mac
bool MenubarController::onTrigger() {
    return false;
}
