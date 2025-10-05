#include <saucer/smartview.hpp>
#include <saucer/window.hpp>

#include "webview-wrapper.hpp"
#include "logger.hpp"
#include "clipboard.hpp"
#include "vault.hpp"
#include "network.hpp"

using namespace std;
using namespace byoa;

WebviewWrapper::WebviewWrapper(shared_ptr<saucer::window> window) {
    auto result = saucer::smartview<>::create({
        .window = window
    });
    if (result.has_value()) {
        _webview.emplace(std::move(result.value()));
        
        // Set the webview background (this is what you'll actually see)
        _webview->set_background({0, 0, 0, 100});

#ifdef DEBUG
        // Enable developer tools for debugging
        // NOTE: There seems to be a bug on enabling the dev tools,
        // it shows up the window automatically with some delay
        // even it was hidden earlier.
        // _webview->set_dev_tools(true);
#endif  // DEBUG
    }
}

bool WebviewWrapper::init(const string& viewURL) {
    if (!_webview.has_value()) {
        Logger::getInstance().error("WebviewWrapper::init: Webview not initialized");
        return false;
    }
    
    // Expose clipboard functions
    _webview->expose("clipboard_readText", []() -> coco::task<string> {
        co_return Clipboard::readText();
    });

    _webview->expose("clipboard_writeText", [](const string& text) -> coco::task<bool> {
        bool success = Clipboard::writeText(text);
        co_return success;
    });

    _webview->expose("clipboard_clear", []() -> coco::task<void> {
        Clipboard::clear();
        co_return;
    });

    _webview->expose("vault_getData", [](const string& key) -> coco::task<string> {
        auto data = Vault::getData(key);
        co_return data.value_or("");
    });

    _webview->expose("vault_setData", [](const string& key, const string& value) -> coco::task<bool> {
        bool success = Vault::storeData(key, value);
        co_return success;
    });

    _webview->expose("vault_deleteData", [](const string& key) -> coco::task<bool> {
        bool success = Vault::deleteData(key);
        co_return success;
    });

    _webview->expose("vault_hasData", [](const string& key) -> coco::task<bool> {
        bool success = Vault::hasData(key);
        co_return success;
    });

    _webview->expose("network_fetch", [](const string& url, const string& options) -> coco::task<string> {
        // co_await the future directly - the function returns a temporary (rvalue) that can be awaited
        // This suspends the coroutine without blocking the thread
        // The coroutine will automatically resume when the background thread completes
        string response = co_await Network::fetchAsync(url, options);
        co_return response;
    });

    if (!viewURL.empty()) {
        // Load local HTML content
        _webview->set_url(viewURL);
        Logger::getInstance().info("AppController::start: Loading local HTML: {}", viewURL);
    } else {
        Logger::getInstance().info("AppController::start: Loading fallback error page");
        return false;
    }

    return true;
}

void WebviewWrapper::triggerEvent(const string& eventName, const string& data) {
    if (!_webview.has_value()) {
        Logger::getInstance().warn("WebviewWrapper::triggerEvent: Webview not available");
        return;
    }
    
    Logger::getInstance().info("AppController::triggerEvent: Calling native callback with event: {}", eventName);
    
    // Escape the strings for JavaScript execution
    auto escapeString = [](const string& str) {
        string result;
        for (char c : str) {
            if (c == '"' || c == '\'') {
                result += "\\";
                result += c;
            } else if (c == '\\') {
                result += "\\\\";
            } else if (c == '\n') {
                result += "\\n";
            } else if (c == '\r') {
                result += "\\r";
            } else if (c == '\t') {
                result += "\\t";
            } else {
                result += c;
            }
        }
        return result;
    };
    
    string escapedEventName = escapeString(eventName);
    string escapedData = escapeString(data);
    
    try {
        // Use saucer's format string with placeholders - don't add quotes since saucer adds them
        auto result = _webview->evaluate<string>(
            "(function() {{ if (window.__nativeCallback) {{ window.__nativeCallback({}, {}); }} return ''; }})()",
            escapedEventName, escapedData
        );
        // We don't need to wait for the result since it's fire-and-forget
    } catch (const exception& e) {
        Logger::getInstance().error("AppController::triggerEvent: Failed to call JavaScript callback: {}", e.what());
    }
}
