import { GLOBAL_PLAYER_ID, MESSAGE_TO_NATIVE } from '../utils/constants';
import AssistantStore from '../stores/assistant-store';

const COMPONENT_ID = 'MessageController';

class MessageController {
    init = () => {
        console.info(`${GLOBAL_PLAYER_ID}: ${COMPONENT_ID}: init()`);
        window.messageFromNative = this.messageFromNative;
    }

    messageFromNative = (message, jsonDataString) => {
        console.info(`${GLOBAL_PLAYER_ID}: ${COMPONENT_ID}: messageFromNative(): message=${message}`);
        let data = jsonDataString;
        if (typeof jsonDataString === 'string') {
            try {
                data = JSON.parse(jsonDataString);
            } catch (e) {
                data = jsonDataString;
            }
        }
        AssistantStore.handleMessage(message, data);
        return true;
    }

    sendMessageToNative = (message, jsonData = null, async = true) => {
        if (message !== MESSAGE_TO_NATIVE.LOG_MESSAGE) {
            console.info(`${GLOBAL_PLAYER_ID}: ${COMPONENT_ID}: sendMessageToNative(): message=${message}`);
        }
        try {
            let messageData = { data: jsonData } || '';
            if (typeof messageData === 'object') {
                // messageData = json2xml(messageData);
            }
            if (async) {
                return window.sendAsyncMessageToNative(message, messageData);
            } else {
                return window.sendSyncMessageToNative(message, messageData);
            }
        } catch (e) {
            if (message !== MESSAGE_TO_NATIVE.LOG_MESSAGE) {
                console.log(`${GLOBAL_PLAYER_ID}: ${COMPONENT_ID}: sendMessageToNative(): error while sending message=${message} to native, error=`, e);
            }
        }
        return true;
    }
}

const messageController = new MessageController();
window.debug = window.debug || {};
window.debug.MessageController = messageController;
export default messageController;
