import { DOM, CONSTANTS, CONFIG } from '../constants.js';
import { state } from '../state.js';
import { emitSwapTeams, emitStartDraft, emitKickPlayer, emitCloseRoom, emitTogglePause, emitSetCountdown, emitSelectChamp } from '../services/socket.js';
import { truncateName, updateSplashArt, setupInitialSlots, renderChampionGrid } from './components.js';
import { handlePreDraftPhase } from './preDraftView.js';
import { updateWheelNames, enterFullscreen } from './settings.js';
import { showChatButton } from './chat.js';
import { showWarning, showError, showInfo, showConfirm } from './toast.js';


// Web Worker will handle countdown timing

// Notification sound function using Web Audio API
function playNotificationSound() {
    // Check if sound is enabled in settings
    if (!CONFIG.ENABLE_SOUND) {
        return;
    }

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Create a simple beep notification sound
        oscillator.frequency.value = 880; // A5 note
        gainNode.gain.value = 0.2; // Volume

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15); // Short beep
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Logic chính cho màn hình draft, xử lý sự kiện `room-state`

export function initializeDraftView() {
    setupInitialSlots();

    // Advanced Search & Filter Logic
    let currentFilters = {
        query: '',
        rank: 'all',
        element: 'all',
        weapon: 'all'
    };

    function applyFilters() {
        // If no characters loaded yet, do nothing
        if (!state.uniqueCharacters || state.uniqueCharacters.length === 0) return;

        const filtered = state.uniqueCharacters.filter(char => {
            const matchesQuery = !currentFilters.query ||
                char.en.toLowerCase().includes(currentFilters.query) ||
                (char.nickname && char.nickname.toLowerCase().includes(currentFilters.query));

            const matchesRank = currentFilters.rank === 'all' || char.rank == currentFilters.rank;
            const matchesElement = currentFilters.element === 'all' || char.element == currentFilters.element;
            const matchesWeapon = currentFilters.weapon === 'all' || char.weapon == currentFilters.weapon;

            return matchesQuery && matchesRank && matchesElement && matchesWeapon;
        });

        renderChampionGrid(filtered);

        // Re-apply disabled state after filtering/rendering
        if (state.currentRoomState) {
            updateDisabledChamps(state.currentRoomState);
        }
    }

    // Search Input
    if (DOM.champSearchInput) {
        DOM.champSearchInput.oninput = () => {
            currentFilters.query = DOM.champSearchInput.value.trim().toLowerCase();
            if (DOM.clearSearchBtn) {
                DOM.clearSearchBtn.style.display = currentFilters.query.length > 0 ? 'block' : 'none';
            }
            applyFilters();
        };
    }

    if (DOM.clearSearchBtn) {
        DOM.clearSearchBtn.onclick = () => {
            if (DOM.champSearchInput) DOM.champSearchInput.value = '';
            currentFilters.query = '';
            DOM.clearSearchBtn.style.display = 'none';
            applyFilters();
        };
    }

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            const filterType = btn.dataset.filter;
            const value = btn.dataset.value;

            // Update Active State UI
            btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Filter State
            currentFilters[filterType] = value;
            applyFilters();
        };
    });

    // Reset Button
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            // Reset State
            currentFilters = { query: '', rank: 'all', element: 'all', weapon: 'all' };

            // Reset UI
            if (DOM.champSearchInput) DOM.champSearchInput.value = '';
            if (DOM.clearSearchBtn) DOM.clearSearchBtn.style.display = 'none';

            document.querySelectorAll('.filter-btn').forEach(btn => {
                const isDefault = btn.dataset.value === 'all';
                btn.classList.toggle('active', isDefault);
            });

            applyFilters();
        };
    }

    // Lock-in logic
    DOM.lockInButton.onclick = () => {
        if (!state.preSelectedChamp || !state.myRoom) return;
        emitSelectChamp(state.preSelectedChamp.en);
        DOM.lockInButton.disabled = true;
        state.preSelectedChamp = null;

        // Hide countdown immediately after lock-in (will be updated by server if needed)
        if (DOM.countdownSvg) {
            DOM.countdownSvg.style.display = 'none';
            DOM.countdownNumber.style.display = 'none';
        }
    };

    // Helper function to collapse the control panel
    function collapseControlPanel() {
        const offcanvasElement = document.getElementById('host-controls-panel');
        if (offcanvasElement) {
            const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
            if (bsOffcanvas) {
                bsOffcanvas.hide();
            }
        }
    }

    // Host controls are global functions in the original, let's attach them to window
    window.closeRoom = emitCloseRoom;
    window.togglePause = () => {
        emitTogglePause();
        collapseControlPanel();
    };
    window.setCountdown = () => {
        const input = document.getElementById('countdown-input');
        let time = parseInt(input.value, 10);

        // Validate: must be at least 1
        if (isNaN(time) || time < 1) {
            time = 1;
            input.value = 1;
            showWarning('Thời gian đếm ngược phải ít nhất 1 giây');
            return;
        }

        emitSetCountdown(time);
        //collapseControlPanel();
    };
    window.kickPlayer = emitKickPlayer;
    window.swapTeams = () => {
        emitSwapTeams();
        collapseControlPanel();
    };
    window.startDraft = () => {
        emitStartDraft();
        collapseControlPanel();
    };

    // Room ID Visibility Toggle
    window.isRoomIdHidden = true; // Default hidden
    window.toggleRoomIdVisibility = () => {
        window.isRoomIdHidden = !window.isRoomIdHidden;
        // Re-render status to update ID visibility
        if (state.currentRoomState) {
            updatePlayerStatus(state.currentRoomState);
        }
    };
}

