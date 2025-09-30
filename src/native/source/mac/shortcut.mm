#include "shortcut.hpp"

#import <Carbon/Carbon.h>
#import <Cocoa/Cocoa.h>

FourCharCode const kShortcutSignature = 'com.byoa.assistant';
static EventHandlerRef sEventHandler = NULL;

// Static dispatcher that handles the event and invokes the lambda
static OSStatus CarbonCallbackDispatcher(EventHandlerCallRef _InHandlerCallRef, EventRef _InEvent, void* _InUserData) {
    if (_InUserData) {
        auto callback = *reinterpret_cast<std::shared_ptr<std::function<OSStatus(EventHandlerCallRef, EventRef)>>*>(_InUserData);
        return (*callback)(_InHandlerCallRef, _InEvent);
    }
    return noErr;
}

bool InstallCommonEventHandler(std::shared_ptr<std::function<OSStatus(EventHandlerCallRef, EventRef)>> callback) {
    if (!sEventHandler) {
        EventTypeSpec hotKeyPressedSpec = { kEventClassKeyboard, kEventHotKeyPressed };

        OSStatus status = InstallEventHandler(GetApplicationEventTarget(),
                                              CarbonCallbackDispatcher,
                                              1,
                                              &hotKeyPressedSpec,
                                              reinterpret_cast<void*>(new std::shared_ptr<std::function<OSStatus(EventHandlerCallRef, EventRef)>>(callback)),
                                              &sEventHandler);
        if (status != noErr) {
            sEventHandler = NULL;
            NSLog(@"Failed to install event handler: %d", status);
            return NO;
        }
    }
    return YES;
}

Shortcut& Shortcut::getInstance() {
    static Shortcut instance;
    return instance;
}

bool Shortcut::registerHandler(Shortcut::ShortcutCallback&& callback) {
    EventHotKeyRef* _OutCarbonHotKey = 0;

    // Define the lambda function
    auto lambda = [callback](EventHandlerCallRef _InHandlerCallRef, EventRef _InEvent) -> OSStatus {
        if (GetEventClass(_InEvent) != kEventClassKeyboard)
            return noErr;

        EventHotKeyID hotKeyID;
        OSStatus status = GetEventParameter(_InEvent, kEventParamDirectObject, typeEventHotKeyID, NULL, sizeof(hotKeyID), NULL, &hotKeyID);
        if (status != noErr)
            return status;

        if (hotKeyID.signature != kShortcutSignature)
            return noErr;

        callback();

        return noErr;
    };

    auto cb = std::make_shared<std::function<OSStatus(EventHandlerCallRef, EventRef)>>(lambda);

    if (!InstallCommonEventHandler(cb))
        return false;

    static UInt32 sCarbonHotKeyID = 0;
	EventHotKeyID hotKeyID = { .signature = kShortcutSignature, .id = ++sCarbonHotKeyID };
    EventHotKeyRef carbonHotKey = NULL;
    if ( RegisterEventHotKey( kVK_Space
                            , cmdKey|shiftKey
                            , hotKeyID
                            , GetEventDispatcherTarget()
                            , kEventHotKeyExclusive
                            , &carbonHotKey
                             ) != noErr ) {
        return false;
    }

    return true;
}

bool Shortcut::unregisterHandler() {
    if ( sEventHandler ) {
        RemoveEventHandler( sEventHandler );
        sEventHandler = NULL;
    }
    return true;
}
