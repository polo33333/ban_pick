import { initializeSocket } from './services/socket.js';
import { loadCharacters } from './services/api.js';
import { initializeLoginView } from './ui/loginView.js';
import { initializeDraftView } from './ui/draftView.js';
import { initializePreDraftView } from './ui/preDraftView.js';
import { DOM, CONFIG } from './constants.js';
import { preloadAllSpineAnimations } from './ui/components.js';

// Điểm khởi đầu của ứng dụng phía client
document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingPercentage = document.getElementById('loading-percentage');
    const loadingText = document.querySelector('.loading-text');

    let totalSteps = 0;
    let completedSteps = 0;

    function updateProgress(text = null) {
        const percentage = Math.round((completedSteps / totalSteps) * 100);
        loadingProgress.style.width = percentage + '%';
        loadingPercentage.textContent = percentage + '%';
        if (text && loadingText) {
            loadingText.textContent = text;
        }
    }

    try {
        // Calculate total steps (Live2D là optional)
        totalSteps = CONFIG.ENABLE_LIVE2D ? 4 : 3;

        // Step 1: Load components
        updateProgress('Đang tải giao diện...');
        await loadComponents();
        completedSteps++;
        updateProgress();

        // Step 2: Load characters data
        updateProgress('Đang tải dữ liệu tướng...');
        await loadCharacters();
        completedSteps++;
        updateProgress();

        // Step 3: Preload critical images
        updateProgress('Đang tải hình ảnh...');
        await preloadCriticalImages();
        completedSteps++;
        updateProgress();

        // Step 4: Preload spine animations (Live2D) - chỉ khi bật
        if (CONFIG.ENABLE_LIVE2D) {
            updateProgress('Đang tải hiệu ứng Live2D...');
            await preloadAllSpineAnimations((current, total) => {
                loadingText.textContent = `Đang tải Live2D (${current}/${total})...`;
            });
            completedSteps++;
        }
        updateProgress('Hoàn tất!');
        const lastPlayerName = localStorage.getItem('lastPlayerName');
        if (lastPlayerName && DOM.playerNameInput) {
            DOM.playerNameInput.value = lastPlayerName;
        }

        // Khởi tạo các thành phần
        initializeSocket();
        initializeLoginView();
        initializeDraftView();
        initializePreDraftView();

        // Hide loading screen and show login view
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                DOM.loginViewEl.style.display = 'block';
            }, 500);
        }, 300);

    } catch (error) {
        console.error('Error during initialization:', error);
        // Still show the app even if some resources fail to load
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            DOM.loginViewEl.style.display = 'block';
        }, 500);
    }
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

async function preloadCriticalImages() {
    const criticalImages = [
        // '/assets/background.png', // Removed in favor of CSS background
        '/assets/vs.png'
    ];

    const imagePromises = criticalImages.map(src => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                resolve(src); // Resolve anyway to not block loading
            };
            img.src = src;
        });
    });

    await Promise.all(imagePromises);

    // Apply background image after loading
    const bgElement = document.getElementById('main-background');
    if (bgElement) {
        // bgElement.style.backgroundImage = ... // Removed in favor of CSS background
    }
}

