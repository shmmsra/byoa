#include <saucer/window.hpp>
#include <windows.h>

#include "app-controller.hpp"
#include "clipboard.hpp"
#include "logger.hpp"
#include "menubar-controller.hpp"
#include "shortcut.hpp"
#include "window-wrapper.hpp"

using namespace std;

LRESULT CALLBACK HiddenWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    // Log all messages for debugging (can be removed later)
    if (uMsg >= WM_USER) {
        Logger::getInstance().info("HiddenWindowProc: Received message uMsg={:#x}, wParam={:#x}, lParam={:#x}", uMsg, wParam, lParam);
    }

    if (Shortcut::getInstance().onTrigger(uMsg, wParam, lParam)) {
        return 0;
    } else if (MenubarController::getInstance().onTrigger(uMsg, wParam, lParam)) {
        return 0;
    }

    return DefWindowProcW(hwnd, uMsg, wParam, lParam);
}

HWND CreateHiddenWindow() {
    // Window class name
    static const wchar_t *HIDDEN_WINDOW_CLASS = L"BYOAHiddenWindowClass";

    // Register window class for hidden window
    WNDCLASSEXW wc   = {};
    wc.cbSize        = sizeof(WNDCLASSEXW);
    wc.lpfnWndProc   = HiddenWindowProc;
    wc.hInstance     = GetModuleHandle(nullptr);
    wc.lpszClassName = HIDDEN_WINDOW_CLASS;

    if (!RegisterClassExW(&wc)) {
        DWORD error = GetLastError();
        if (error != ERROR_CLASS_ALREADY_EXISTS) {
            Logger::getInstance().error("MenubarController::init: Failed to register window class: {}", error);
            return nullptr;
        }
    }

    // TODO: We can perhaps merge this hidden window with the one for Shortcuts!
    // Create hidden window for receiving tray icon messages
    // Note: Using WS_POPUP instead of HWND_MESSAGE to ensure compatibility with message loops
    HWND hiddenWindow = CreateWindowExW(0, HIDDEN_WINDOW_CLASS, L"BYOA Hidden Helper Window",
                                        WS_POPUP, // Use WS_POPUP for a hidden window that can receive messages
                                        0, 0, 0, 0,
                                        nullptr, // No parent
                                        nullptr, GetModuleHandle(nullptr), nullptr);

    if (!hiddenWindow) {
        Logger::getInstance().error("MenubarController::init: Failed to create hidden window: {}", GetLastError());
        return nullptr;
    }

    // Store the instance pointer in the window's user data
    SetWindowLongPtrW(hiddenWindow, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(nullptr));
    return hiddenWindow;
}

HWND HiddenWindow = nullptr;

AppController &AppController::getInstance() {
    static AppController instance;
    return instance;
}

void AppController::init() {
    Logger::getInstance().info("AppController::init: start (Windows)");
    HiddenWindow = CreateHiddenWindow();
}

int AppController::start() {
    Logger::getInstance().info("AppController::start: start (Windows)");

    auto start = [&](saucer::application *app) -> coco::stray {
        Logger::getInstance().info("AppController::init: create window");
        _app = app;

        _mainWindow      = make_shared<WindowWrapper>(_app, WindowWrapper::WINDOW_TYPE::MAIN);
        _assistantWindow = make_shared<WindowWrapper>(_app, WindowWrapper::WINDOW_TYPE::POPUP);

        MenubarController::getInstance().init();

        Shortcut::getInstance().registerHandler([&]() {
            if (!_assistantWindow->isVisible()) {
                // TODO: Get the focused window process ID on Windows
                _focusedAppPId = 0;
                _copyContent();

                bool hasString = Clipboard::getInstance().hasString();
                bool hasImage  = Clipboard::getInstance().hasImage();
                if (!hasString && !hasImage) {
                    Logger::getInstance().warn("Unsupported content");
                    return;
                }

                _assistantWindow->show();
            } else {
                _assistantWindow->move();
            }
        });

        _mainWindow->show();

        // Keep the app running until it finishes
        co_await _app->finish();
    };

    auto app = saucer::application::create({.id = "com.byoa.assistant"});

    int status = app->run(start);
    return status;
}

int AppController::stop() {
    Logger::getInstance().info("AppController::stop: start");
    DestroyWindow(HiddenWindow);
    HiddenWindow     = nullptr;
    _assistantWindow = nullptr;
    _mainWindow      = nullptr;
    _app->quit();
    return 0;
}

std::shared_ptr<WindowWrapper> AppController::getMainWindow() {
    return _mainWindow;
}

std::shared_ptr<WindowWrapper> AppController::getAssistantWindow() {
    return _assistantWindow;
}

HWND AppController::getHiddenWindowHandle() {
    return HiddenWindow;
}

void AppController::_copyContent() {
    Logger::getInstance().info("AppController::copyContent: start: pid: {}", _focusedAppPId);

    if (_focusedAppPId < 1) {
        return;
    }

    // TODO: Implement Ctrl+C simulation on Windows
    Logger::getInstance().warn("Copy content not yet implemented on Windows");
}

void AppController::_pasteContent(const std::string &type, const std::string &data) {
    Logger::getInstance().info("AppController::pasteContent: start: pid: {}", _focusedAppPId);

    if (_focusedAppPId < 1) {
        return;
    }

    if ((type != "text" && type != "image") || data.empty()) {
        return;
    }

    // TODO: Implement Ctrl+V simulation on Windows
    Logger::getInstance().warn("Paste content not yet implemented on Windows");

    _focusedAppPId = 0;
}
