# Script to generate Windows resource file from web build output
# Usage: cmake -DWEB_RESOURCES_DIR=<dir> -DOUTPUT_RC=<file> -P GenerateResourceFile.cmake

if(NOT DEFINED WEB_RESOURCES_DIR)
    message(FATAL_ERROR "WEB_RESOURCES_DIR must be defined")
endif()

if(NOT DEFINED OUTPUT_RC)
    message(FATAL_ERROR "OUTPUT_RC must be defined")
endif()

if(NOT DEFINED OUTPUT_HEADER)
    message(FATAL_ERROR "OUTPUT_HEADER must be defined")
endif()

# Check if web resources directory exists
if(NOT EXISTS "${WEB_RESOURCES_DIR}")
    message(WARNING "Web resources directory does not exist: ${WEB_RESOURCES_DIR}")
    message(WARNING "Creating empty resource files (resources will be embedded when you run 'npm run build')")
    
    # Create empty but valid .rc file
    file(WRITE "${OUTPUT_RC}" "// No web resources found\n// Run 'npm run build' to generate web resources\n// Then reconfigure CMake: cmake -B build\n")
    
    # Create empty but valid header file
    file(WRITE "${OUTPUT_HEADER}" "#ifndef RESOURCE_IDS_H\n#define RESOURCE_IDS_H\n\n#include <map>\n#include <string>\n\n#define IDR_WEB_INDEX_HTML 100\n#define IDR_WEB_RESOURCE_BASE 1000\n\ninline const std::map<int, std::string>& getResourceMap() {\n    static const std::map<int, std::string> resourceMap = {};\n    return resourceMap;\n}\n\n#endif // RESOURCE_IDS_H\n")
    
    message(STATUS "Generated empty resource files (web resources not built yet)")
    return()
endif()

# Collect all files recursively from web resources
file(GLOB_RECURSE WEB_FILES 
    RELATIVE "${WEB_RESOURCES_DIR}"
    "${WEB_RESOURCES_DIR}/*"
)

# Filter out directories
set(FILTERED_FILES "")
foreach(FILE ${WEB_FILES})
    if(NOT IS_DIRECTORY "${WEB_RESOURCES_DIR}/${FILE}")
        list(APPEND FILTERED_FILES ${FILE})
    endif()
endforeach()

# Start generating the resource header file
set(HEADER_CONTENT "#ifndef RESOURCE_IDS_H\n")
set(HEADER_CONTENT "${HEADER_CONTENT}#define RESOURCE_IDS_H\n\n")
set(HEADER_CONTENT "${HEADER_CONTENT}#include <map>\n")
set(HEADER_CONTENT "${HEADER_CONTENT}#include <string>\n\n")
set(HEADER_CONTENT "${HEADER_CONTENT}// Resource IDs for embedded web resources\n")
set(HEADER_CONTENT "${HEADER_CONTENT}// AUTO-GENERATED - DO NOT EDIT\n\n")

# Start generating the .rc file
set(RC_CONTENT "// AUTO-GENERATED Windows Resource Script\n")
set(RC_CONTENT "${RC_CONTENT}// DO NOT EDIT - Generated from web build output\n\n")

# Don't include the header file - just define the IDs inline to avoid include path issues
# Windows resource compiler doesn't handle include paths well
set(RC_CONTENT "${RC_CONTENT}// Resource ID definitions\n")
set(RC_CONTENT "${RC_CONTENT}#define IDR_WEB_INDEX_HTML 100\n")
set(RC_CONTENT "${RC_CONTENT}#define IDR_WEB_RESOURCE_BASE 1000\n\n")

# Resource ID counter
set(RESOURCE_ID 1000)

# Check if index.html exists and remove it from the list for special handling
set(INDEX_HTML_ID 100)
list(FIND FILTERED_FILES "index.html" INDEX_POS)
set(HAS_INDEX_HTML FALSE)
if(INDEX_POS GREATER -1)
    set(HAS_INDEX_HTML TRUE)
    list(REMOVE_AT FILTERED_FILES ${INDEX_POS})
endif()

# Add index.html ID to header
if(HAS_INDEX_HTML)
    set(HEADER_CONTENT "${HEADER_CONTENT}#define IDR_WEB_INDEX_HTML ${INDEX_HTML_ID}\n")
endif()

set(HEADER_CONTENT "${HEADER_CONTENT}\n#define IDR_WEB_RESOURCE_BASE 1000\n\n")

