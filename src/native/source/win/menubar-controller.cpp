#include "menubar-controller.hpp"
#include "app-controller.hpp"
#include "logger.hpp"
#include "resource-ids.h"
// clang-format off
#include <windows.h>
#include <shellapi.h>
// clang-format on

#define WM_TRAYICON      (WM_USER + 1)
#define ID_TRAY_ICON     1001
#define ID_MENU_SETTINGS 2001
#define ID_MENU_QUIT     2002

MenubarController &MenubarController::getInstance() {
    static MenubarController instance;
    return instance;
}

void MenubarController::init() {
    Logger::getInstance().info("MenubarController::init: start (Windows)");

    _iconAdded = false;
    _menu      = nullptr;

    // Create the system tray icon
    createTrayIcon();

    // Create the context menu
    createMenu();
}

void MenubarController::cleanup() {
    Logger::getInstance().info("MenubarController::cleanup: start");

    // Remove tray icon
    if (_iconAdded) {
        Shell_NotifyIconW(NIM_DELETE, &_notifyIconData);
        _iconAdded = false;
    }

    // Destroy menu
    if (_menu) {
        DestroyMenu(_menu);
        _menu = nullptr;
    }
}

void MenubarController::createTrayIcon() {
    Logger::getInstance().info("MenubarController::createTrayIcon: start");

    auto hiddenWindow = AppController::getInstance().getHiddenWindowHandle();

    // Initialize NOTIFYICONDATA structure
    ZeroMemory(&_notifyIconData, sizeof(NOTIFYICONDATAW));
    _notifyIconData.cbSize           = sizeof(NOTIFYICONDATAW);
    _notifyIconData.hWnd             = hiddenWindow;
    _notifyIconData.uID              = ID_TRAY_ICON;
    _notifyIconData.uFlags           = NIF_ICON | NIF_MESSAGE | NIF_TIP;
    _notifyIconData.uCallbackMessage = WM_TRAYICON;
    Logger::getInstance().info("MenubarController::createTrayIcon: WM_TRAYICON = {:#x}", WM_TRAYICON);

    // Set tooltip
    wcscpy_s(_notifyIconData.szTip, L"Build Your Own Assistant");

    // Try to load icon from resources
    // First try to load from .ico file if it exists
    HICON hIcon = nullptr;

    // Try to load icon from executable resources (if embedded)
    hIcon = LoadIconW(GetModuleHandle(nullptr), MAKEINTRESOURCEW(IDI_TRAY_ICON));

    if (!hIcon) {
        // Create a simple fallback icon
        Logger::getInstance().info("MenubarController::createTrayIcon: Creating fallback icon");
        hIcon = createFallbackIcon();
    }

    _notifyIconData.hIcon = hIcon;

    // Add the icon to the system tray
    if (Shell_NotifyIconW(NIM_ADD, &_notifyIconData)) {
        _iconAdded = true;
        Logger::getInstance().info("MenubarController::createTrayIcon: Tray icon added successfully");
    } else {
        Logger::getInstance().error("MenubarController::createTrayIcon: Failed to add tray icon: {}", GetLastError());
    }
}

void MenubarController::createMenu() {
    Logger::getInstance().info("MenubarController::createMenu: start");

    // Create popup menu
    _menu = CreatePopupMenu();

    if (!_menu) {
        Logger::getInstance().error("MenubarController::createMenu: Failed to create menu: {}", GetLastError());
        return;
    }

    // Add Settings menu item
    AppendMenuW(_menu, MF_STRING, ID_MENU_SETTINGS, L"Settings");

    // Add separator
    AppendMenuW(_menu, MF_SEPARATOR, 0, nullptr);

    // Add Quit menu item
    AppendMenuW(_menu, MF_STRING, ID_MENU_QUIT, L"Quit");

    Logger::getInstance().info("MenubarController::createMenu: Menu created successfully");
}

void MenubarController::showContextMenu() {
    Logger::getInstance().info("MenubarController::showContextMenu: start");
    auto hiddenWindow = AppController::getInstance().getHiddenWindowHandle();

    if (!_menu || !hiddenWindow) {
        Logger::getInstance().error("MenubarController::showContextMenu: Menu/HiddenWindow not initialized");
        return;
    }

    // Get cursor position
    POINT pt;
    GetCursorPos(&pt);

    // Required for popup menus to work correctly
    SetForegroundWindow(hiddenWindow);

    // Show the menu
    TrackPopupMenu(_menu, TPM_RIGHTBUTTON | TPM_BOTTOMALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hiddenWindow, nullptr);

    // Required for popup menus to work correctly
    PostMessage(hiddenWindow, WM_NULL, 0, 0);
}

