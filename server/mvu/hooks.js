const { stateStore } = require('./state');

function subscribe(key, callback) {
    return stateStore.subscribe(key, callback);
}

function subscribeAll(callback) {
    return stateStore.subscribe('*', callback);
}

function once(key, callback) {
    return stateStore.once(key, callback);
}

function emit(key, data) {
    stateStore.emit(key, data);
}

function unsubscribe(key, callback) {
    if (stateStore.subscriptions[key]) {
        stateStore.subscriptions[key] = stateStore.subscriptions[key].filter(cb => cb !== callback);
    }
}

function unsubscribeAll() {
    stateStore.subscriptions = {};
}

module.exports = {
    subscribe,
    subscribeAll,
    once,
    emit,
    unsubscribe,
    unsubscribeAll
};