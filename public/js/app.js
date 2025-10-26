import { initializeSocket } from './services/socket.js';
import { loadCharacters } from './services/api.js';
import { initializeLoginView } from './ui/loginView.js';
import { initializeDraftView } from './ui/draftView.js';
import { initializePreDraftView } from './ui/preDraftView.js';
import { DOM } from './constants.js';

// Điểm khởi đầu của ứng dụng phía client
document.addEventListener('DOMContentLoaded', () => {
    // Tải lại tên người chơi đã sử dụng lần cuối từ localStorage
    const lastPlayerName = localStorage.getItem('lastPlayerName');
    if (lastPlayerName) {
        DOM.playerNameInput.value = lastPlayerName;
    }

    // Khởi tạo các thành phần
    initializeSocket();
    initializeLoginView();
    initializeDraftView();
    initializePreDraftView();

    // Tải dữ liệu tướng khi trang được load
    loadCharacters();
});