// --- Socket Event Handlers ---

export function handleRoomStateUpdate(room) {
    const turnChanged = state.currentRoomState?.currentTurn !== room.currentTurn;
    const wasPaused = state.currentRoomState?.paused && !room.paused; // Vừa được resume

    // Reset draft complete flag if draft is still ongoing
    if (room.state === 'drafting' && state.isDraftComplete) {
        state.isDraftComplete = false;
    }

    state.currentRoomState = room;

    DOM.loginViewEl.style.display = 'none';
    DOM.draftViewEl.style.display = 'block';

    // Show chat button
    showChatButton();

    // Spine animations đã được preload trong loading screen

    // Hide developer footer when in draft view
    const developerFooter = document.getElementById('developer-footer');
    if (developerFooter) {
        developerFooter.style.display = 'none';
    }

    // Handle pre-draft phase first
    const isInPreDraft = handlePreDraftPhase(room);
    if (isInPreDraft) {
        return; // Stop rendering the rest of the draft view
    }

    // Show loading overlay only on first time showing ban/pick view
    // Use a flag to track if we've already shown the ban/pick view
    const isFirstBanPickLoad = !state.hasShownBanPickView;

    if (isFirstBanPickLoad) {
        const banPickLoading = document.getElementById('ban-pick-loading');
        if (banPickLoading) {
            banPickLoading.style.display = 'flex';
            banPickLoading.classList.remove('fade-out');
        }

        // Mark that we've shown the ban/pick view
        state.hasShownBanPickView = true;
    }

    // FIX: Xử lý trường hợp player vừa chuyển từ pre-draft sang ban/pick
    // và đang chờ người chơi khác hoặc host.
    // Điều kiện này đúng khi state là 'drafting', player không có lượt tiếp theo
    const draftFinished = room.state === 'drafting' && room.draftOrder.length > 0 && room.actions.length >= room.draftOrder.length;
    if (draftFinished) {
        // Không làm gì cả, để updateSplashArt xử lý
    } else if (room.state === 'drafting' && !room.nextTurn && state.myRole === 'player') {
        if (DOM.splashArtNameEl) {
            DOM.splashArtNameEl.innerText = 'Đợi host bắt đầu...';
        }
        if (DOM.countdownNumber) DOM.countdownNumber.innerText = "";
        if (DOM.countdownRing) DOM.countdownRing.style.display = 'none'; // Hide ring if needed
        if (DOM.countdownSvg) DOM.countdownSvg.style.display = 'none'; // Hide SVG 
    }

    // Reset pre-draft flag when draft starts
    // Hiển thị/ẩn khu vực chọn tướng dựa trên trạng thái phòng
    const isPlayerAndReadyInPreDraft = room.state === 'pre-draft-selection' && state.myRole === 'player' && room.preDraftReady?.[state.socket.id];
    const isActualDrafting = room.state === 'drafting' && !isInPreDraft;
    const showChampSelect = isActualDrafting || isPlayerAndReadyInPreDraft || state.myRole === 'host';

    DOM.champSelectionControlsEl.style.display = showChampSelect ? 'block' : 'none';
    if (showChampSelect) state.hasLoadedFromStorage = false;

    // Ẩn các nút không cần thiết cho Host
    // Ẩn các nút không cần thiết cho Host
    const isHost = state.myRole === 'host';

    // Add class to body for CSS differentiation
    document.body.classList.toggle('host', isHost);
    document.body.classList.toggle('player', !isHost);

    const advancedSearchContainer = document.querySelector('.advanced-search-container');
    if (advancedSearchContainer) {
        advancedSearchContainer.style.display = isHost ? 'none' : 'block';
    } else if (DOM.champSearchInput && DOM.champSearchInput.parentElement) {
        // Fallback if container not found
        DOM.champSearchInput.parentElement.style.display = isHost ? 'none' : 'block';
    }

    // Update UI elements
    updateHostControls(room);
    updatePlayerStatus(room);
    updateTeamNames(room);
    updatePreDraftDisplay(room);
    updateDisabledChamps(room);
    updateActionSlots(room, turnChanged);
    updateTurnHighlight(room);
    updateSplashOnTurnChange(turnChanged);
    updateSplashArt(state.preSelectedChamp?.en || state.remotePreSelectedChamp); // Phải chạy trước updateCountdown
    updateCountdown(room, turnChanged || wasPaused); // Chuyển xuống cuối để ghi đè các thuộc tính hiển thị khác

    // Update Lucky Wheel names
    updateWheelNames();

    // Hide loading screen after UI is ready (only on first ban/pick load)
    if (isFirstBanPickLoad) {
        setTimeout(() => {
            const banPickLoading = document.getElementById('ban-pick-loading');
            if (banPickLoading) {
                banPickLoading.classList.add('fade-out');
                setTimeout(() => {
                    banPickLoading.style.display = 'none';
                }, 500); // Match CSS transition duration
            }
        }, 400); // Brief delay to ensure UI is rendered
    }

    // Centralized logic for Lock-in button visibility and state
    const lockInContainer = DOM.lockInButton.parentElement;
    if (lockInContainer) {
        const isPlayer = state.myRole === 'player';
        const isDrafting = room.state === 'drafting';

        // Chỉ hiển thị container cho player trong giai đoạn drafting
        lockInContainer.classList.toggle('d-none', !isPlayer || !isDrafting);

        if (isPlayer && isDrafting) {
            const isMyTurn = room.nextTurn?.team === state.socket.id;
            DOM.lockInButton.disabled = !isMyTurn || room.paused || !state.preSelectedChamp;

            // Play notification sound when it's the player's turn
            if (turnChanged && isMyTurn && !room.paused) {
                playNotificationSound();
            }
        }
    }
}

