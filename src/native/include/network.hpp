#pragma once

#include <coco/promise/promise.hpp>
#include <future>
#include <map>
#include <string>

namespace byoa {

    /**
     * @brief Network utility class for making HTTP requests
     *
     * This class provides fetch-like functionality using CPR library
     * to avoid CORS issues when making requests from the webview.
     */
    class Network {
      public:
        /**
         * @brief Structure to hold fetch request options
         */
        struct FetchOptions {
            std::string method = "GET";
            std::map<std::string, std::string> headers;
            std::string body;
        };

        /**
         * @brief Structure to hold fetch response
         */
        struct FetchResponse {
            int status = 0;
            std::string statusText;
            std::map<std::string, std::string> headers;
            std::string body;
            bool ok = false;
        };

        /**
         * @brief Make an HTTP request asynchronously (fetch-like API) - returns coco::future
         *
         * @param url The URL to fetch
         * @param options JSON string containing method, headers, and body
         * @return coco::future that can be co_awaited without blocking
         */
        static coco::future<std::string> fetchAsync(const std::string &url, const std::string &options);

        /**
         * @brief Make an HTTP request synchronously (fetch-like API)
         *
         * @param url The URL to fetch
         * @param options JSON string containing method, headers, and body
         * @return JSON string containing the response
         */
        static std::string fetch(const std::string &url, const std::string &options);

      private:
        /**
         * @brief Internal fetch implementation (synchronous)
         */
        static std::string fetchImpl(const std::string &url, const std::string &options);

        /**
         * @brief Parse JSON options string to FetchOptions struct
         */
        static FetchOptions parseOptions(const std::string &optionsJson);

        /**
         * @brief Convert FetchResponse to JSON string
         */
        static std::string responseToJson(const FetchResponse &response);

        /**
         * @brief Get system proxy configuration
         * @return Proxy URL string (empty if no proxy configured)
         */
        static std::string getSystemProxy();
    };

} // namespace byoa
