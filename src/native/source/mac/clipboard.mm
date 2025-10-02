#include "clipboard.hpp"

#import <Cocoa/Cocoa.h>
#import <AppKit/NSPasteboard.h>
#import <AppKit/NSImage.h>
#import <AppKit/AppKit.h>

Clipboard& Clipboard::getInstance() {
    static Clipboard instance;
    return instance;
}

bool Clipboard::hasString()
{
    // Access the general pasteboard
    NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];

    // Get all types available on the pasteboard
    NSArray<NSPasteboardType> *types = [pasteboard types];

    // Iterate through the types and print them
    for (NSPasteboardType type in types) {
        NSLog(@"Type available on pasteboard: %@", type);
    }

    // Check if the pasteboard contains plain text
    BOOL containsPlainText = [pasteboard canReadItemWithDataConformingToTypes:@[(NSString *)kUTTypePlainText]];

    // Check if the pasteboard contains HTML
    if (@available(macOS 10.13, *)) {
        BOOL containsFileURL = [pasteboard canReadItemWithDataConformingToTypes:@[NSPasteboardTypeFileURL]];

        // If pasteboard contains plain text but not FileURL (e.g., images copied from Apple Notes are also FileURLs)
        if (containsPlainText && !containsFileURL) {
            return true;
        }
    } else {
        BOOL containsFileURL = [pasteboard canReadItemWithDataConformingToTypes:@[(NSString *)@"public.file-url"]];

        // If pasteboard contains plain text but not FileURL (e.g., images copied from Apple Notes are also FileURLs)
        if (containsPlainText && !containsFileURL) {
            return true;
        }
    }

    return false;
}

bool Clipboard::hasImage()
{
    // Access the general pasteboard
    NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];

    // Check if a specific type is available
    BOOL isPNG = [pasteboard canReadItemWithDataConformingToTypes:@[NSPasteboardTypePNG]];
    BOOL isJPEG = [pasteboard canReadItemWithDataConformingToTypes:@[(NSString *)@"public.jpeg"]];
    BOOL isTIFF = [pasteboard canReadItemWithDataConformingToTypes:@[NSPasteboardTypeTIFF]];

    if (isPNG || isJPEG || isTIFF) {
        return true;
    }

    return false;
}

std::string Clipboard::getString()
{
    NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
    NSArray *classArray = [NSArray arrayWithObject:[NSString class]];
    NSDictionary *options = [NSDictionary dictionary];

    if( [pasteboard canReadObjectForClasses:classArray options:options] ) {
        NSArray *objectsToPaste = [pasteboard readObjectsForClasses:classArray options:options];
        NSString *text = [objectsToPaste firstObject];
        if(!text)
            return std::string();
        else
            return std::string([text UTF8String]);
    } else {
        return std::string();
    }
}

bool Clipboard::writeText(const std::string& text) {
    @autoreleasepool {
        NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
        [pasteboard clearContents];
        NSString *string = [NSString stringWithUTF8String:text.c_str()];
        return [pasteboard setString:string forType:NSPasteboardTypeString];
    }
}

std::string Clipboard::readText() {
    @autoreleasepool {
        NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
        NSString *string = [pasteboard stringForType:NSPasteboardTypeString];
        if (string) {
            return std::string([string UTF8String]);
        }
        return std::string();
    }
}

void Clipboard::clear() {
    @autoreleasepool {
        NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
        [pasteboard clearContents];
    }
}
