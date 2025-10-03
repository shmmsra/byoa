#include <keychain/keychain.h>

#include "vault.hpp"
#include "logger.hpp"

namespace byoa {

bool Vault::storeData(const std::string& key, const std::string& value) {
    keychain::Error error;
    keychain::setPassword(PACKAGE_NAME, SERVICE_NAME, key, value, error);
    
    if (error) {
        Logger::getInstance().error("Failed to store data: {}", error.message);
        return false;
    }
    
    return true;
}

std::optional<std::string> Vault::getData(const std::string& key) {
    keychain::Error error;
    auto data = keychain::getPassword(PACKAGE_NAME, SERVICE_NAME, key, error);
    
    if (error.type == keychain::ErrorType::NotFound) {
        return std::nullopt;
    } else if (error) {
        Logger::getInstance().error("Failed to get data: {}", error.message);
        return std::nullopt;
    }
    
    return data;
}

bool Vault::deleteData(const std::string& key) {
    keychain::Error error;
    keychain::deletePassword(PACKAGE_NAME, SERVICE_NAME, key, error);
    
    if (error) {
        Logger::getInstance().error("Failed to delete data: {}", error.message);
        return false;
    }
    
    return true;
}

bool Vault::hasData(const std::string& key) {
    keychain::Error error;
    keychain::getPassword(PACKAGE_NAME, SERVICE_NAME, key, error);
    
    return error.type != keychain::ErrorType::NotFound;
}

} // namespace byoa
