import { state } from '../state.js';
import { renderChampionGrid, preloadSplashArts } from '../ui/components.js';

function lazyLoadMainBackground() {
    const bgElement = document.getElementById('main-background');
    if (!bgElement) return;

    const img = new Image();
    const imageUrl = '/assets/background.webp';
    
    img.onload = function() {
        // Giữ lại gradient đã có và thêm ảnh nền vào
        bgElement.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${imageUrl})`;
    };
    img.src = imageUrl;
}

// Quản lý việc tải dữ liệu từ server (ví dụ: danh sách tướng)
export async function loadCharacters() {
    try {
        const response = await fetch('/characters');
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
        // Tạm thời vô hiệu hóa preload tất cả ảnh để tránh lỗi quá tải.
        // Bạn nên xem xét một chiến lược preload thông minh hơn,
        // ví dụ: chỉ preload ảnh của các tướng phổ biến hoặc khi người dùng hover.
        // preloadSplashArts(state.uniqueCharacters);
        console.log("Characters loaded successfully.");
        lazyLoadMainBackground(); // Tải ảnh nền chính sau khi các thành phần cốt lõi đã xong
    } catch (error) {
        console.error("Failed to load characters:", error);
    }
}
