// Settings Panel Tab Management

import { CONFIG } from '../constants.js';
import { state } from '../state.js';

/**
 * Initialize Tools Card Toggles
 */
function initToolsCardToggles() {
    const headers = document.querySelectorAll('.tools-card-header');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.tools-card');
            if (card) {
                card.classList.toggle('collapsed');
            }
        });
    });
}

/**
 * Initialize settings panel tab functionality
 */
export function initSettingsPanel() {
    const tabs = document.querySelectorAll('.settings-tab');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = tab.dataset.tab;

            // Handle Exit tab separately
            if (targetTab === 'exit') {
                e.preventDefault();
                if (confirm('Bạn có chắc chắn muốn thoát khỏi phòng và về trang chủ?')) {
                    window.location.reload();
                }
                return;
            }

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Initialize toggle switches
    initToggleSwitches();
    initToolsCardToggles();

    // Load saved settings
    loadSettings();

    // Initialize room ID handlers
    initRoomIdHandlers();

    // Initialize Lucky Wheel
    initLuckyWheel();

    // Initialize Utility Timer
    initUtilityTimer();

    // Handle gear button visibility when offcanvas opens/closes
    const offcanvasElement = document.getElementById('host-controls-panel');
    const gearButton = document.getElementById('host-controls-toggle');

    if (offcanvasElement && gearButton) {
        offcanvasElement.addEventListener('show.bs.offcanvas', () => {
            // Hide gear button when panel opens
            gearButton.style.opacity = '0';
            gearButton.style.pointerEvents = 'none';

            // Update room ID display when panel opens
            updateRoomIdDisplay();
        });

        offcanvasElement.addEventListener('hide.bs.offcanvas', () => {
            // Show gear button when panel closes
            gearButton.style.opacity = '1';
            gearButton.style.pointerEvents = 'auto';
        });
    }
}

/**
 * Initialize toggle switch functionality
 */
function initToggleSwitches() {
    const soundToggle = document.getElementById('toggle-sound');
    const live2dToggle = document.getElementById('toggle-live2d');
    const fullscreenToggle = document.getElementById('toggle-auto-fullscreen');

    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            CONFIG.ENABLE_SOUND = e.target.checked;
            saveSettings();
            console.log('Sound notifications:', CONFIG.ENABLE_SOUND ? 'Enabled' : 'Disabled');

            // Animation feedback
            animateToggle(e.target);
        });
    }

    if (live2dToggle) {
        live2dToggle.addEventListener('change', (e) => {
            CONFIG.ENABLE_LIVE2D = e.target.checked;
            saveSettings();
            console.log('Live2D animations:', CONFIG.ENABLE_LIVE2D ? 'Enabled' : 'Disabled');

            // Animation feedback
            animateToggle(e.target);
        });
    }

    if (fullscreenToggle) {
        fullscreenToggle.addEventListener('change', (e) => {
            CONFIG.AUTO_FULLSCREEN = e.target.checked;
            saveSettings();
            console.log('Auto fullscreen:', CONFIG.AUTO_FULLSCREEN ? 'Enabled' : 'Disabled');

            // Animation feedback
            animateToggle(e.target);
        });
    }
}

/**
 * Add animation feedback to toggle
 */
function animateToggle(toggleInput) {
    const slider = toggleInput.nextElementSibling;
    if (slider) {
        slider.style.transform = 'scale(0.95)';
        setTimeout(() => {
            slider.style.transform = 'scale(1)';
        }, 100);
    }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    const settings = {
        enableSound: CONFIG.ENABLE_SOUND,
        enableLive2D: CONFIG.ENABLE_LIVE2D,
        autoFullscreen: CONFIG.AUTO_FULLSCREEN,
    };
    localStorage.setItem('app-settings', JSON.stringify(settings));

    // If host, sync to clients
    if (state.myRole === 'host' && state.socket) {
        state.socket.emit('update-settings', { roomId: state.myRoom, settings });
    }
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);

            // Update CONFIG
            if (settings.enableSound !== undefined) {
                CONFIG.ENABLE_SOUND = settings.enableSound;
            }
            if (settings.enableLive2D !== undefined) {
                CONFIG.ENABLE_LIVE2D = settings.enableLive2D;
            }
            if (settings.autoFullscreen !== undefined) {
                CONFIG.AUTO_FULLSCREEN = settings.autoFullscreen;
            }

            // Update UI toggles
            const soundToggle = document.getElementById('toggle-sound');
            const live2dToggle = document.getElementById('toggle-live2d');
            const fullscreenToggle = document.getElementById('toggle-auto-fullscreen');

            if (soundToggle) {
                soundToggle.checked = CONFIG.ENABLE_SOUND;
            }
            if (live2dToggle) {
                live2dToggle.checked = CONFIG.ENABLE_LIVE2D;
            }
            if (fullscreenToggle) {
                fullscreenToggle.checked = CONFIG.AUTO_FULLSCREEN;
            }

            //console.log('Settings loaded:', settings);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