export function handlePreSelectUpdate({ champ }) {
    state.remotePreSelectedChamp = champ;
    updateSplashArt(champ);
}

export function handleDraftFinished(data) {
    DOM.lockInButton.disabled = true;

    // Set flag to prevent countdown from showing again
    state.isDraftComplete = true;

    // Hide countdown SVG when draft is complete
    if (DOM.countdownSvg) {
        DOM.countdownSvg.style.display = 'none';
        DOM.countdownNumber.style.display = 'none';
    }

    //console.log("DRAFT COMPLETE", data);
}

export function handleDraftError({ message }) {
    showError(`Lỗi: ${message}`);
    if (message.toLowerCase().includes('room not found')) {
        setTimeout(() => window.location.reload(), 2000);
    }
}

export function handleHostLeft() {
    showInfo("Host đã rời phòng, phòng sẽ được đóng lại.", 2000);
    setTimeout(() => window.location.reload(), 2000);
}

export function handleKicked({ reason }) {
    showError(`Bạn đã bị kick khỏi phòng: ${reason || 'Bị kick bởi host'}`, 2000);
    setTimeout(() => window.location.reload(), 2000);
}


// --- UI Update Functions ---

function updatePreDraftDisplay(room) {
    const [p1_id, p2_id] = room.playerOrder || [];

    const renderDisplay = (containerEl, playerId) => {
        containerEl.innerHTML = "";
        if (!playerId || !room.preDraftSelections) return;

        const selections = room.preDraftSelections[playerId] || [];
        const fragment = document.createDocumentFragment();
        selections.forEach(champName => {
            const char = state.characters[champName];
            if (char) {
                const champDiv = document.createElement('div');
                champDiv.className = 'champ-item';
                champDiv.title = char.en;
                champDiv.innerHTML = `<img src="${char.icon}" alt="${char.en}"><div class="pre-draft-display-champ-name">${char.en}</div>`;
                fragment.appendChild(champDiv);
            }
        });
        containerEl.appendChild(fragment);
    };

    renderDisplay(DOM.p1PreDraftDisplayEl, p1_id);
    renderDisplay(DOM.p2PreDraftDisplayEl, p2_id);
}

