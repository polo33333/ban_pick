import { initializeSocket } from './services/socket.js';
import { loadCharacters } from './services/api.js';
import { initializeLoginView } from './ui/loginView.js';
import { initializeDraftView } from './ui/draftView.js';
import { initializePreDraftView } from './ui/preDraftView.js';
import { DOM, CONFIG } from './constants.js';
import { preloadAllSpineAnimations, preloadIcons, preloadBackgrounds, preloadElements } from './ui/uiHelpers.js';
import { initSettingsPanel } from './ui/settings.js';
import { initChat } from './ui/chat.js';

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
        // Calculate total steps
        totalSteps = 6;

        // Step 1: Load components
        updateProgress('Đang tải giao diện...');
        await loadComponents();
        completedSteps++;
        updateProgress();

        // Step 2: Load characters data
        updateProgress('Đang tải dữ liệu tướng...');
        const characters = await loadCharacters();
        completedSteps++;
        updateProgress();

        // Step 3: Preload critical images
        updateProgress('Đang tải hình ảnh...');
        await preloadCriticalImages();
        completedSteps++;
        updateProgress();

        // Step 4: Preload character icons
        updateProgress('Đang tải icons...');
        await preloadIcons(characters, (loaded, total, name) => {
            updateProgress(`Đang tải icons... ${loaded}/${total}`);
        });
        completedSteps++;
        updateProgress();

        // Step 5: Preload character backgrounds
        updateProgress('Đang tải backgrounds...');
        await preloadBackgrounds(characters, (loaded, total, name) => {
            updateProgress(`Đang tải backgrounds... ${loaded}/${total}`);
        });
        completedSteps++;
        updateProgress();

        // Step 6: Preload element icons
        updateProgress('Đang tải elements...');
        await preloadElements((loaded, total, name) => {
            updateProgress(`Đang tải elements... ${loaded}/${total}`);
        });
        completedSteps++;
        updateProgress();

        // Step 7: Preload Live2D animations
        // if (CONFIG.ENABLE_LIVE2D) {
        //     updateProgress('Đang tải Live2D...');
        //     await preloadAllSpineAnimations(characters, (loaded, total, name) => {
        //         updateProgress(`Đang tải Live2D... ${loaded}/${total}`);
        //     });
        // }
        // completedSteps++;
        // updateProgress();

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
        initSettingsPanel();
        initChat();

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
        { id: 'login-view', url: '/views/login.html' },
        { id: 'pre-draft-selection-view', url: '/views/pre_draft.html' },
        { id: 'teams-container', url: '/views/ban_pick.html' },
        { id: 'host-controls-container', url: '/views/host-controls.html' },
        { id: 'chat-widget-container', url: '/views/chat-widget.html' }
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
        '/assets/background.webp', // Removed in favor of CSS background
        // '/assets/vs.png'
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