/**
 * Handle settings update from host
 */
export function handleSettingsUpdate(settings) {
    if (!settings) return;

    // Update CONFIG
    if (typeof settings.enableSound === 'boolean') CONFIG.ENABLE_SOUND = settings.enableSound;
    if (typeof settings.enableLive2D === 'boolean') CONFIG.ENABLE_LIVE2D = settings.enableLive2D;
    if (typeof settings.autoFullscreen === 'boolean') CONFIG.AUTO_FULLSCREEN = settings.autoFullscreen;

    // Save to local storage
    const storageSettings = {
        enableSound: CONFIG.ENABLE_SOUND,
        enableLive2D: CONFIG.ENABLE_LIVE2D,
        autoFullscreen: CONFIG.AUTO_FULLSCREEN,
    };
    localStorage.setItem('app-settings', JSON.stringify(storageSettings));

    // Update UI (silent update)
    const soundToggle = document.getElementById('toggle-sound');
    const live2dToggle = document.getElementById('toggle-live2d');
    const fullscreenToggle = document.getElementById('toggle-auto-fullscreen');

    if (soundToggle) soundToggle.checked = CONFIG.ENABLE_SOUND;
    if (live2dToggle) live2dToggle.checked = CONFIG.ENABLE_LIVE2D;
    if (fullscreenToggle) fullscreenToggle.checked = CONFIG.AUTO_FULLSCREEN;

    //console.log('Settings synced from host:', settings);
}

/**
 * Initialize room ID handlers
 */
let isRoomIdVisible = false;

function initRoomIdHandlers() {
    const toggleBtn = document.getElementById('toggle-room-id-visibility');
    const copyBtn = document.getElementById('copy-room-id-btn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isRoomIdVisible = !isRoomIdVisible;
            updateRoomIdDisplay();

            // Update icon
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isRoomIdVisible ? 'bi bi-eye-fill' : 'bi bi-eye-slash-fill';
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const { state } = await import('../state.js');
            const roomId = state.myRoom;

            if (roomId) {
                try {
                    await navigator.clipboard.writeText(roomId);

                    // Visual feedback
                    const icon = copyBtn.querySelector('i');
                    const originalClass = icon.className;
                    icon.className = 'bi bi-check-lg';
                    copyBtn.classList.add('copied');

                    setTimeout(() => {
                        icon.className = originalClass;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy room ID:', error);
                    alert('Không thể copy ID phòng');
                }
            }
        });
    }
}

/**
 * Update room ID display
 */
async function updateRoomIdDisplay() {
    const roomIdEl = document.getElementById('settings-room-id');
    if (!roomIdEl) return;

    const { state } = await import('../state.js');
    const roomId = state.myRoom;

    if (roomId) {
        roomIdEl.textContent = isRoomIdVisible ? roomId : '******';
    } else {
        roomIdEl.textContent = '------';
    }
}

/**
 * Initialize Lucky Wheel
 */
