import MessageController from '../controller/message-controller';
import { MESSAGE_TO_NATIVE } from './constants';

const TAGS_TO_HIDE = [
    'proxyusername',
    'proxy-user',
    'proxyuser',
    'user',
    'username',
    'proxy-password',
    'proxypassword',
    'password',
];

function hideSensitiveData(args) {
    const modifiedArgs = [...args];
    for (let i = 0; i < modifiedArgs.length; i += 1) {
        if (typeof modifiedArgs[i] === 'object') {
            TAGS_TO_HIDE.forEach((key) => {
                if (modifiedArgs[i] && Object.prototype.hasOwnProperty.call(modifiedArgs[i], key)
                    && typeof modifiedArgs[i][key] === 'string') {
                    modifiedArgs[i] = { ...modifiedArgs[i] };
                    modifiedArgs[i][key] = '****';
                }
            });
        }
    }
    return modifiedArgs;
}

class Logger {
    getStringFromArgs(args) {
        let str = '';
        for (let i = 0; i < args.length; i += 1) {
            if (typeof args[i] === 'string') {
                str += args[i];
            } else if (typeof args[i] === 'object') {
                str += JSON.stringify(args[i]);
            } else {
                str += String(args[i]);
            }
        }
        if (str.length > 10512) {
            str = `${str.substring(0, 10512)}.....<Truncated>`;
        }
        return str;
    }

    nativeLogger(level) {
        const loggerFn = console[level];
        return (...args) => {
            if ((window.logLevel === undefined) || (window.logLevel !== 0)) {
                const modifiedArgs = hideSensitiveData(args);
                loggerFn(...modifiedArgs);
                MessageController.sendMessageToNative(
                    MESSAGE_TO_NATIVE.LOG_MESSAGE,
                    {
                        logLevel: String(level).toUpperCase(),
                        message: this.getStringFromArgs(modifiedArgs),
                    }
                );
            }
        };
    }

    init() {
        console.debug = this.nativeLogger('debug');
        console.log = this.nativeLogger('log');
        console.info = this.nativeLogger('info');
        console.warn = this.nativeLogger('warn');
        console.error = this.nativeLogger('error');
    }
}

export default new Logger();
