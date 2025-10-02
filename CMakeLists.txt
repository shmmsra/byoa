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

add_executable(ai_assistant MACOSX_BUNDLE 
    src/native/source/xplat/main.cpp
    src/native/source/xplat/logger.cpp
    src/native/source/mac/shortcut.mm
    src/native/source/mac/clipboard.mm
    src/native/source/mac/app-controller.mm
    src/native/source/mac/window-controller.mm
    src/native/source/mac/menubar-controller.mm
)

set_property(TARGET ai_assistant PROPERTY CXX_STANDARD 17)

# Set debug macro for debug builds
target_compile_definitions(ai_assistant PRIVATE 
    $<$<CONFIG:Debug>:DEBUG=1>
    $<$<CONFIG:RelWithDebInfo>:DEBUG=1>
)

# Add include directories
target_include_directories(ai_assistant PRIVATE src/native/include)

# Add macOS frameworks for native functionality
if(APPLE)
    find_library(COCOA_FRAMEWORK Cocoa)
    find_library(CARBON_FRAMEWORK Carbon)
    find_library(APPKIT_FRAMEWORK AppKit)
    find_library(QUARTZCORE_FRAMEWORK QuartzCore)
    find_library(WEBKIT_FRAMEWORK WebKit)
    target_link_libraries(ai_assistant PRIVATE ${COCOA_FRAMEWORK} ${CARBON_FRAMEWORK} ${APPKIT_FRAMEWORK} ${QUARTZCORE_FRAMEWORK} ${WEBKIT_FRAMEWORK})
    
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
target_link_libraries(ai_assistant PRIVATE saucer::saucer spdlog::spdlog)
