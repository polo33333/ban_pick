import { state } from '../state.js';
import { renderChampionGrid, preloadSplashArts } from '../ui/uiHelpers.js';

// function lazyLoadMainBackground() { ... } // Removed in favor of CSS background

// Quản lý việc tải dữ liệu từ server (ví dụ: danh sách tướng)
export async function loadCharacters() {
    try {
        const response = await fetch('/api/characters');
        const rawCharacters = await response.json();

        const seen = new Set();
        state.uniqueCharacters = Object.values(rawCharacters).filter(char => {
            const duplicate = seen.has(char.en);
            seen.add(char.en);
            return !duplicate;
        }).sort((a, b) => a.en.localeCompare(b.en));

        state.characters = state.uniqueCharacters.reduce((obj, char) => {
            obj[char.en] = char;
            return obj;
        }, {});

        renderChampionGrid(state.uniqueCharacters);
        // preloadSplashArts(state.uniqueCharacters);
        console.log("Characters loaded successfully.");
        // lazyLoadMainBackground(); // Removed

        return state.characters; // Return characters for preloading
    } catch (error) {
        console.error("Failed to load characters:", error);
        return {}; // Return empty object on error
    }
}
