#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <ApplicationServices/ApplicationServices.h>

#include <saucer/modules/stable/webkit.hpp>

#include "main-window.hpp"
#include "app-controller.hpp"
#include "logger.hpp"

using namespace std;

MainWindow& MainWindow::getInstance() {
    static MainWindow instance;
    return instance;
}

void MainWindow::create(saucer::application* app) {
    // Create and configure the window
    _window = saucer::window::create(app).value();
    
    _window->set_title("Build Your Own Assistant");
#ifdef DEBUG
    _window->set_size({1500, 900});
#else
    _window->set_size({750, 450});
#endif  // DEBUG
    auto windowNative = _window->native();

    _webview = std::make_shared<WebviewWrapper>(_window);
    _webview->init(AppController::getInstance().getViewURL());

    // Handle window close event - hide window instead of closing app
    _window->on<saucer::window::event::close>([&](){
        hide();
        return saucer::policy::block; 
    });
}

void MainWindow::destroy() {
    _window = nullptr;
}

bool MainWindow::isVisible() {
    return _isWindowVisible;
}

void MainWindow::show() {
    [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyRegular];

    // Get the native NSWindow to control its display behavior
    auto windowNative = _window->native();
    NSWindow *nsWindow = windowNative.window;
    
    _window->show();
    _isWindowVisible = true;

    [[NSApp self] activateIgnoringOtherApps:true];
}

void MainWindow::hide() {
    _window->hide();
    _isWindowVisible = false;
    [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory];
}
