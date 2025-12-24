/**
 * Local Storage Persistence Layer
 * Automatically save and restore state from localStorage
 * 
 * @example
 * import { StatePersistence } from './utils/persistence.js';
 * 
 * const persistence = new StatePersistence(state, {
 *   key: 'ban-pick-state',
 *   include: ['myPlayerName', 'myPreDraftSelection'],
 *   debounceTime: 500
 * });
 */
export class StatePersistence {
    /**
     * @param {Proxy} state - Reactive state instance
     * @param {Object} options - Persistence options
     */
    constructor(state, options = {}) {
        this.state = state;
        this.options = {
            key: 'app-state',
            include: [], // Keys to persist (empty = all)
            exclude: ['socket', 'currentRoomState'], // Keys to exclude
            debounceTime: 500, // Debounce save operations
            ...options
        };

        this.saveTimeout = null;
        this._setupAutoSave();
    }

    /**
     * Setup automatic save on state changes
     * @private
     */
    _setupAutoSave() {
        // Subscribe to all state changes
        this.state.subscribe('*', (key) => {
            if (this._shouldPersist(key)) {
                this._debouncedSave();
            }
        });
    }

    /**
     * Check if a key should be persisted
     * @private
     */
    _shouldPersist(key) {
        // Check exclude list
        if (this.options.exclude.includes(key)) return false;

        // Check include list (if specified)
        if (this.options.include.length > 0) {
            return this.options.include.includes(key);
        }

        return true;
    }

    /**
     * Debounced save operation
     * @private
     */
    _debouncedSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.save();
        }, this.options.debounceTime);
    }

    /**
     * Save state to localStorage
     */
    save() {
        try {
            const stateToSave = {};
            const fullState = this.state.getState();

            Object.entries(fullState).forEach(([key, value]) => {
                if (this._shouldPersist(key)) {
                    stateToSave[key] = value;
                }
            });

            localStorage.setItem(this.options.key, JSON.stringify(stateToSave));
            console.log('[StatePersistence] State saved to localStorage');
        } catch (error) {
            console.error('[StatePersistence] Failed to save state:', error);
        }
    }

    /**
     * Restore state from localStorage
     * @returns {Object} Restored state object
     */
    restore() {
        try {
            const saved = localStorage.getItem(this.options.key);
            if (!saved) {
                console.log('[StatePersistence] No saved state found');
                return {};
            }

            const restoredState = JSON.parse(saved);
            console.log('[StatePersistence] State restored from localStorage');

            // Apply restored state
            this.state.setState(restoredState);

            return restoredState;
        } catch (error) {
            console.error('[StatePersistence] Failed to restore state:', error);
            return {};
        }
    }

    /**
     * Clear persisted state
     */
    clear() {
        try {
            localStorage.removeItem(this.options.key);
            console.log('[StatePersistence] Persisted state cleared');
        } catch (error) {
            console.error('[StatePersistence] Failed to clear state:', error);
        }
    }
}