function initLuckyWheel() {
    const spinBtn = document.getElementById('spin-wheel-btn');
    const wheel = document.getElementById('random-wheel');
    const resultEl = document.getElementById('wheel-result');

    if (!spinBtn || !wheel) return;

    let isSpinning = false;
    let currentRotation = 0;

    spinBtn.addEventListener('click', async () => {
        if (isSpinning) return;

        // Update names before spinning
        await updateWheelNames();

        isSpinning = true;
        spinBtn.disabled = true;
        resultEl.textContent = 'Đang quay...';
        resultEl.style.color = '#fbbf24'; // Yellow

        // Calculate random rotation (min 5 spins = 1800deg)
        const randomDeg = Math.floor(Math.random() * 360);
        const spins = 360 * 8; // 8 full spins
        const totalDeg = spins + randomDeg;

        currentRotation += totalDeg; // Accumulate rotation

        wheel.style.transform = `rotate(${currentRotation}deg)`;

        // Wait for animation to finish (4s match CSS)
        setTimeout(async () => {
            isSpinning = false;
            spinBtn.disabled = false;

            // Calculate winner
            // Normalize current rotation to 0-360
            const actualRotation = currentRotation % 360;
            // Pointer is at Top (0deg).
            // The segment under pointer is (360 - actualRotation) % 360
            const winningAngle = (360 - actualRotation) % 360;

            // Blue (P1): 0-180
            // Red (P2): 180-360
            // Note: WinningAngle 0 is mathematically boundary.

            const { state } = await import('../state.js');
            // Get names again
            const room = state.currentRoomState;
            let p1Name = 'Người Chơi 1';
            let p2Name = 'Người Chơi 2';

            if (room && room.playerOrder && room.playerOrder.length >= 2) {
                p1Name = room.playerHistory[room.playerOrder[0]]?.name || 'P1';
                p2Name = room.playerHistory[room.playerOrder[1]]?.name || 'P2';
            }

            let winner = '';
            let color = '';

            if (winningAngle >= 0 && winningAngle < 180) {
                winner = p1Name;
                color = '#60a5fa'; // Blue
            } else {
                winner = p2Name;
                color = '#f87171'; // Red
            }

            resultEl.textContent = `Chọn: ${truncateName(winner)}`;
            resultEl.style.color = color;

            // Fire confetti or visual effect?

        }, 4000);
    });

    // Initial name update
    updateWheelNames();

    // Update names when panel opens
    const offcanvasElement = document.getElementById('host-controls-panel');
    if (offcanvasElement) {
        offcanvasElement.addEventListener('show.bs.offcanvas', updateWheelNames);
    }
}

export async function updateWheelNames() {
    const p1El = document.getElementById('wheel-p1-name');
    const p2El = document.getElementById('wheel-p2-name');

    if (!p1El || !p2El) return;

    try {
        const { state } = await import('../state.js');
        const { truncateName } = await import('./components.js');

        const room = state.currentRoomState;
        if (room && room.playerOrder && room.playerOrder.length >= 2) {
            const p1Val = room.playerHistory[room.playerOrder[0]]?.name || 'P1';
            const p2Val = room.playerHistory[room.playerOrder[1]]?.name || 'P2';

            p1El.textContent = truncateName(p1Val);
            p2El.textContent = truncateName(p2Val);
        }
    } catch (e) {
        console.error("Error updating wheel names", e);
    }
}

// Helper to truncate name if imported one fails
function truncateName(name, maxLength = 18) {
    if (!name) return '';
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
}

/**
 * Initialize Utility Timer
 */
