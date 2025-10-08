#include "clipboard.hpp"
#include "logger.hpp"
#include <sstream>
#include <string>
#include <vector>
#include <windows.h>

Clipboard &Clipboard::getInstance() {
    static Clipboard instance;
    return instance;
}

bool Clipboard::hasString() {
    Logger::getInstance().info("Clipboard::hasString: start");

    // Try to open the clipboard
    if (!OpenClipboard(NULL)) {
        Logger::getInstance().warn("Clipboard::hasString: failed to open clipboard");
        return false;
    }

    // Check for text formats in order of preference
    bool hasText =
        IsClipboardFormatAvailable(CF_UNICODETEXT) || IsClipboardFormatAvailable(CF_TEXT) || IsClipboardFormatAvailable(CF_OEMTEXT);

    // Always close the clipboard when done
    CloseClipboard();

    Logger::getInstance().info("Clipboard::hasString: hasText: {}", hasText);
    return hasText;
}

bool Clipboard::hasImage() {
    Logger::getInstance().info("Clipboard::hasImage: start");

    // Try to open the clipboard
    if (!OpenClipboard(NULL)) {
        Logger::getInstance().warn("Clipboard::hasImage: failed to open clipboard");
        return false;
    }

    // Check for various image formats in order of preference
    bool hasImage = IsClipboardFormatAvailable(CF_DIB) ||         // Device Independent Bitmap
                    IsClipboardFormatAvailable(CF_DIBV5) ||       // Extended DIB format
                    IsClipboardFormatAvailable(CF_BITMAP) ||      // Handle to a bitmap
                    IsClipboardFormatAvailable(CF_ENHMETAFILE) || // Enhanced metafile
                    IsClipboardFormatAvailable(CF_TIFF);          // TIFF format

    // Check for custom PNG format if not found in standard formats
    if (!hasImage) {
        static UINT pngFormat = RegisterClipboardFormat(L"PNG");
        if (pngFormat != 0) {
            hasImage = IsClipboardFormatAvailable(pngFormat);
        }
    }

    // Always close the clipboard when done
    CloseClipboard();

    Logger::getInstance().info("Clipboard::hasImage: hasImage: {}", hasImage);
    return hasImage;
}

std::string Clipboard::getString() {
    Logger::getInstance().info("Clipboard::getString: start");

    if (!OpenClipboard(NULL)) {
        Logger::getInstance().warn("Clipboard::getString: failed to open clipboard");
        return "";
    }

    std::string result;

    // Try Unicode text first
    if (IsClipboardFormatAvailable(CF_UNICODETEXT)) {
        HANDLE hClipboard = GetClipboardData(CF_UNICODETEXT);
        if (hClipboard) {
            LPWSTR clipText = static_cast<LPWSTR>(GlobalLock(hClipboard));
            if (clipText) {
                // Convert wide string to UTF-8
                int size = WideCharToMultiByte(CP_UTF8, 0, clipText, -1, NULL, 0, NULL, NULL);
                if (size > 0) {
                    std::vector<char> buffer(size);
                    if (WideCharToMultiByte(CP_UTF8, 0, clipText, -1, buffer.data(), size, NULL, NULL)) {
                        result = buffer.data();
                    }
                }
                GlobalUnlock(hClipboard);
            }
        }
    }
    // Fall back to ANSI text if Unicode is not available
    else if (IsClipboardFormatAvailable(CF_TEXT)) {
        HANDLE hClipboard = GetClipboardData(CF_TEXT);
        if (hClipboard) {
            LPSTR clipText = static_cast<LPSTR>(GlobalLock(hClipboard));
            if (clipText) {
                result = clipText;
                GlobalUnlock(hClipboard);
            }
        }
    }

    CloseClipboard();

    Logger::getInstance().info("Clipboard::getString: complete, length: {}", result.length());
    return result;
}

bool Clipboard::writeText(const std::string &text) {
    Logger::getInstance().info("Clipboard::writeText: start, length: {}", text.length());

    if (!OpenClipboard(NULL)) {
        Logger::getInstance().warn("Clipboard::writeText: failed to open clipboard");
        return false;
    }

    // Empty the clipboard first
    EmptyClipboard();

    // Convert UTF-8 to wide string
    int wideSize = MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, NULL, 0);
    if (wideSize <= 0) {
        CloseClipboard();
        Logger::getInstance().warn("Clipboard::writeText: failed to convert to wide string");
        return false;
    }

    // Allocate global memory
    HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE, wideSize * sizeof(wchar_t));
    if (!hMem) {
        CloseClipboard();
        Logger::getInstance().warn("Clipboard::writeText: failed to allocate memory");
        return false;
    }

    // Lock the memory and copy the text
    wchar_t *pMem = static_cast<wchar_t *>(GlobalLock(hMem));
    if (pMem) {
        MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, pMem, wideSize);
        GlobalUnlock(hMem);

        // Set the clipboard data
        if (SetClipboardData(CF_UNICODETEXT, hMem)) {
            CloseClipboard();
            Logger::getInstance().info("Clipboard::writeText: success");
            return true;
        }
    }

    // If we get here, something failed
    GlobalFree(hMem);
    CloseClipboard();
    Logger::getInstance().warn("Clipboard::writeText: failed to set clipboard data");
    return false;
}

std::string Clipboard::readText() {
    Logger::getInstance().info("Clipboard::readText: start");

    if (!OpenClipboard(NULL)) {
        Logger::getInstance().warn("Clipboard::readText: failed to open clipboard");
        return "";
    }

    std::string result;

    // Try Unicode text first
    if (IsClipboardFormatAvailable(CF_UNICODETEXT)) {
        HANDLE hClipboard = GetClipboardData(CF_UNICODETEXT);
        if (hClipboard) {
            LPWSTR clipText = static_cast<LPWSTR>(GlobalLock(hClipboard));
            if (clipText) {
                // Convert wide string to UTF-8
                int size = WideCharToMultiByte(CP_UTF8, 0, clipText, -1, NULL, 0, NULL, NULL);
                if (size > 0) {
                    std::vector<char> buffer(size);
                    if (WideCharToMultiByte(CP_UTF8, 0, clipText, -1, buffer.data(), size, NULL, NULL)) {
                        result = buffer.data();
                    }
                }
                GlobalUnlock(hClipboard);
            }
        }
    }
    // Fall back to ANSI text if Unicode is not available
    else if (IsClipboardFormatAvailable(CF_TEXT)) {
        HANDLE hClipboard = GetClipboardData(CF_TEXT);
        if (hClipboard) {
            LPSTR clipText = static_cast<LPSTR>(GlobalLock(hClipboard));
            if (clipText) {
                result = clipText;
                GlobalUnlock(hClipboard);
            }
        }
    }

    CloseClipboard();

    Logger::getInstance().info("Clipboard::readText: complete, length: {}", result.length());
    return result;
}

void Clipboard::clear() {
    Logger::getInstance().info("Clipboard::clear: start");

    if (!OpenClipboard(NULL)) {
        Logger::getInstance().warn("Clipboard::clear: failed to open clipboard");
        return;
    }

    EmptyClipboard();
    CloseClipboard();

    Logger::getInstance().info("Clipboard::clear: complete");
}
