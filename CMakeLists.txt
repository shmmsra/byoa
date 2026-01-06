cmake_minimum_required(VERSION 3.16)
project(BYOAssistant VERSION 1.0.0 LANGUAGES CXX OBJCXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Set default build type to Release if not set
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    message(STATUS "Setting build type to 'Release' as none was specified.")
    set(CMAKE_BUILD_TYPE "Release" CACHE STRING "Choose the type of build." FORCE)
    # Set the possible values of build type for cmake-gui
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()
# Set project version
set(PROJECT_VERSION_MAJOR 1)
set(PROJECT_VERSION_MINOR 0)
set(PROJECT_VERSION_PATCH 0)
set(PROJECT_VERSION "${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}")

# Output directories for better organization (libraries only)
# Note: We don't set CMAKE_RUNTIME_OUTPUT_DIRECTORY for macOS bundles
# as it interferes with bundle creation
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# For macOS, if we are using a single-config generator (like Makefiles/Ninja),
# mimicking the multi-config layout (Debug/Release folders) helps with consistency
if(APPLE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/${CMAKE_BUILD_TYPE}")
endif()

include(FetchContent)

# Set FetchContent options
set(FETCHCONTENT_QUIET OFF)
set(FETCHCONTENT_UPDATES_DISCONNECTED ON)

# Fetch spdlog (change tag/version if you want a different release)
message(STATUS "Fetching spdlog...")
FetchContent_Declare(
  spdlog
  GIT_REPOSITORY https://github.com/gabime/spdlog.git
  GIT_TAG v1.15.3
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(spdlog)

# Fetch saucer for webview functionality
message(STATUS "Fetching saucer...")
FetchContent_Declare(
  saucer
  GIT_REPOSITORY "https://github.com/saucer/saucer"
  GIT_TAG v7.0.0
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(saucer)

# Fetch keychain for OS credential storage
message(STATUS "Fetching keychain...")
FetchContent_Declare(
  keychain
  GIT_REPOSITORY "https://github.com/hrantzsch/keychain"
  GIT_TAG v1.3.1
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(keychain)

# Fetch nlohmann/json for JSON parsing and creation
message(STATUS "Fetching nlohmann/json...")
FetchContent_Declare(
  json
  GIT_REPOSITORY "https://github.com/nlohmann/json"
  GIT_TAG v3.11.3
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(json)

# Fetch CPR for HTTP requests
# Configure CPR options before fetching to avoid unnecessary dependencies
message(STATUS "Configuring CPR options...")

# CPR library configuration
set(CPR_USE_SYSTEM_CURL OFF CACHE BOOL "Use system curl" FORCE)
set(CPR_ENABLE_SSL ON CACHE BOOL "Enable SSL" FORCE)
set(BUILD_CPR_TESTS OFF CACHE BOOL "Build CPR tests" FORCE)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build shared libraries" FORCE)
set(CPR_BUILD_TESTS OFF CACHE BOOL "Build CPR tests" FORCE)
set(CPR_BUILD_TESTS_SSL OFF CACHE BOOL "Build CPR SSL tests" FORCE)

# Disable CPR examples and documentation
set(CPR_BUILD_EXAMPLES OFF CACHE BOOL "Don't build CPR examples" FORCE)
set(CPR_BUILD_DOCS OFF CACHE BOOL "Don't build CPR documentation" FORCE)

# Critical: Disable libpsl which requires meson build system
# This prevents build failures on systems without meson installed
set(CPR_USE_SYSTEM_LIB_PSL OFF CACHE BOOL "Use system libpsl" FORCE)
set(CPR_CURL_USE_LIBPSL OFF CACHE BOOL "Use libpsl in curl" FORCE)

# Configure curl options to disable libpsl
set(CURL_DISABLE_LIBPSL ON CACHE BOOL "Disable libpsl in curl" FORCE)
set(CURL_USE_LIBPSL OFF CACHE BOOL "Don't use libpsl" FORCE)

message(STATUS "Fetching CPR...")

FetchContent_Declare(
  cpr
  GIT_REPOSITORY "https://github.com/libcpr/cpr"
  GIT_TAG 1.12.0
  GIT_SHALLOW TRUE
  PATCH_COMMAND ${CMAKE_COMMAND} -E echo "Patching CPR to skip libpsl"
)

# Manually populate to apply patch
FetchContent_GetProperties(cpr)
if(NOT cpr_POPULATED)
  FetchContent_Populate(cpr)
  
  # Create a stub libpsl.cmake to prevent meson error
  file(WRITE "${cpr_SOURCE_DIR}/cmake/libpsl.cmake" "# libpsl disabled\n")
  
  add_subdirectory(${cpr_SOURCE_DIR} ${cpr_BINARY_DIR})
endif()

# Platform-specific source files
set(PLATFORM_SOURCES "")
if(APPLE)
    list(APPEND PLATFORM_SOURCES
        src/native/source/mac/shortcut.mm
        src/native/source/mac/clipboard.mm
        src/native/source/mac/app-controller.mm
        src/native/source/mac/menubar-controller.mm
        src/native/source/mac/window-wrapper.mm
    )
elseif(WIN32)
    list(APPEND PLATFORM_SOURCES
        src/native/source/win/shortcut.cpp
        src/native/source/win/clipboard.cpp
        src/native/source/win/app-controller.cpp
        src/native/source/win/menubar-controller.cpp
        src/native/source/win/window-wrapper.cpp
        src/native/source/win/resource-loader.cpp
    )
    
    # Generate Windows resource file for embedded web resources
    set(WEB_RESOURCES_DIR "${CMAKE_BINARY_DIR}/Resources")
    set(GENERATED_RC_FILE "${CMAKE_BINARY_DIR}/web-resources.rc")
    set(GENERATED_HEADER_FILE "${CMAKE_SOURCE_DIR}/src/native/resource/win/resource-ids.h")
    
    # Ensure the Resources directory exists (even if empty) to avoid build errors
    file(MAKE_DIRECTORY "${WEB_RESOURCES_DIR}")
    
    # Generate initial resource files at configure time
    # This ensures they exist even if web resources haven't been built yet
    execute_process(
        COMMAND ${CMAKE_COMMAND}
            -DWEB_RESOURCES_DIR=${WEB_RESOURCES_DIR}
            -DOUTPUT_RC=${GENERATED_RC_FILE}
            -DOUTPUT_HEADER=${GENERATED_HEADER_FILE}
            -P ${CMAKE_SOURCE_DIR}/cmake/GenerateResourceFile.cmake
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        RESULT_VARIABLE GEN_RESULT
        OUTPUT_VARIABLE GEN_OUTPUT
        ERROR_VARIABLE GEN_ERROR
    )
    
    if(NOT GEN_RESULT EQUAL 0)
        message(WARNING "Failed to generate resource files: ${GEN_ERROR}")
    else()
        message(STATUS "Generated resource files at configure time")
    endif()
    
    # Create a custom target to regenerate resources when needed
    # This is simpler than using add_custom_command with dependencies
    add_custom_target(generate_web_resources
        COMMAND ${CMAKE_COMMAND}
            -DWEB_RESOURCES_DIR=${WEB_RESOURCES_DIR}
            -DOUTPUT_RC=${GENERATED_RC_FILE}
            -DOUTPUT_HEADER=${GENERATED_HEADER_FILE}
            -P ${CMAKE_SOURCE_DIR}/cmake/GenerateResourceFile.cmake
        COMMENT "Regenerating web resources"
        VERBATIM
    )
    
    # Add the generated resource file to sources
    list(APPEND PLATFORM_SOURCES "${GENERATED_RC_FILE}")
    
    # Create Windows icon resource if needed
    set(WINDOWS_ICON_RC "${CMAKE_SOURCE_DIR}/src/native/resource/win/app.rc")
    if(EXISTS "${WINDOWS_ICON_RC}")
        list(APPEND PLATFORM_SOURCES "${WINDOWS_ICON_RC}")
    endif()
endif()

# Cross-platform source files
set(XPLAT_SOURCES
    src/native/source/xplat/main.cpp
    src/native/source/xplat/logger.cpp
    src/native/source/xplat/vault.cpp
    src/native/source/xplat/network.cpp
    src/native/source/xplat/webview-wrapper.cpp
)

# Create executable with appropriate bundle type
if(APPLE)
    add_executable(BYOAssistant MACOSX_BUNDLE ${XPLAT_SOURCES} ${PLATFORM_SOURCES})
else()
    add_executable(BYOAssistant WIN32 ${XPLAT_SOURCES} ${PLATFORM_SOURCES})
endif()

# Set C++ standard for the target (already set globally but being explicit)
set_target_properties(BYOAssistant PROPERTIES
    CXX_STANDARD 23
    CXX_STANDARD_REQUIRED ON
    CXX_EXTENSIONS OFF
)

# Set debug macro for debug builds
target_compile_definitions(BYOAssistant PRIVATE 
    $<$<CONFIG:Debug>:DEBUG=1>
    $<$<CONFIG:RelWithDebInfo>:DEBUG=1>
)

# Windows-specific configuration
if(WIN32)
    # Ensure web resources are generated before building
    add_dependencies(BYOAssistant generate_web_resources)
    
    # Define Windows version and features
    target_compile_definitions(BYOAssistant PRIVATE 
        WIN32_LEAN_AND_MEAN
        NOMINMAX
        _WIN32_WINNT=0x0A00  # Windows 10
        WINVER=0x0A00        # Windows 10
        _CRT_SECURE_NO_WARNINGS
        UNICODE
        _UNICODE
    )
    
    # Link Windows libraries
    target_link_libraries(BYOAssistant PRIVATE 
        shell32
        user32
        gdi32
        winspool
        comdlg32
        advapi32
        ole32
        oleaut32
        uuid
        odbc32
        odbccp32
        comctl32
        winmm
    )
    
    # Set Windows subsystem
    set_target_properties(BYOAssistant PROPERTIES
        WIN32_EXECUTABLE TRUE
        LINK_FLAGS "/SUBSYSTEM:WINDOWS"
    )
endif()

# Add include directories
target_include_directories(BYOAssistant PRIVATE 
    src/native/include
    src/native/resource/win
    ${keychain_SOURCE_DIR}/include
)

# Add macOS frameworks for native functionality
if(APPLE)
    find_library(COCOA_FRAMEWORK Cocoa REQUIRED)
    find_library(CARBON_FRAMEWORK Carbon REQUIRED)
    find_library(APPKIT_FRAMEWORK AppKit REQUIRED)
    find_library(QUARTZCORE_FRAMEWORK QuartzCore REQUIRED)
    find_library(WEBKIT_FRAMEWORK WebKit REQUIRED)
    find_library(SECURITY_FRAMEWORK Security REQUIRED)
    find_library(SYSTEMCONFIGURATION_FRAMEWORK SystemConfiguration REQUIRED)
    find_library(COREFOUNDATION_FRAMEWORK CoreFoundation REQUIRED)
    
    target_link_libraries(BYOAssistant PRIVATE 
        ${COCOA_FRAMEWORK} 
        ${CARBON_FRAMEWORK} 
        ${APPKIT_FRAMEWORK} 
        ${QUARTZCORE_FRAMEWORK} 
        ${WEBKIT_FRAMEWORK} 
        ${SECURITY_FRAMEWORK} 
        ${SYSTEMCONFIGURATION_FRAMEWORK} 
        ${COREFOUNDATION_FRAMEWORK}
    )
    
    # Configure Info.plist variables
    set(EXECUTABLE_NAME "BYOAssistant")
    set(VERSION_FULL "${PROJECT_VERSION}")
    set(COPYRIGHT_2025 "Copyright © 2025 BYOA. All rights reserved.")
    
    # Set minimum macOS version if not already set
    if(NOT CMAKE_OSX_DEPLOYMENT_TARGET)
        set(CMAKE_OSX_DEPLOYMENT_TARGET "13.3")
    endif()
    
    # Configure the plist file with variable substitution
    configure_file(
        "${CMAKE_SOURCE_DIR}/src/native/resource/mac/ai-assistant.plist"
        "${CMAKE_BINARY_DIR}/Info.plist"
        @ONLY
    )
    
    # Set bundle properties
    set_target_properties(BYOAssistant PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_INFO_PLIST "${CMAKE_BINARY_DIR}/Info.plist"
        MACOSX_BUNDLE_BUNDLE_NAME "BYO Assistant"
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.byoa.assistant"
        MACOSX_BUNDLE_BUNDLE_VERSION "${PROJECT_VERSION}"
        MACOSX_BUNDLE_SHORT_VERSION_STRING "${PROJECT_VERSION}"
        MACOSX_BUNDLE_COPYRIGHT "${COPYRIGHT_2025}"
        MACOSX_BUNDLE_ICON_FILE "AppIcon"
    )
    
    # Compile and copy asset catalog
    set(XCASSETS_PATH "${CMAKE_SOURCE_DIR}/src/native/resource/mac/app-icons.xcassets")
    add_custom_command(TARGET BYOAssistant POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_BUNDLE_DIR:BYOAssistant>/Contents/Resources"
        COMMAND xcrun actool 
            --compile "$<TARGET_BUNDLE_DIR:BYOAssistant>/Contents/Resources"
            --platform macosx
            --minimum-deployment-target ${CMAKE_OSX_DEPLOYMENT_TARGET}
            --app-icon AppIcon
            --output-partial-info-plist "${CMAKE_BINARY_DIR}/AssetCatalog-Info.plist"
            "${XCASSETS_PATH}"
        COMMENT "Compiling asset catalog"
        VERBATIM
    )
    
    # Copy web resources to bundle (if they exist)
    set(WEB_RESOURCES_SOURCE "${CMAKE_BINARY_DIR}/Resources")
    add_custom_command(TARGET BYOAssistant POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E echo "Checking for web resources in ${WEB_RESOURCES_SOURCE}..."
        COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_BUNDLE_DIR:BYOAssistant>/Contents/Resources"
        COMMAND ${CMAKE_COMMAND} -E echo "Copying web resources to app bundle..."
        COMMAND test -d "${WEB_RESOURCES_SOURCE}" && 
            ${CMAKE_COMMAND} -E copy_directory 
                "${WEB_RESOURCES_SOURCE}"
                "$<TARGET_BUNDLE_DIR:BYOAssistant>/Contents/Resources/" || 
            ${CMAKE_COMMAND} -E echo "No web resources found, skipping..."
        COMMENT "Copying web resources to app bundle (if available)"
        VERBATIM
    )
    
    # Print the application location after build
    add_custom_command(TARGET BYOAssistant POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E echo ""
        COMMAND ${CMAKE_COMMAND} -E echo "=========================================="
        COMMAND ${CMAKE_COMMAND} -E echo "Build Complete!"
        COMMAND ${CMAKE_COMMAND} -E echo "Application: $<TARGET_BUNDLE_DIR:BYOAssistant>"
        COMMAND ${CMAKE_COMMAND} -E echo "=========================================="
        COMMAND ${CMAKE_COMMAND} -E echo ""
        VERBATIM
    )
endif()

# Link libraries
target_link_libraries(BYOAssistant PRIVATE 
    saucer::saucer 
    spdlog::spdlog 
    keychain 
    cpr::cpr 
    nlohmann_json::nlohmann_json
)

# Installation rules (optional)
if(APPLE)
    install(TARGETS BYOAssistant
        BUNDLE DESTINATION .
        RUNTIME DESTINATION bin
    )
elseif(WIN32)
    install(TARGETS BYOAssistant
        RUNTIME DESTINATION .
    )
endif()

# Print build configuration summary
message(STATUS "")
message(STATUS "========================================")
message(STATUS "BYOAssistant Build Configuration")
message(STATUS "========================================")
message(STATUS "Version:           ${PROJECT_VERSION}")
message(STATUS "Build Type:        ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ Standard:      ${CMAKE_CXX_STANDARD}")
message(STATUS "Platform:          ${CMAKE_SYSTEM_NAME}")
message(STATUS "Compiler:          ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "Binary Directory:  ${CMAKE_BINARY_DIR}")
if(APPLE)
    message(STATUS "macOS Target:      ${CMAKE_OSX_DEPLOYMENT_TARGET}")
    message(STATUS "Bundle Output:     BYOAssistant.app")
elseif(WIN32)
    message(STATUS "Windows Target:    Windows 10+")
    message(STATUS "Executable:        BYOAssistant.exe")
endif()
message(STATUS "========================================")
message(STATUS "")
