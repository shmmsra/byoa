const MODULE_ID = 'HistoryStore';

class HistoryStore {
    history = [];

    changeCallback = [];

    changeCallbackTimer = null;

    size() {
        return this.history.length;
    }

    top() {
        if (this.history.length === 0) {
            return null;
        }
        return this.history[this.history.length - 1];
    }

    // action: string, data: [{ type, data }]
    push(action, data) {
        this.history.push({
            action,
            data,
            timestamp: Date.now(),
        });

        // TODO: Should it be done synchronously?
        if (this.changeCallbackTimer) {
            clearTimeout(this.changeCallbackTimer);
            this.changeCallbackTimer = null;
        }
        this.changeCallbackTimer = setTimeout(() => this.changeCallback.forEach(cb => cb()), 0);
    }

    // action: string, data: [{ type, data }]
    replace(action, data) {
        this.history.pop();
        this.history.push({
            action,
            data,
            timestamp: Date.now(),
        });

        // TODO: Should it be done synchronously?
        if (this.changeCallbackTimer) {
            clearTimeout(this.changeCallbackTimer);
            this.changeCallbackTimer = null;
        }
        this.changeCallbackTimer = setTimeout(() => this.changeCallback.forEach(cb => cb()), 0);
    }

    pop() {
        if (this.history.length < 2) {
            return null;
        }
        this.history.pop();

        // TODO: Should it be done synchronously?
        if (this.changeCallbackTimer) {
            clearTimeout(this.changeCallbackTimer);
            this.changeCallbackTimer = null;
        }
        this.changeCallbackTimer = setTimeout(() => this.changeCallback.forEach(cb => cb()), 0);
    }

    clear() {
        this.history = [];

        // TODO: Should it be done synchronously?
        if (this.changeCallbackTimer) {
            clearTimeout(this.changeCallbackTimer);
            this.changeCallbackTimer = null;
        }
        this.changeCallbackTimer = setTimeout(() => this.changeCallback.forEach(cb => cb()), 0);
    }

    on(event, callback) {
        if (event === 'change') {
            if (!this.changeCallback.some(callback)) {
                this.changeCallback.push(callback);
                return true;
            }
        }
        return false;
    }

    off(event, callback) {
        if (event === 'change') {
            if (this.changeCallback.some(callback)) {
                this.changeCallback = this.changeCallback.filter(cb => cb !== callback);
                return true;
            }
        }
        return false;
    }
}

const historyStore = new HistoryStore();
window.debug = window.debug || {};
window.debug.HistoryStore = historyStore;
export default historyStore;
