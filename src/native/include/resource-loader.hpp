#ifndef RESOURCE_LOADER_HPP
#define RESOURCE_LOADER_HPP

#include <optional>
#include <string>
#include <vector>

#ifdef _WIN32

/**
 * Utility class for loading embedded Windows resources
 */
class ResourceLoader {
  public:
    /**
     * Extract embedded web resources to a temporary directory
     * @return Path to the directory containing extracted resources, or nullopt on failure
     */
    static std::optional<std::string> extractWebResources();

    /**
     * Load a resource by ID
     * @param resourceId The resource ID
     * @return Resource data as byte vector, or nullopt if not found
     */
    static std::optional<std::vector<unsigned char>> loadResource(int resourceId);

    /**
     * Get the temporary directory used for extracted resources
     * @return Path to temp directory
     */
    static std::string getTempResourcePath();

    /**
     * Clean up extracted resources (call on app exit)
     */
    static void cleanup();

  private:
    static std::string _tempPath;
    static bool _extracted;
};

#endif // _WIN32

#endif // RESOURCE_LOADER_HPP
