import { ReactiveState } from './core/ReactiveState.js';
import { StatePersistence } from './utils/persistence.js';

/**
 * Global Reactive State
 * Automatically updates UI when state changes
 * Persists important data to localStorage
 */
export const state = new ReactiveState({
    socket: null,
    myRoom: null,
    myRole: null,
    myPlayerName: null,
    currentRoomState: null,
    characters: {},
    uniqueCharacters: [],
    preSelectedChamp: null,
    remotePreSelectedChamp: null,
    myPreDraftSelection: [],
    hasLoadedFromStorage: false,
    hasShownBanPickView: false,
    isDraftComplete: false,
});

// Setup state persistence
export const statePersistence = new StatePersistence(state, {
    key: 'ban-pick-wuwa-state',
    include: ['myPlayerName', 'myPreDraftSelection'], // Only persist these keys
    debounceTime: 500
});

// Restore state on load
statePersistence.restore();

// Enable debug mode in development (optional)
if (window.location.hostname === 'localhost') {
    state.enableDebug();
    console.log('[State] Debug mode enabled');
}

// Expose state globally for debugging
if (typeof window !== 'undefined') {
    window.__APP_STATE__ = state;
}