# Generate resource ID definitions for all other files
foreach(FILE ${FILTERED_FILES})
    # Create a valid C identifier from the file path
    string(REPLACE "/" "_" IDENTIFIER "${FILE}")
    string(REPLACE "." "_" IDENTIFIER "${IDENTIFIER}")
    string(REPLACE "-" "_" IDENTIFIER "${IDENTIFIER}")
    string(TOUPPER "${IDENTIFIER}" IDENTIFIER)
    set(RESOURCE_NAME "IDR_WEB_${IDENTIFIER}")
    
    # Add to header
    set(HEADER_CONTENT "${HEADER_CONTENT}#define ${RESOURCE_NAME} ${RESOURCE_ID}\n")
    
    # Add ID definition to .rc file
    set(RC_CONTENT "${RC_CONTENT}#define ${RESOURCE_NAME} ${RESOURCE_ID}\n")
    
    math(EXPR RESOURCE_ID "${RESOURCE_ID} + 1")
endforeach()

# Add a blank line after definitions in .rc file
set(RC_CONTENT "${RC_CONTENT}\n// Resource data\n")

# Add index.html resource data to .rc file
if(HAS_INDEX_HTML)
    file(TO_NATIVE_PATH "${WEB_RESOURCES_DIR}/index.html" NATIVE_PATH)
    set(RC_CONTENT "${RC_CONTENT}IDR_WEB_INDEX_HTML RCDATA \"${NATIVE_PATH}\"\n")
endif()

# Add all other resource data to .rc file
foreach(FILE ${FILTERED_FILES})
    string(REPLACE "/" "_" IDENTIFIER "${FILE}")
    string(REPLACE "." "_" IDENTIFIER "${IDENTIFIER}")
    string(REPLACE "-" "_" IDENTIFIER "${IDENTIFIER}")
    string(TOUPPER "${IDENTIFIER}" IDENTIFIER)
    set(RESOURCE_NAME "IDR_WEB_${IDENTIFIER}")
    
    # Add to .rc file with proper Windows path
    string(REPLACE "/" "\\\\" WIN_PATH "${FILE}")
    file(TO_NATIVE_PATH "${WEB_RESOURCES_DIR}/${WIN_PATH}" NATIVE_PATH)
    set(RC_CONTENT "${RC_CONTENT}${RESOURCE_NAME} RCDATA \"${NATIVE_PATH}\"\n")
endforeach()

# Add a function to get the resource map
set(HEADER_CONTENT "${HEADER_CONTENT}\n// Resource ID to filename mapping\n")
set(HEADER_CONTENT "${HEADER_CONTENT}inline const std::map<int, std::string>& getResourceMap() {\n")
set(HEADER_CONTENT "${HEADER_CONTENT}    static const std::map<int, std::string> resourceMap = {\n")
set(HEADER_CONTENT "${HEADER_CONTENT}        {IDR_WEB_INDEX_HTML, \"index.html\"},\n")

# Add all other files to the map
foreach(FILE ${FILTERED_FILES})
    string(REPLACE "/" "_" IDENTIFIER "${FILE}")
    string(REPLACE "." "_" IDENTIFIER "${IDENTIFIER}")
    string(REPLACE "-" "_" IDENTIFIER "${IDENTIFIER}")
    string(TOUPPER "${IDENTIFIER}" IDENTIFIER)
    set(RESOURCE_NAME "IDR_WEB_${IDENTIFIER}")
    set(HEADER_CONTENT "${HEADER_CONTENT}        {${RESOURCE_NAME}, \"${FILE}\"},\n")
endforeach()

set(HEADER_CONTENT "${HEADER_CONTENT}    };\n")
set(HEADER_CONTENT "${HEADER_CONTENT}    return resourceMap;\n")
set(HEADER_CONTENT "${HEADER_CONTENT}}\n")

# Close header file
set(HEADER_CONTENT "${HEADER_CONTENT}\n#endif // RESOURCE_IDS_H\n")

# Write the files
file(WRITE "${OUTPUT_HEADER}" "${HEADER_CONTENT}")
file(WRITE "${OUTPUT_RC}" "${RC_CONTENT}")

message(STATUS "Generated resource file with ${RESOURCE_ID} resources: ${OUTPUT_RC}")
message(STATUS "Generated resource header: ${OUTPUT_HEADER}")

