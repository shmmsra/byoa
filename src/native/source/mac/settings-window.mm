#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <ApplicationServices/ApplicationServices.h>

#include <saucer/modules/stable/webkit.hpp>

#include "settings-window.hpp"
#include "app-controller.hpp"
#include "logger.hpp"

using namespace std;

SettingsWindow& SettingsWindow::getInstance() {
    static SettingsWindow instance;
    return instance;
}

void SettingsWindow::create(saucer::application* app) {
    // Create and configure the window
    _window = saucer::window::create(app).value();
    _window->set_title("AI Assistant Settings");
#ifdef DEBUG
    _window->set_size({1500, 900});
#else
    _window->set_size({750, 450});
#endif  // DEBUG
    auto windowNative = _window->native();

    _webview = std::make_shared<WebviewWrapper>(_window);
    _webview->init(AppController::getInstance().getViewURL("settings"));

    // Handle window close event - hide window instead of closing app
    _window->on<saucer::window::event::close>([&](){
        hide();
        return saucer::policy::block; 
    });
    
    hide();
}

void SettingsWindow::destroy() {
    _window = nullptr;
}

bool SettingsWindow::isVisible() {
    return _isWindowVisible;
}

void SettingsWindow::show() {
    [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyRegular];

    // Get the native NSWindow to control its display behavior
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    
    _window->show();

    // Show window without bringing app to focus
    [nsWindow orderFront:nil];  // Use orderFront instead of makeKeyAndOrderFront
    [nsWindow makeKeyWindow];  // Make it key to receive events but don't activate app
    _isWindowVisible = true;

    [[NSApp self] activateIgnoringOtherApps:true];
}

void SettingsWindow::hide() {
    _window->hide();
    [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory];
}