function updateHostControls(room) {
    DOM.hostControlsToggle.classList.toggle('d-none', state.socket.id !== room.hostId);

    if (state.myRole === 'host') {
        // Kick buttons
        DOM.kickButtonsContainer.innerHTML = "";
        room.playerOrder.forEach((id, index) => {
            const player = room.playerHistory[id];
            // Only show kick button if player is currently connected
            if (player && room.players[id]) {
                const btn = document.createElement('button');
                btn.className = "btn"; // Use inherited styles from .player-selection-group .btn
                // Match colors: Player 1 (Blue), Player 2 (Red)
                if (index === 0) {
                    btn.style.backgroundColor = '#317bf1ff';
                } else {
                    btn.style.backgroundColor = '#da3b3bff';
                }
                btn.style.color = '#ffffffff';
                btn.style.border = 'none';

                btn.innerHTML = `<i class="bi bi-person-x-fill"></i>${truncateName(player.name)}`;
                btn.title = `Kick ${player.name}`;

                btn.onclick = () => {
                    showConfirm(
                        `Bạn có chắc muốn kick ${truncateName(player.name)}?`,
                        () => emitKickPlayer(id)
                    );
                };
                DOM.kickButtonsContainer.appendChild(btn);
            }
        });

        if (DOM.kickButtonsContainer.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'tools-empty-state';
            emptyState.innerText = 'Chưa có người chơi nào. Vui lòng đợi thêm.';
            DOM.kickButtonsContainer.appendChild(emptyState);
        }

        // Swap teams button - show when both players ready and draft hasn't started
        const connectedPlayersCount = Object.keys(room.players).length;
        const bothPlayersReady = room.playerOrder.length === 2
            && connectedPlayersCount === 2
            && (room.state === 'pre-draft-selection' || room.state === 'drafting');
        const allPlayersConfirmed = room.playerOrder.every(id => room.preDraftReady?.[id]);
        const canSwap = bothPlayersReady
            && allPlayersConfirmed
            && room.draftOrder.length === 0;
        const hasStartedDraft = room.draftOrder.length > 0;

        // Show/hide swap teams card (now drag & drop)
        const swapTeamsCard = document.getElementById('swap-teams-card');
        if (swapTeamsCard) {
            swapTeamsCard.style.display = canSwap ? 'block' : 'none';

            // Populate drag & drop zones
            if (canSwap) {
                const [p1_id, p2_id] = room.playerOrder;
                const p1_name = room.playerHistory[p1_id]?.name || 'Player 1';
                const p2_name = room.playerHistory[p2_id]?.name || 'Player 2';

                // Populate Blue team zone (player 1)
                const blueZoneContent = document.getElementById('blue-team-content');
                if (blueZoneContent) {
                    blueZoneContent.innerHTML = `
                        <div class="player-card" draggable="true" data-player-id="${p1_id}">
                            <i class="bi bi-person-fill player-card-icon"></i>
                            <span class="player-card-name">${truncateName(p1_name)}</span>
                        </div>
                    `;
                }

                // Populate Red team zone (player 2)
                const redZoneContent = document.getElementById('red-team-content');
                if (redZoneContent) {
                    redZoneContent.innerHTML = `
                        <div class="player-card" draggable="true" data-player-id="${p2_id}">
                            <i class="bi bi-person-fill player-card-icon"></i>
                            <span class="player-card-name">${truncateName(p2_name)}</span>
                        </div>
                    `;
                }

                // Initialize drag & drop events
                initializeDragAndDrop();
            }
        }

        // Hide old choose-first card (deprecated)
        const chooseFirstCard = document.getElementById('choose-first-card');
        if (chooseFirstCard) {
            chooseFirstCard.style.display = 'none';
        }

        // Hide/show game control card - only show after draft starts AND 2 players connected
        const gameControlCard = document.getElementById('game-control-card');
        if (gameControlCard) {
            gameControlCard.style.display = (hasStartedDraft && connectedPlayersCount === 2) ? 'block' : 'none';
        }
    }
}

