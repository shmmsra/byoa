import React from 'react';
import { createRoot } from 'react-dom/client';
import Assistant from './components/assistant/index.jsx';
import MessageController from './controller/message-controller';
import AssistantStore from './stores/assistant-store.js';
import Logger from './utils/logger.js';
import { GLOBAL_PLAYER_ID, MESSAGE_TO_NATIVE } from './utils/constants.js';

const COMPONENT_ID = 'Assistant';
window.Typekit = true;

Logger.init();
AssistantStore.init();
MessageController.init();

document.onkeydown = function(evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key === "Escape" || evt.key === "Esc");
    } else {
        isEscape = (evt.keyCode === 27);
    }
    if (isEscape) {
        MessageController.sendMessageToNative(MESSAGE_TO_NATIVE.CLOSE_WINDOW);
    }
};

const root = createRoot(document.getElementById('root'));
root.render(<Assistant />);

setTimeout(() => {
    console.log(`${GLOBAL_PLAYER_ID}: ${COMPONENT_ID}: sending js ready message to native`);
    MessageController.sendMessageToNative(MESSAGE_TO_NATIVE.DOM_READY);

    // Set the default window size only at the beginning while in dev mode
    if (AssistantStore.devMode) {
        AssistantStore.setWindowDimensions(800, 800);
    }
}, 200);
