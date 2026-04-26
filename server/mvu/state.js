class StateStore {
    constructor() {
        this.state = {};
        this.subscriptions = {};
        this.batchUpdates = false;
        this.batchQueue = [];
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.emit(key, { oldValue, newValue: value, key });
        return { oldValue, newValue: value };
    }

    delete(key) {
        const oldValue = this.state[key];
        if (oldValue !== undefined) {
            delete this.state[key];
            this.emit(key, { oldValue, newValue: undefined, key, deleted: true });
        }
        return oldValue;
    }

    getAll() {
        return { ...this.state };
    }

    has(key) {
        return key in this.state;
    }

    keys() {
        return Object.keys(this.state);
    }

    clear() {
        const keys = Object.keys(this.state);
        this.state = {};
        for (const key of keys) {
            this.emit(key, { oldValue: undefined, newValue: undefined, key, cleared: true });
        }
    }

    subscribe(key, callback) {
        if (!this.subscriptions[key]) {
            this.subscriptions[key] = [];
        }
        this.subscriptions[key].push(callback);
        return () => {
            this.subscriptions[key] = this.subscriptions[key].filter(cb => cb !== callback);
        };
    }

    subscribeAll(callback) {
        return this.subscribe('*', callback);
    }

    emit(key, data) {
        if (this.subscriptions[key]) {
            for (const callback of this.subscriptions[key]) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Subscription error for ${key}:`, e);
                }
            }
        }
        if (this.subscriptions['*']) {
            for (const callback of this.subscriptions['*']) {
                try {
                    callback({ ...data, key });
                } catch (e) {
                    console.error(`Subscription error for *:`, e);
                }
            }
        }
    }

    once(key, callback) {
        const unsubscribe = this.subscribe(key, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    }

    startBatch() {
        this.batchUpdates = true;
        this.batchQueue = [];
    }

    endBatch() {
        this.batchUpdates = false;
        const updates = this.batchQueue;
        this.batchQueue = [];
        return updates;
    }

    isBatch() {
        return this.batchUpdates;
    }
}

const stateStore = new StateStore();

module.exports = { StateStore, stateStore };