import MessageController from '../controller/message-controller';
import HistoryStore from './history';
import {
    GLOBAL_PLAYER_ID,
    MESSAGE_FROM_NATIVE,
    MESSAGE_TO_NATIVE,
    WINDOW_SIZE,
} from '../utils/constants';

const MODULE_ID = 'AssistantStore';

class AssistantStore {
    devMode = false;

    userProfile = {
        accessToken: null,
    };

    init = () => {
        const url = new URL(document.location);
        const appContextInfo = {
            platform: String(url.searchParams.get('platform')).toLowerCase(),
            build: String(url.searchParams.get('build')).toLowerCase(),
            env: String(url.searchParams.get('env')).toLowerCase(),
        };

        this.setDevMode((window.localStorage.getItem('devMode') === 'true'));

        Object.defineProperty(window, 'appContext', {
            value: appContextInfo,
            writable: false,
        });
        Object.defineProperty(window.appContext, 'platform', {
            value: appContextInfo.platform,
            writable: false,
        });
        Object.defineProperty(window.appContext, 'build', {
            value: (appContextInfo.build === 'production') ? 'production' : 'debug',
            writable: false,
        });
        Object.defineProperty(window.appContext, 'env', {
            value: appContextInfo.env,
            writable: false,
        });
    }

    setDevMode = (isPinned) => {
        this.devMode = isPinned;
        window.localStorage.setItem('devMode', String(isPinned));
        MessageController.sendMessageToNative(MESSAGE_TO_NATIVE.UPDATE_APP_CONTEXT, { context: { devMode: isPinned } });
    }

    async getClipboardData() {
        console.info(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: getClipboardData: start`);
        try {
            const clipboardContents = await navigator.clipboard.read();
            for (const item of clipboardContents) {
                for (const i of item.types) {
                    if (i.startsWith('image/')) {
                        const blob = await item.getType(i);
                        console.info(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: getClipboardData: data type: ${i}`);
                        return [{
                            type: 'image',
                            data: blob,
                        }];
                    } else if (i.startsWith('text/plain')) {
                        const blob = await item.getType(i);
                        const text = await blob.text();
                        console.info(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: getClipboardData: data type: ${i}`);
                        return [{
                            type: 'text',
                            data: text,
                        }];
                    }
                }
            }
        } catch (error) {
            console.error(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: getClipboardData: error:`, error);
        }
        return null;
    }

    async setClipboardData(data) {
        console.info(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: setClipboardData: start`);
        const clipboardItems = [];

        if (data[0].type === 'text') {
            clipboardItems.push(new ClipboardItem({ 'text/plain': new Blob([data[0].data], { type: 'text/plain' }) }));
        } else if (data[0].type === 'image') {
            clipboardItems.push(new ClipboardItem({ 'image/png': data[0].data }));
        }

        if (clipboardItems.length > 0) {
            try {
                await navigator.clipboard.write(clipboardItems);
                MessageController.sendMessageToNative(MESSAGE_TO_NATIVE.CLOSE_WINDOW);
                MessageController.sendMessageToNative(MESSAGE_TO_NATIVE.PASTE_CONTENT, { type: data[0].type, data: 'something' });
                return true;
            } catch (err) {
                console.error(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: setClipboardData:`, 'Failed to copy text or image:', err);
            }
        }

        return false;
    }

    getUserProfile = () => {
        return this.userProfile;
    }

    getImageDimensions(width, height) {
        let scaleW = 1;
        let scaleH = 1;
        let scale = 1;
        let newWidth = width;
        let newHeight = height;

        scaleW = (width > WINDOW_SIZE.MAX_WIDTH) ? (WINDOW_SIZE.MAX_WIDTH / width) : 1;
        scaleH = (height > WINDOW_SIZE.MAX_HEIGHT) ? (WINDOW_SIZE.MAX_HEIGHT / height) : 1;
        scale = Math.min(scaleW, scaleH);
        newWidth = Math.max(Math.floor(width * scale), WINDOW_SIZE.MIN_WIDTH);
        newHeight = Math.max(Math.floor(height * scale), WINDOW_SIZE.MIN_HEIGHT);

        // If no scale down was needed then only check for scale up
        if (scale === 1) {
            scaleW = (width < WINDOW_SIZE.MIN_WIDTH) ? (WINDOW_SIZE.MIN_WIDTH / width) : 1;
            scaleH = (height < WINDOW_SIZE.MIN_HEIGHT) ? (WINDOW_SIZE.MIN_HEIGHT / height) : 1;
            scale = Math.max(scaleW, scaleH);
            newWidth = Math.min(Math.floor(width * scale), WINDOW_SIZE.MAX_WIDTH);
            newHeight = Math.min(Math.floor(height * scale), WINDOW_SIZE.MAX_HEIGHT);
        }

        const oldSize = { width, height };
        const newSize = { width: newWidth, height: newHeight };
        console.info(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: getImageDimensions: oldSize:`, oldSize, 'newSize:', newSize);
        return newSize;
    }

    setWindowDimensions(width = WINDOW_SIZE.DEFAULT_WIDTH, height = WINDOW_SIZE.DEFAULT_HEIGHT) {
        const { width: w, height: h } = this.getImageDimensions(width, height);

        const size = {
            width: w + WINDOW_SIZE.LEFT_PADDING + WINDOW_SIZE.RIGHT_PADDING,
            height: h + WINDOW_SIZE.HEADER_HEIGHT + WINDOW_SIZE.FOOTER_HEIGHT,
        };
        console.info(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: setWindowDimensions: new window size:`, size);

        if (!this.devMode) {
            MessageController.sendMessageToNative(MESSAGE_TO_NATIVE.RESIZE_WINDOW, { size });
        }
        return size;
    }

    handleMessage = (message, data = {}) => {
        console.info(`${GLOBAL_PLAYER_ID}: ${MODULE_ID}: handleMessage: message: ${message}`);
        switch (message) {
        case MESSAGE_FROM_NATIVE.SHOW_VIEW:
            HistoryStore.clear();
            this.getClipboardData().then((clipboardData) => {
                HistoryStore.push('', clipboardData);
            });
            break;
        case MESSAGE_FROM_NATIVE.HIDE_VIEW:
            HistoryStore.clear();
            break;
        case MESSAGE_FROM_NATIVE.UPDATE_USER_PROFILE:
            this.userProfile = data.profileData || {
                accessToken: null,
            };
            break;
        default:
        }
        return true;
    }
}

const assistantStore = new AssistantStore();
window.debug = window.debug || {};
window.debug.AssistantStore = assistantStore;
export default assistantStore;
