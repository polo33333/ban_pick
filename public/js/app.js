import { initializeSocket } from './services/socket.js';
import { loadCharacters } from './services/api.js';
import { initializeLoginView } from './ui/loginView.js';
import { initializeDraftView } from './ui/draftView.js';
import { initializePreDraftView } from './ui/preDraftView.js';
import { DOM } from './constants.js';

// Điểm khởi đầu của ứng dụng phía client
document.addEventListener('DOMContentLoaded', async () => {
    // Load components first
    await loadComponents();

    // Tải lại tên người chơi đã sử dụng lần cuối từ localStorage
    const lastPlayerName = localStorage.getItem('lastPlayerName');
    if (lastPlayerName && DOM.playerNameInput) {
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

async function loadComponents() {
    const components = [
        { id: 'login-view', url: '/components/login.html' },
        { id: 'pre-draft-selection-view', url: '/components/pre_draft.html' },
        { id: 'teams-container', url: '/components/ban_pick.html' }
    ];

    for (const component of components) {
        try {
            const response = await fetch(component.url);
            if (!response.ok) throw new Error(`Failed to load ${component.url}`);
            const html = await response.text();
            const element = document.getElementById(component.id);
            if (element) {
                element.innerHTML = html;
            } else {
                console.error(`Element with id ${component.id} not found`);
            }
        } catch (error) {
            console.error(error);
        }
    }
}