function initUtilityTimer() {
    const displayEl = document.getElementById('utility-timer-display');
    const inputMin = document.getElementById('utility-timer-input-min');
    const inputSec = document.getElementById('utility-timer-input-sec');
    const inputMs = document.getElementById('utility-timer-input-ms');
    const toggleBtn = document.getElementById('utility-timer-toggle-btn');
    const resetBtn = document.getElementById('utility-timer-reset-btn');

    if (!displayEl || !inputMin || !inputSec || !inputMs || !toggleBtn || !resetBtn) return;

    let timerInterval = null;
    let remainingMs = 600000; // Default 10 minutes in ms
    let isRunning = false;
    let lastTime = 0;

    // Helper to format time
    const formatTime = (totalMs) => {
        const m = Math.floor(totalMs / 60000).toString().padStart(2, '0');
        const s = Math.floor((totalMs % 60000) / 1000).toString().padStart(2, '0');
        const ms = Math.floor((totalMs % 1000) / 10).toString().padStart(2, '0');
        return `${m}:${s}.${ms}`;
    };

    // Helper to update state from inputs
    const updatedFromInputs = () => {
        let m = parseInt(inputMin.value, 10) || 0;
        let s = parseInt(inputSec.value, 10) || 0;
        let ms = parseInt(inputMs.value, 10) || 0;
        if (m < 0) m = 0;
        if (s < 0) s = 0;
        if (s > 59) s = 59;
        if (ms < 0) ms = 0;
        if (ms > 99) ms = 99;

        // Update inputs just in case
        inputMin.value = m;
        inputSec.value = s;
        inputMs.value = ms;

        // input ms is in centiseconds (1cs = 10ms)
        remainingMs = (m * 60 * 1000) + (s * 1000) + (ms * 10);
        displayEl.textContent = formatTime(remainingMs);
        displayEl.classList.remove('finished');
    };

    // Listen to input changes
    inputMin.addEventListener('change', () => { if (!isRunning) updatedFromInputs(); });
    inputSec.addEventListener('change', () => { if (!isRunning) updatedFromInputs(); });
    inputMs.addEventListener('change', () => { if (!isRunning) updatedFromInputs(); });

    // Toggle Button
    toggleBtn.addEventListener('click', () => {
        if (isRunning) {
            // Pause
            clearInterval(timerInterval);
            isRunning = false;

            toggleBtn.innerHTML = '<i class="bi bi-play-fill"></i> Tiếp Tục';
            toggleBtn.className = 'btn tools-btn-primary flex-grow-1';

            displayEl.classList.remove('active');
            displayEl.classList.add('paused');

            // Enable inputs
            inputMin.disabled = false;
            inputSec.disabled = false;
            inputMs.disabled = false;
        } else {
            // Start
            if (remainingMs <= 0) {
                updatedFromInputs(); // Reset if 0
                if (remainingMs <= 0) return; // Still 0
            }

            isRunning = true;
            lastTime = Date.now();

            toggleBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Tạm Dừng';
            toggleBtn.className = 'btn btn-warning flex-grow-1';

            displayEl.classList.add('active');
            displayEl.classList.remove('paused');
            displayEl.classList.remove('finished');

            // Disable inputs
            inputMin.disabled = true;
            inputSec.disabled = true;
            inputMs.disabled = true;

            timerInterval = setInterval(() => {
                const now = Date.now();
                const delta = now - lastTime;
                lastTime = now;

                remainingMs -= delta;

                if (remainingMs <= 0) {
                    remainingMs = 0;
                    clearInterval(timerInterval);
                    isRunning = false;

                    displayEl.textContent = "00:00.00";
                    displayEl.classList.remove('active');
                    displayEl.classList.add('finished');

                    toggleBtn.innerHTML = '<i class="bi bi-play-fill"></i> Bắt Đầu';
                    toggleBtn.className = 'btn tools-btn-primary flex-grow-1';

                    // Enable inputs
                    inputMin.disabled = false;
                    inputSec.disabled = false;
                    inputMs.disabled = false;

                    // Optional: Play alert sound if enabled
                    if (window.CONFIG?.ENABLE_SOUND) {
                        // reuse notification sound logic or just beep
                    }
                } else {
                    displayEl.textContent = formatTime(remainingMs);
                }
            }, 10); // Update every 10ms for smoothness
        }
    });

    // Reset Button
    resetBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        isRunning = false;

        updatedFromInputs(); // Reset to input values

        toggleBtn.innerHTML = '<i class="bi bi-play-fill"></i> Bắt Đầu';
        toggleBtn.className = 'btn tools-btn-primary flex-grow-1';

        displayEl.classList.remove('active');
        displayEl.classList.remove('paused');
        displayEl.classList.remove('finished');

        inputMin.disabled = false;
        inputSec.disabled = false;
        inputMs.disabled = false;
    });

    // Initial Display
    updatedFromInputs();
}

/**
 * Enter fullscreen mode
 */
export function enterFullscreen() {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
    }
}