function updatePlayerStatus(room) {
    const roomIdDisplay = window.isRoomIdHidden ? '******' : state.myRoom;
    const eyeIcon = window.isRoomIdHidden ? 'bi-eye-slash-fill' : 'bi-eye-fill';

    DOM.firstPickStatusEl.innerHTML = `
        ID Phòng: <strong class="me-2">${roomIdDisplay}</strong>
        <button class="btn btn-sm btn-outline-light border-0" onclick="toggleRoomIdVisibility()" title="${window.isRoomIdHidden ? 'Hiện ID' : 'Ẩn ID'}">
            <i class="bi ${eyeIcon}"></i>
        </button>
    `;

    // Player status element is now optional (may be commented out in HTML)
    if (DOM.playerStatusEl) {
        const playerOrder = room.playerOrder || [];
        const connectedPlayerIds = new Set(Object.keys(room.players));
        let statusHTML = '';

        const createStatusSpan = (playerId, defaultText) => {
            if (!playerId) return `<span class="me-4" style="color: white;">⏳ <strong>${defaultText}:</strong> Đợi...</span>`;
            const playerData = room.playerHistory[playerId];
            const isConnected = connectedPlayerIds.has(playerId);
            const color = isConnected ? 'white' : 'white';
            const icon = isConnected ? '✅' : '❌';
            const style = isConnected ? 'font-weight: bold;' : 'font-weight: bold;';
            return `<span class="me-4" style="color: ${color}; ${style}">${icon} <strong>${truncateName(playerData.name)}:</strong> ${isConnected ? 'Đã kết nối' : 'Mất kết nối'}</span>`;
        };

        statusHTML += createStatusSpan(playerOrder[0], 'Player 1');
        statusHTML += createStatusSpan(playerOrder[1], 'Player 2');
        DOM.playerStatusEl.innerHTML = statusHTML;
    }
}

