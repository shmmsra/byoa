#pragma once

#include <optional>
#include <string>

namespace byoa {

    /**
     * @brief Helper class for managing vault operations
     *
     * This class provides a simplified interface to the vault library
     * for storing and retrieving credentials securely.
     */
    class Vault {
      public:
        /**
         * @brief Store a value in the vault
         *
         * @param key The key/account
         * @param value The value/token to store
         * @return true if successful, false otherwise (e.g., "sk-your-api-key-here")
         */
        static bool storeData(const std::string &key, const std::string &value);

        /**
         * @brief Retrieve a value from the vault
         *
         * @param key The key/account
         * @return The value if found, std::nullopt otherwise (e.g., "sk-your-api-key-here")
         */
        static std::optional<std::string> getData(const std::string &key);

        /**
         * @brief Delete a value from the vault
         *
         * @param key The key/account
         * @return true if successful, false otherwise (e.g., "sk-your-api-key-here")
         */
        static bool deleteData(const std::string &key);

        /**
         * @brief Check if a value exists in the vault
         *
         * @param key The key/account
         * @return true if value exists, false otherwise (e.g., "sk-your-api-key-here")
         */
        static bool hasData(const std::string &key);

      private:
        static constexpr const char *PACKAGE_NAME = "com.byoa.assistant";
        static constexpr const char *SERVICE_NAME = "vault";
    };

} // namespace byoa
