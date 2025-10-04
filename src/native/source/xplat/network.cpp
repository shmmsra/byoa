#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

#include "network.hpp"
#include "logger.hpp"

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <SystemConfiguration/SystemConfiguration.h>
#endif

using json = nlohmann::json;

namespace byoa {

Network::FetchOptions Network::parseOptions(const std::string& optionsJson) {
    FetchOptions options;
    
    if (optionsJson.empty()) {
        return options;
    }
    
    try {
        json j = json::parse(optionsJson);
        
        // Parse method
        if (j.contains("method") && j["method"].is_string()) {
            options.method = j["method"].get<std::string>();
        }
        
        // Parse headers
        if (j.contains("headers") && j["headers"].is_object()) {
            for (auto& [key, value] : j["headers"].items()) {
                if (value.is_string()) {
                    options.headers[key] = value.get<std::string>();
                }
            }
        }
        
        // Parse body
        if (j.contains("body") && j["body"].is_string()) {
            options.body = j["body"].get<std::string>();
        }
        
    } catch (const json::exception& e) {
        Logger::getInstance().error("Network::parseOptions: JSON parse error: {}", e.what());
    }
    
    return options;
}

std::string Network::responseToJson(const FetchResponse& response) {
    try {
        json j;
        j["status"] = response.status;
        j["statusText"] = response.statusText;
        j["ok"] = response.ok;
        j["headers"] = response.headers;
        j["body"] = response.body;
        
        return j.dump();
    } catch (const json::exception& e) {
        Logger::getInstance().error("Network::responseToJson: JSON creation error: {}", e.what());
        return "{}";
    }
}

std::string Network::getSystemProxy() {
#ifdef __APPLE__
    // Get system proxy settings from macOS
    CFDictionaryRef proxySettings = SCDynamicStoreCopyProxies(nullptr);
    if (!proxySettings) {
        return "";
    }
    
    std::string proxyUrl;
    
    // Check if HTTP proxy is enabled
    CFNumberRef httpProxyEnabled = (CFNumberRef)CFDictionaryGetValue(proxySettings, kSCPropNetProxiesHTTPEnable);
    if (httpProxyEnabled) {
        int enabled = 0;
        CFNumberGetValue(httpProxyEnabled, kCFNumberIntType, &enabled);
        
        if (enabled) {
            // Get HTTP proxy host
            CFStringRef proxyHost = (CFStringRef)CFDictionaryGetValue(proxySettings, kSCPropNetProxiesHTTPProxy);
            CFNumberRef proxyPort = (CFNumberRef)CFDictionaryGetValue(proxySettings, kSCPropNetProxiesHTTPPort);
            
            if (proxyHost && proxyPort) {
                char hostBuffer[256];
                if (CFStringGetCString(proxyHost, hostBuffer, sizeof(hostBuffer), kCFStringEncodingUTF8)) {
                    int port = 0;
                    CFNumberGetValue(proxyPort, kCFNumberIntType, &port);
                    proxyUrl = "http://" + std::string(hostBuffer) + ":" + std::to_string(port);
                }
            }
        }
    }
    
    CFRelease(proxySettings);
    return proxyUrl;
#else
    // For other platforms, check environment variables
    const char* httpProxy = std::getenv("HTTP_PROXY");
    if (httpProxy) {
        return std::string(httpProxy);
    }
    
    const char* httpsProxy = std::getenv("HTTPS_PROXY");
    if (httpsProxy) {
        return std::string(httpsProxy);
    }
    
    return "";
#endif
}

std::string Network::fetch(const std::string& url, const std::string& optionsJson) {
    try {
        Logger::getInstance().info("Network::fetch: Fetching URL: {}", url);
        
        FetchOptions options = parseOptions(optionsJson);
        Logger::getInstance().info("Network::fetch: Method: {}", options.method);
        
        // Build CPR session
        cpr::Session session;
        session.SetUrl(cpr::Url{url});
        
        // Set system proxy if available
        std::string proxyUrl = getSystemProxy();
        if (!proxyUrl.empty()) {
            Logger::getInstance().info("Network::fetch: Using system proxy: {}", proxyUrl);
            session.SetProxies(cpr::Proxies{{"http", proxyUrl}, {"https", proxyUrl}});
        }
        
        // Set headers
        cpr::Header headers;
        for (const auto& [key, value] : options.headers) {
            headers[key] = value;
            Logger::getInstance().info("Network::fetch: Header: {} = {}", key, value);
        }
        if (!headers.empty()) {
            session.SetHeader(headers);
        }
        
        // Set timeout (30 seconds default)
        session.SetTimeout(cpr::Timeout{30000});
        
        // Set body if present
        if (!options.body.empty()) {
            session.SetBody(cpr::Body{options.body});
            Logger::getInstance().info("Network::fetch: Body length: {}", options.body.length());
        }
        
        // Make request based on method
        cpr::Response r;
        if (options.method == "GET") {
            r = session.Get();
        } else if (options.method == "POST") {
            r = session.Post();
        } else if (options.method == "PUT") {
            r = session.Put();
        } else if (options.method == "DELETE") {
            r = session.Delete();
        } else if (options.method == "PATCH") {
            r = session.Patch();
        } else if (options.method == "HEAD") {
            r = session.Head();
        } else if (options.method == "OPTIONS") {
            r = session.Options();
        } else {
            Logger::getInstance().error("Network::fetch: Unsupported HTTP method: {}", options.method);
            FetchResponse errorResponse;
            errorResponse.status = 400;
            errorResponse.statusText = "Bad Request";
            errorResponse.body = "Unsupported HTTP method: " + options.method;
            errorResponse.ok = false;
            return responseToJson(errorResponse);
        }
        
        // Build response
        FetchResponse response;
        response.status = static_cast<int>(r.status_code);
        response.statusText = r.status_line;
        response.body = r.text;
        response.ok = (r.status_code >= 200 && r.status_code < 300);
        
        // Copy response headers
        for (const auto& [key, value] : r.header) {
            response.headers[key] = value;
        }
        
        Logger::getInstance().info("Network::fetch: Response status: {}", response.status);
        Logger::getInstance().info("Network::fetch: Response body length: {}", response.body.length());
        
        return responseToJson(response);
        
    } catch (const std::exception& e) {
        Logger::getInstance().error("Network::fetch: Exception: {}", e.what());
        
        FetchResponse errorResponse;
        errorResponse.status = 0;
        errorResponse.statusText = "Network Error";
        errorResponse.body = std::string("Network error: ") + e.what();
        errorResponse.ok = false;
        
        return responseToJson(errorResponse);
    }
}

} // namespace byoa