function updateTeamNames(room) {
    const playerOrder = room.playerOrder || [];
    const connectedPlayerIds = new Set(Object.keys(room.players));

    // Update Player 1 (Team Blue - Position 0)
    if (playerOrder[0]) {
        const p1Name = truncateName(room.playerHistory[playerOrder[0]]?.name) || 'Player 1';
        const p1Connected = connectedPlayerIds.has(playerOrder[0]);

        // Update old display (for backward compatibility)
        if (DOM.player1NameEl) {
            DOM.player1NameEl.innerText = `${p1Name}`;
        }

        // Update new player info card
        const p1DisplayName = document.getElementById('player1-display-name');
        if (p1DisplayName) {
            p1DisplayName.innerText = `${p1Name}`;
        }

        // Update status indicator
        const p1Card = document.querySelector('#player1-container .player-info-card');
        const p1StatusIndicator = p1Card?.querySelector('.player-status-indicator');
        if (p1StatusIndicator) {
            p1StatusIndicator.classList.toggle('online', p1Connected);
            p1StatusIndicator.classList.toggle('offline', !p1Connected);
            p1StatusIndicator.title = p1Connected ? 'Online' : 'Offline';
        }

        // Update turn info and active state
        const p1TurnInfo = document.getElementById('player1-turn-info');
        if (p1TurnInfo) {
            const turn = room.nextTurn;
            const isMyTurn = turn && turn.team === playerOrder[0];

            // Toggle active-turn class for card animation
            if (p1Card) {
                p1Card.classList.toggle('active-turn', isMyTurn);
            }

            // Toggle active-turn class for stat-item blinking animation
            p1TurnInfo.classList.toggle('active-turn', isMyTurn);

            if (isMyTurn) {
                const turnType = turn.type === 'ban' ? 'Banning' : 'Picking';
                const icon = turn.type === 'ban' ? 'bi-x-circle-fill' : 'bi-check-circle-fill';
                const color = turn.type === 'ban' ? '#deef44ff' : '#10b981';

                p1TurnInfo.innerHTML = `
                    <i class="${icon}" style="color: ${color}"></i>
                    <span style="color: ${color}; font-weight: 800;">${turnType}</span>
                `;
                p1TurnInfo.style.background = 'rgba(255, 255, 255, 0.2)';
            } else {
                p1TurnInfo.innerHTML = `
                    <i class="bi bi-unlock2-fill"></i>
                    <span>...</span>
                `;
                p1TurnInfo.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        }
    }

    // Update Player 2 (Team Red - Position 1)
    if (playerOrder[1]) {
        const p2Name = truncateName(room.playerHistory[playerOrder[1]]?.name) || 'Player 2';
        const p2Connected = connectedPlayerIds.has(playerOrder[1]);

        // Update old display (for backward compatibility)
        if (DOM.player2NameEl) {
            DOM.player2NameEl.innerText = `${p2Name}`;
        }

        // Update new player info card
        const p2DisplayName = document.getElementById('player2-display-name');
        if (p2DisplayName) {
            p2DisplayName.innerText = `${p2Name}`;
        }

        // Update status indicator
        const p2Card = document.querySelector('#player2-container .player-info-card');
        const p2StatusIndicator = p2Card?.querySelector('.player-status-indicator');
        if (p2StatusIndicator) {
            p2StatusIndicator.classList.toggle('online', p2Connected);
            p2StatusIndicator.classList.toggle('offline', !p2Connected);
            p2StatusIndicator.title = p2Connected ? 'Online' : 'Offline';
        }

        // Update turn info and active state
        const p2TurnInfo = document.getElementById('player2-turn-info');
        if (p2TurnInfo) {
            const turn = room.nextTurn;
            const isMyTurn = turn && turn.team === playerOrder[1];

            // Toggle active-turn class for card animation
            if (p2Card) {
                p2Card.classList.toggle('active-turn', isMyTurn);
            }

            // Toggle active-turn class for stat-item blinking animation
            p2TurnInfo.classList.toggle('active-turn', isMyTurn);

            if (isMyTurn) {
                const turnType = turn.type === 'ban' ? 'Banning' : 'Picking';
                const icon = turn.type === 'ban' ? 'bi-x-circle-fill' : 'bi-check-circle-fill';
                const color = turn.type === 'ban' ? '#deef44ff' : '#10b981';

                p2TurnInfo.innerHTML = `
                    <i class="${icon}" style="color: ${color}"></i>
                    <span style="color: ${color}; font-weight: 800;">${turnType}</span>
                `;
                p2TurnInfo.style.background = 'rgba(255, 255, 255, 0.2)';
            } else {
                p2TurnInfo.innerHTML = `
                    <i class="bi bi-unlock2-fill"></i>
                    <span>...</span>
                `;
                p2TurnInfo.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        }
    }
}

// Web Worker for countdown
let countdownWorker = null;

function initCountdownWorker() {
    if (!countdownWorker) {
        countdownWorker = new Worker('/js/workers/countdownWorker.js');

        countdownWorker.onmessage = function (e) {
            const { type, data } = e.data;

            switch (type) {
                case 'update':
                    // Update UI with countdown data from worker
                    if (DOM.countdownNumber) {
                        DOM.countdownNumber.innerText = Math.floor(data.remaining);
                        DOM.countdownNumber.classList.remove('paused-text');
                    }

                    if (DOM.countdownRing) {
                        // Use strokeDasharray since pathLength="1"
                        // scale goes from 1 down to 0
                        DOM.countdownRing.style.strokeDasharray = `${data.scale} 1`;
                        DOM.countdownRing.classList.toggle('ring-warning', data.isWarning);
                    }

                    if (DOM.countdownNumber) {
                        DOM.countdownNumber.classList.toggle('time-warning', data.isWarning);
                    }
                    // Only show countdown SVG if draft is not complete
                    if (DOM.countdownSvg && !state.isDraftComplete && state.currentRoomState?.nextTurn && state.currentRoomState?.state !== 'complete') {
                        DOM.countdownSvg.style.display = 'block';
                    }

                    // Update player progress bars
                    updatePlayerProgressBars(data.scale, data.isWarning);
                    break;

                case 'paused':
                    if (DOM.countdownNumber) {
                        DOM.countdownNumber.innerText = "PAUSED";
                        DOM.countdownNumber.classList.add('paused-text');
                    }
                    if (DOM.countdownRing) DOM.countdownRing.style.strokeDasharray = '1 1';
                    if (DOM.countdownNumber) DOM.countdownNumber.classList.remove('time-warning');
                    if (DOM.countdownSvg) DOM.countdownSvg.style.display = 'none'; // Hide SVG on pause

                    // Hide player progress bars
                    hidePlayerProgressBars();
                    break;

                case 'complete':
                    // Countdown finished - hide countdown SVG
                    if (DOM.countdownSvg) {
                        DOM.countdownSvg.style.display = 'none !important';
                    }
                    hidePlayerProgressBars();
                    break;
            }
        };
    }
}

// Helper functions for player progress bars
function updatePlayerProgressBars(scale, isWarning) {
    const room = state.currentRoomState;
    if (!room || !room.nextTurn) {
        hidePlayerProgressBars();
        return;
    }

    const playerOrder = room.playerOrder || [];
    const isPlayer1Turn = room.nextTurn.team === playerOrder[0];
    const isPlayer2Turn = room.nextTurn.team === playerOrder[1];

    const p1Progress = document.getElementById('player1-countdown-progress');
    const p1Bar = document.getElementById('player1-countdown-bar');
    const p2Progress = document.getElementById('player2-countdown-progress');
    const p2Bar = document.getElementById('player2-countdown-bar');

    if (isPlayer1Turn && p1Progress && p1Bar) {
        p1Progress.classList.remove('hidden');
        p1Bar.style.width = `${scale * 100}%`;
        p1Bar.classList.toggle('warning', isWarning);
    } else if (p1Progress) {
        p1Progress.classList.add('hidden');
    }

    if (isPlayer2Turn && p2Progress && p2Bar) {
        p2Progress.classList.remove('hidden');
        p2Bar.style.width = `${scale * 100}%`;
        p2Bar.classList.toggle('warning', isWarning);
    } else if (p2Progress) {
        p2Progress.classList.add('hidden');
    }
}

function hidePlayerProgressBars() {
    const p1Progress = document.getElementById('player1-countdown-progress');
    const p2Progress = document.getElementById('player2-countdown-progress');

    if (p1Progress) p1Progress.classList.add('hidden');
    if (p2Progress) p2Progress.classList.add('hidden');
}

function updateCountdown(room, forceRestart = false) {
    // Initialize worker if needed
    initCountdownWorker();

    if (room.paused) {
        if (DOM.countdownNumber) DOM.countdownNumber.style.display = 'block';
        countdownWorker.postMessage({ type: 'pause' });
    } else if (room.countdownEndTime != null && room.nextTurn && room.state !== 'complete') {
        if (DOM.countdownNumber) DOM.countdownNumber.style.display = 'block';
        if (DOM.countdownRing) DOM.countdownRing.style.display = 'block';
        if (DOM.countdownSvg) DOM.countdownSvg.style.display = 'block'; // Show SVG on start

        // Send countdown data to worker
        countdownWorker.postMessage({
            type: 'start',
            data: {
                endTime: room.countdownEndTime,
                duration: room.countdownDuration || 30
            }
        });
    } else {
        if (DOM.countdownNumber) DOM.countdownNumber.innerText = "";
        // if (DOM.countdownRing) DOM.countdownRing.style.strokeDasharray = '1 1';
        if (DOM.countdownSvg) DOM.countdownSvg.style.display = 'none !important';
        countdownWorker.postMessage({ type: 'stop' });
        hidePlayerProgressBars();
    }
}

function updateDisabledChamps(room) {
    const disabledChamps = new Set(room.actions.map(a => a.champ));
    const turn = room.nextTurn;

    // Add duplicate unowned champs to disabled list
    const selections = Object.values(room.preDraftSelections || {});
    if (selections.length === 2) {
        const [p1_selections, p2_selections] = selections;
        const p1_set = new Set(p1_selections);
        p2_selections.forEach(champ => {
            if (p1_set.has(champ)) disabledChamps.add(champ);
        });
    }

    document.querySelectorAll('.champ-item').forEach(item => {
        const champName = item.dataset.name;
        let isDisabled = disabledChamps.has(champName);

        if (turn && turn.team === state.socket.id) {
            const myUnowned = new Set(room.preDraftSelections?.[state.socket.id] || []);
            const opponentId = room.playerOrder.find(id => id !== state.socket.id);
            const opponentUnowned = new Set(room.preDraftSelections?.[opponentId] || []);

            if (turn.type === 'pick' && myUnowned.has(champName)) {
                isDisabled = true;
            }
            if (turn.type === 'ban' && opponentUnowned.has(champName)) {
                isDisabled = true;
            }
        }
        item.classList.toggle('disabled', isDisabled);
    });
}

function updateActionSlots(room, turnChanged) {
    const blueBanSlots = [...DOM.blueBansEl.children];
    const redBanSlots = [...DOM.redBansEl.children];
    const bluePickSlots = [...DOM.bluePicksP1El.children, ...DOM.bluePicksP2El.children];
    const redPickSlots = [...DOM.redPicksP1El.children, ...DOM.redPicksP2El.children];
    const allSlots = [...blueBanSlots, ...redBanSlots, ...bluePickSlots, ...redPickSlots];

    allSlots.forEach(slot => {
        slot.innerHTML = "";
        slot.style.backgroundColor = '';
        slot.className = slot.className.split(' ')[0] + ' ' + slot.className.split(' ')[1]; // Keep only 'slot' and 'blue'/'red'
        delete slot.dataset.indexed;
    });

    let blueBanIndex = 0, redBanIndex = 0;
    let bluePickIndex = 0, redPickIndex = 0;

    room.actions.forEach((action, actionIndex) => {
        const isPlayer1 = room.playerOrder[0] === action.team;
        const isBan = action.type === 'ban';

        const slots = isBan ? (isPlayer1 ? blueBanSlots : redBanSlots) : (isPlayer1 ? bluePickSlots : redPickSlots);
        const index = isBan ? (isPlayer1 ? blueBanIndex++ : redBanIndex++) : (isPlayer1 ? bluePickIndex++ : redPickIndex++);

        if (index < slots.length) {
            const slot = slots[index];
            const charData = state.characters[action.champ];

            if (action.champ === 'SKIPPED') {
                slot.innerHTML = `<div class='${action.type}'>${action.type.toUpperCase()}</div><div class="slot-name-box">SKIPPED</div>`;
                slot.classList.add('skipped');
            } else {
                const iconHtml = charData ? `<img class="slot-img" src="${charData.icon}" alt="${charData.en}">` : '';
                const nameHtml = `<div class="slot-name-box">${charData?.en || action.champ}</div>`;
                slot.innerHTML = `<div class='${action.type}'>${action.type.toUpperCase()}</div>${iconHtml}${nameHtml}`;
                if (isBan) slot.classList.add('banned');
            }

            if (charData?.element) {
                slot.style.backgroundColor = CONSTANTS.ELEMENT_COLORS[charData.element] || '#ccc';
            }
            slot.dataset.indexed = "1";

            // Add animation for the newest action
            if (turnChanged && actionIndex === room.actions.length - 1) {
                slot.classList.remove("slot-reveal-animation");
                void slot.offsetWidth; // Trigger reflow
                slot.classList.add("slot-reveal-animation");
            }
        }
    });

    // Add turn numbers to ALL ban slots (both filled and empty)
    blueBanSlots.forEach((slot, index) => {
        const turnNumber = index + 1;
        const turnSpan = document.createElement('span');
        turnSpan.className = 'slot-turn-number';
        turnSpan.textContent = turnNumber;
        slot.appendChild(turnSpan);
    });

    redBanSlots.forEach((slot, index) => {
        const turnNumber = index + 1; // Start from 1 for each player
        const turnSpan = document.createElement('span');
        turnSpan.className = 'slot-turn-number';
        turnSpan.textContent = turnNumber;
        slot.appendChild(turnSpan);
    });
}

function updateTurnHighlight(room) {
    document.querySelectorAll('.slot.highlight').forEach(el => el.classList.remove('highlight'));

    const turn = room.nextTurn;
    if (turn) {
        const isPlayer1Turn = room.playerOrder[0] === turn.team;
        const isBan = turn.type === 'ban';
        const slots = isBan
            ? (isPlayer1Turn ? [...DOM.blueBansEl.children] : [...DOM.redBansEl.children])
            : (isPlayer1Turn ? [...DOM.bluePicksP1El.children, ...DOM.bluePicksP2El.children] : [...DOM.redPicksP1El.children, ...DOM.redPicksP2El.children]);

        const nextEmptySlot = slots.find(slot => !slot.dataset.indexed);
        if (nextEmptySlot) {
            nextEmptySlot.classList.add("highlight");
        }
    }
}

function updateSplashOnTurnChange(turnChanged) {
    if (turnChanged) {
        // Luôn cập nhật splash art để hiển thị đúng trạng thái (VD: Đợi player..., DRAFT COMPLETE)
        // Chỉ reset khi lượt thay đổi
        updateSplashArt(null);
        state.preSelectedChamp = null;
        state.remotePreSelectedChamp = null;
        document.querySelectorAll('.champ-item.pre-selected').forEach(el => el.classList.remove('pre-selected'));

        // Reset champion name and element container
        if (DOM.selectedChampNameEl) {
            DOM.selectedChampNameEl.innerText = '';
        }
        // Old containers - now handled by champion-info-display
        /*
        if (DOM.selectedChampElementContainer) {
            DOM.selectedChampElementContainer.classList.add('d-none');
            DOM.selectedChampElementContainer.classList.remove('d-flex');
        }
        if (DOM.selectedChampRankContainer) {
            DOM.selectedChampRankContainer.classList.add('d-none');
            DOM.selectedChampRankContainer.classList.remove('d-flex');
        }
        */

        if (DOM.countdownRing) {
            DOM.countdownRing.style.transition = 'none';
            DOM.countdownRing.style.strokeDasharray = '1 1';
            void DOM.countdownRing.offsetWidth; // Trigger reflow
            DOM.countdownRing.style.transition = 'stroke-dasharray 0.1s linear';
        }
    }
}
// ==================== Drag & Drop Team Assignment ====================
let draggedPlayerId = null;

function initializeDragAndDrop() {
    const playerCards = document.querySelectorAll('.player-card');
    const dropZones = document.querySelectorAll('.team-drop-zone');

    playerCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedPlayerId = e.target.dataset.playerId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const dropZone = e.currentTarget;
    const targetTeam = dropZone.dataset.team;

    if (!draggedPlayerId) return;

    const room = state.currentRoomState;
    if (!room) return;

    const [p1_id, p2_id] = room.playerOrder;
    const draggedIsPlayer1 = draggedPlayerId === p1_id;
    const targetPosition = targetTeam === 'blue' ? 0 : 1;
    const currentPosition = draggedIsPlayer1 ? 0 : 1;

    if (targetPosition === currentPosition) {
        draggedPlayerId = null;
        return;
    }

    emitSwapTeams();
    draggedPlayerId = null;
}
