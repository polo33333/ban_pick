/**
 * Reactive State Management với ES6 Proxy
 * Auto-update UI khi state thay đổi
 * 
 * @example
 * const state = new ReactiveState({ count: 0 });
 * state.subscribe('count', (newVal, oldVal) => {
 *   console.log(`Count changed from ${oldVal} to ${newVal}`);
 * });
 * state.count = 5; // Triggers subscriber
 */
export class ReactiveState {
    /**
     * @param {Object} initialState - Initial state object
     */
    constructor(initialState = {}) {
        this._state = initialState;
        this._listeners = new Map();
        this._history = [];
        this._maxHistory = 50;
        this._debugMode = false;

        return new Proxy(this._state, {
            get: (target, prop) => {
                // Expose API methods
                if (prop === 'subscribe') return this.subscribe.bind(this);
                if (prop === 'unsubscribe') return this.unsubscribe.bind(this);
                if (prop === 'getState') return () => ({ ...this._state });
                if (prop === 'setState') return this.setState.bind(this);
                if (prop === 'undo') return this.undo.bind(this);
                if (prop === 'getHistory') return () => [...this._history];
                if (prop === 'clearHistory') return this.clearHistory.bind(this);
                if (prop === 'enableDebug') return () => { this._debugMode = true; };
                if (prop === 'disableDebug') return () => { this._debugMode = false; };

                return target[prop];
            },
            set: (target, prop, value) => {
                const oldValue = target[prop];

                // Skip if value hasn't changed
                if (oldValue === value) return true;

                // Save to history
                this._saveHistory(prop, oldValue, value);

                // Update state
                target[prop] = value;

                // Debug logging
                if (this._debugMode) {
                    console.log(`[ReactiveState] ${prop}:`, oldValue, '->', value);
                }

                // Notify listeners
                this._notify(prop, value, oldValue);

                return true;
            }
        });
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch, or '*' for all changes
     * @param {Function} callback - Callback function (newValue, oldValue) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => this.unsubscribe(key, callback);
    }

    /**
     * Unsubscribe from state changes
     * @param {string} key - State key
     * @param {Function} callback - Callback to remove
     */
    unsubscribe(key, callback) {
        this._listeners.get(key)?.delete(callback);
    }

    /**
     * Notify all listeners for a key
     * @private
     */
    _notify(key, newValue, oldValue) {
        // Notify specific key listeners
        this._listeners.get(key)?.forEach(cb => {
            try {
                cb(newValue, oldValue);
            } catch (error) {
                console.error(`[ReactiveState] Error in listener for "${key}":`, error);
            }
        });

        // Notify wildcard listeners
        this._listeners.get('*')?.forEach(cb => {
            try {
                cb(key, newValue, oldValue);
            } catch (error) {
                console.error('[ReactiveState] Error in wildcard listener:', error);
            }
        });
    }

    /**
     * Batch update multiple state properties
     * @param {Object} updates - Object with key-value pairs to update
     */
    setState(updates) {
        if (typeof updates !== 'object' || updates === null) {
            throw new Error('setState requires an object');
        }

        Object.entries(updates).forEach(([key, value]) => {
            this._state[key] = value;
        });
    }

    /**
     * Save state change to history
     * @private
     */
    _saveHistory(prop, oldValue, newValue) {
        this._history.push({
            prop,
            oldValue,
            newValue,
            timestamp: Date.now()
        });

        // Limit history size
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        }
    }

    /**
     * Undo last state change
     * @returns {boolean} True if undo was successful
     */
    undo() {
        const lastChange = this._history.pop();
        if (!lastChange) {
            console.warn('[ReactiveState] No history to undo');
            return false;
        }

        // Restore old value without triggering listeners
        this._state[lastChange.prop] = lastChange.oldValue;

        // Manually notify listeners
        this._notify(lastChange.prop, lastChange.oldValue, lastChange.newValue);

        return true;
    }

    /**
     * Clear history
     */
    clearHistory() {
        this._history = [];
    }
}