void MenubarController::showSettings() {
    Logger::getInstance().info("MenubarController::showSettings: start");
    AppController::getInstance().getMainWindow()->show();
}

HICON MenubarController::createFallbackIcon() {
    // Create a simple blue circle icon as fallback
    const int iconSize = 16;

    // Create a device context
    HDC hdc    = GetDC(nullptr);
    HDC hdcMem = CreateCompatibleDC(hdc);

    // Create bitmap for the icon
    HBITMAP hBitmap    = CreateCompatibleBitmap(hdc, iconSize, iconSize);
    HBITMAP hOldBitmap = (HBITMAP)SelectObject(hdcMem, hBitmap);

    // Fill with transparent background (white for XOR mask)
    HBRUSH hBrushBg = CreateSolidBrush(RGB(255, 255, 255));
    RECT rect       = {0, 0, iconSize, iconSize};
    FillRect(hdcMem, &rect, hBrushBg);
    DeleteObject(hBrushBg);

    // Draw a blue circle
    HBRUSH hBrush    = CreateSolidBrush(RGB(0, 120, 215)); // Windows blue
    HPEN hPen        = CreatePen(PS_SOLID, 1, RGB(0, 120, 215));
    HPEN hOldPen     = (HPEN)SelectObject(hdcMem, hPen);
    HBRUSH hOldBrush = (HBRUSH)SelectObject(hdcMem, hBrush);

    Ellipse(hdcMem, 2, 2, iconSize - 2, iconSize - 2);

    SelectObject(hdcMem, hOldBrush);
    SelectObject(hdcMem, hOldPen);
    DeleteObject(hBrush);
    DeleteObject(hPen);

    // Create mask bitmap (monochrome)
    HDC hdcMask            = CreateCompatibleDC(hdc);
    HBITMAP hMaskBitmap    = CreateBitmap(iconSize, iconSize, 1, 1, nullptr);
    HBITMAP hOldMaskBitmap = (HBITMAP)SelectObject(hdcMask, hMaskBitmap);

    // Fill mask with black (opaque)
    HBRUSH hBlackBrush = (HBRUSH)GetStockObject(BLACK_BRUSH);
    FillRect(hdcMask, &rect, hBlackBrush);

    SelectObject(hdcMask, hOldMaskBitmap);
    SelectObject(hdcMem, hOldBitmap);

    // Create icon from bitmaps
    ICONINFO iconInfo = {};
    iconInfo.fIcon    = TRUE;
    iconInfo.hbmMask  = hMaskBitmap;
    iconInfo.hbmColor = hBitmap;

    HICON hIcon = CreateIconIndirect(&iconInfo);

    // Cleanup
    DeleteObject(hBitmap);
    DeleteObject(hMaskBitmap);
    DeleteDC(hdcMask);
    DeleteDC(hdcMem);
    ReleaseDC(nullptr, hdc);

    return hIcon;
}

bool MenubarController::onTrigger(UINT uMsg, WPARAM wParam, LPARAM lParam) {
    // Handle both left and right clicks on tray icon
    if (uMsg == WM_TRAYICON && (lParam == WM_LBUTTONUP || lParam == WM_RBUTTONUP)) {
        Logger::getInstance().info("MenubarController::onTrigger: Tray icon clicked (message: {})", lParam);
        MenubarController::getInstance().showContextMenu();
        return true;
    }
    if (uMsg == WM_COMMAND && LOWORD(wParam) == ID_MENU_SETTINGS) {
        Logger::getInstance().info("MenubarController::onTrigger: Settings menu item selected");
        MenubarController::getInstance().showSettings();
        return true;
    }
    if (uMsg == WM_COMMAND && LOWORD(wParam) == ID_MENU_QUIT) {
        Logger::getInstance().info("MenubarController::onTrigger: Quit menu item selected");
        AppController::getInstance().stop();
        return true;
    }
    return false;
}
