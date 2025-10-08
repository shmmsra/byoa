cmake_minimum_required(VERSION 3.16)
project(ai_assistant LANGUAGES CXX OBJCXX)

# Set project version
set(PROJECT_VERSION_MAJOR 1)
set(PROJECT_VERSION_MINOR 0)
set(PROJECT_VERSION_PATCH 0)
set(PROJECT_VERSION "${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}")

include(FetchContent)

# Fetch spdlog (change tag/version if you want a different release)
FetchContent_Declare(
  spdlog
  GIT_REPOSITORY https://github.com/gabime/spdlog.git
  GIT_TAG v1.15.3
)
FetchContent_MakeAvailable(spdlog)

# Fetch saucer for webview functionality
FetchContent_Declare(
  saucer
  GIT_REPOSITORY "https://github.com/saucer/saucer"
  GIT_TAG v7.0.0
)
FetchContent_MakeAvailable(saucer)

# Fetch keychain for OS credential storage
FetchContent_Declare(
  keychain
  GIT_REPOSITORY "https://github.com/hrantzsch/keychain"
  GIT_TAG v1.3.1
)
FetchContent_MakeAvailable(keychain)

# Fetch nlohmann/json for JSON parsing and creation
FetchContent_Declare(
  json
  GIT_REPOSITORY "https://github.com/nlohmann/json"
  GIT_TAG v3.11.3
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(json)

# Fetch CPR for HTTP requests
# Configure CPR options before fetching to avoid meson dependency
set(CPR_USE_SYSTEM_CURL OFF CACHE BOOL "Use system curl")
set(CPR_ENABLE_SSL ON CACHE BOOL "Enable SSL")
set(BUILD_CPR_TESTS OFF CACHE BOOL "Build CPR tests")
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build shared libraries")
set(CPR_BUILD_TESTS OFF CACHE BOOL "Build CPR tests")
set(CPR_BUILD_TESTS_SSL OFF CACHE BOOL "Build CPR SSL tests")

# Disable CPR examples and documentation
set(CPR_BUILD_EXAMPLES OFF CACHE BOOL "Don't build CPR examples")
set(CPR_BUILD_DOCS OFF CACHE BOOL "Don't build CPR documentation")

# Critical: Disable libpsl which requires meson
set(CPR_USE_SYSTEM_LIB_PSL OFF CACHE BOOL "Use system libpsl")
set(CPR_CURL_USE_LIBPSL OFF CACHE BOOL "Use libpsl in curl")

# Configure curl options to disable libpsl
set(CURL_DISABLE_LIBPSL ON CACHE BOOL "Disable libpsl in curl")
set(CURL_USE_LIBPSL OFF CACHE BOOL "Don't use libpsl")

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
    )
endif()

# Create executable with appropriate bundle type
if(APPLE)
    add_executable(ai_assistant MACOSX_BUNDLE 
        src/native/source/xplat/main.cpp
        src/native/source/xplat/logger.cpp
        src/native/source/xplat/vault.cpp
        src/native/source/xplat/network.cpp
        src/native/source/xplat/webview-wrapper.cpp
        ${PLATFORM_SOURCES}
    )
else()
    add_executable(ai_assistant WIN32
        src/native/source/xplat/main.cpp
        src/native/source/xplat/logger.cpp
        src/native/source/xplat/vault.cpp
        src/native/source/xplat/network.cpp
        src/native/source/xplat/webview-wrapper.cpp
        ${PLATFORM_SOURCES}
    )
endif()

set_property(TARGET ai_assistant PROPERTY CXX_STANDARD 23)

# Set debug macro for debug builds
target_compile_definitions(ai_assistant PRIVATE 
    $<$<CONFIG:Debug>:DEBUG=1>
    $<$<CONFIG:RelWithDebInfo>:DEBUG=1>
)

# Windows-specific configuration
if(WIN32)
    # Define Windows version and features
    target_compile_definitions(ai_assistant PRIVATE 
        WIN32_LEAN_AND_MEAN
        NOMINMAX
        _WIN32_WINNT=0x0A00  # Windows 10
        WINVER=0x0A00        # Windows 10
        _CRT_SECURE_NO_WARNINGS
    )
    
    # Link Windows libraries
    target_link_libraries(ai_assistant PRIVATE 
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
    )
endif()

# Add include directories
target_include_directories(ai_assistant PRIVATE 
    src/native/include
    ${keychain_SOURCE_DIR}/include
)

# Add macOS frameworks for native functionality
if(APPLE)
    find_library(COCOA_FRAMEWORK Cocoa)
    find_library(CARBON_FRAMEWORK Carbon)
    find_library(APPKIT_FRAMEWORK AppKit)
    find_library(QUARTZCORE_FRAMEWORK QuartzCore)
    find_library(WEBKIT_FRAMEWORK WebKit)
    find_library(SECURITY_FRAMEWORK Security)
    find_library(SYSTEMCONFIGURATION_FRAMEWORK SystemConfiguration)
    find_library(COREFOUNDATION_FRAMEWORK CoreFoundation)
    target_link_libraries(ai_assistant PRIVATE ${COCOA_FRAMEWORK} ${CARBON_FRAMEWORK} ${APPKIT_FRAMEWORK} ${QUARTZCORE_FRAMEWORK} ${WEBKIT_FRAMEWORK} ${SECURITY_FRAMEWORK} ${SYSTEMCONFIGURATION_FRAMEWORK} ${COREFOUNDATION_FRAMEWORK})
    
    # Configure Info.plist variables
    set(EXECUTABLE_NAME "ai_assistant")
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
    set_target_properties(ai_assistant PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_INFO_PLIST "${CMAKE_BINARY_DIR}/Info.plist"
        MACOSX_BUNDLE_BUNDLE_NAME "AI Assistant"
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.byoa.assistant"
        MACOSX_BUNDLE_BUNDLE_VERSION "${PROJECT_VERSION}"
        MACOSX_BUNDLE_SHORT_VERSION_STRING "${PROJECT_VERSION}"
        MACOSX_BUNDLE_COPYRIGHT "${COPYRIGHT_2025}"
    )
    
    # Add app icon if it exists (optional)
    if(EXISTS "${CMAKE_SOURCE_DIR}/src/native/resource/mac/app-icon.icns")
        set_target_properties(ai_assistant PROPERTIES
            MACOSX_BUNDLE_ICON_FILE "app-icon.icns"
        )
        # Copy icon to bundle resources
        add_custom_command(TARGET ai_assistant POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy
            "${CMAKE_SOURCE_DIR}/src/native/resource/mac/app-icon.icns"
            "$<TARGET_BUNDLE_DIR:ai_assistant>/Contents/Resources/"
        )
    endif()
    
    # Copy web resources to bundle (if they exist)
    add_custom_command(TARGET ai_assistant POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory_if_different
        "${CMAKE_SOURCE_DIR}/build/Resources"
        "$<TARGET_BUNDLE_DIR:ai_assistant>/Contents/Resources/"
        COMMENT "Copying web resources to app bundle"
    )
endif()

# Link libraries
target_link_libraries(ai_assistant PRIVATE saucer::saucer spdlog::spdlog keychain cpr::cpr nlohmann_json::nlohmann_json)
