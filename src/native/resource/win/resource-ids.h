#ifndef RESOURCE_IDS_H
#define RESOURCE_IDS_H

#include <map>
#include <string>

// Resource IDs for embedded web resources
// AUTO-GENERATED - DO NOT EDIT

#define IDI_APP_ICON 101

#define IDR_WEB_INDEX_HTML 100

#define IDR_WEB_RESOURCE_BASE 1000

#define IDR_WEB_INDEX_JS 1000

// Resource ID to filename mapping
inline const std::map<int, std::string> &getResourceMap() {
    static const std::map<int, std::string> resourceMap = {
        {IDR_WEB_INDEX_HTML, "index.html"},
        {IDR_WEB_INDEX_JS, "index.js"},
    };
    return resourceMap;
}

#endif // RESOURCE_IDS_H
