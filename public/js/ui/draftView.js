import { DOM, CONSTANTS, CONFIG } from '../constants.js';
import { state } from '../state.js';
import { emitChooseFirst, emitKickPlayer, emitCloseRoom, emitTogglePause, emitSetCountdown, emitSelectChamp } from '../services/socket.js';
import { truncateName, updateSplashArt, setupInitialSlots, renderChampionGrid } from './components.js';
import { handlePreDraftPhase } from './preDraftView.js';
import { updateWheelNames } from './settings.js';
import { showChatButton } from './chat.js';


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
    };

    // Host controls are global functions in the original, let's attach them to window
    window.closeRoom = emitCloseRoom;
    window.togglePause = emitTogglePause;
    window.setCountdown = () => {
        const input = document.getElementById('countdown-input');
        let time = parseInt(input.value, 10);

        // Validate: must be at least 1
        if (isNaN(time) || time < 1) {
            time = 1;
            input.value = 1;
            alert('Thời gian đếm ngược phải ít nhất 1 giây');
            return;
        }

        emitSetCountdown(time);
    };
    window.kickPlayer = emitKickPlayer;
    window.chooseFirst = emitChooseFirst;

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

    // FIX: Xử lý trường hợp player vừa chuyển từ pre-draft sang ban/pick
    // và đang chờ người chơi khác hoặc host.
    // Điều kiện này đúng khi state là 'drafting', player không có lượt tiếp theo
    const draftFinished = room.state === 'drafting' && room.draftOrder.length > 0 && room.actions.length >= room.draftOrder.length;
    if (draftFinished) {
        // Không làm gì cả, để updateSplashArt xử lý
    } else if (room.state === 'drafting' && !room.nextTurn && state.myRole === 'player') {
        DOM.splashArtNameEl.innerText = 'Đợi host bắt đầu...';
        DOM.countdownText.style.display = 'none'; // Đảm bảo countdown text bị ẩn
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
    console.log("DRAFT COMPLETE", data);
}

export function handleDraftError({ message }) {
    alert(`Lỗi: ${message}`);
    if (message.toLowerCase().includes('room not found')) {
        window.location.reload();
    }
}

export function handleHostLeft() {
    alert("Host đã rời phòng, phòng sẽ được đóng lại.");
    window.location.reload();
}

export function handleKicked({ reason }) {
    alert(`Bạn đã bị kick khỏi phòng: ${reason || 'Bị kick bởi host'}`);
    window.location.reload();
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
                    if (confirm(`Bạn có chắc muốn kick ${truncateName(player.name)}?`)) {
                        emitKickPlayer(id);
                    }
                };
                DOM.kickButtonsContainer.appendChild(btn);
            }
        });

        if (DOM.kickButtonsContainer.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'tools-empty-state';
            emptyState.innerText = 'Chưa có người chơi nào.';
            DOM.kickButtonsContainer.appendChild(emptyState);
        }

        // Choose first player buttons
        const connectedPlayersCount = Object.keys(room.players).length;
        const canChooseFirst = room.playerOrder.length === 2 && connectedPlayersCount === 2 && room.state === 'drafting' && room.draftOrder.length === 0;
        const hasChosenFirst = room.draftOrder.length > 0;

        // Hide/show the entire card in settings panel
        const chooseFirstCard = document.getElementById('choose-first-card');
        if (chooseFirstCard) {
            chooseFirstCard.style.display = canChooseFirst ? 'block' : 'none';
        }

        // Hide/show game control card - only show after first player is chosen AND 2 players connected
        const gameControlCard = document.getElementById('game-control-card');
        if (gameControlCard) {
            gameControlCard.style.display = (hasChosenFirst && connectedPlayersCount === 2) ? 'block' : 'none';
        }

        // Also update the controls container for backward compatibility
        DOM.preDraftControls.style.display = canChooseFirst ? "flex" : "none";

        if (canChooseFirst) {
            DOM.preDraftControls.innerHTML = "";
            const [p1_id, p2_id] = room.playerOrder;
            const p1_name = room.playerHistory[p1_id]?.name;
            const p2_name = room.playerHistory[p2_id]?.name;

            const btn1 = document.createElement('button');
            btn1.className = "btn"; // Use inherited styles from .player-selection-group .btn
            btn1.style.backgroundColor = '#317bf1ff';
            btn1.style.color = '#ffffffff';
            btn1.style.border = 'none';
            btn1.innerHTML = `<i class="bi bi-person-fill"></i>${truncateName(p1_name)}`;
            btn1.onclick = () => emitChooseFirst(p1_id);
            DOM.preDraftControls.appendChild(btn1);

            const btn2 = document.createElement('button');
            btn2.className = "btn"; // Use inherited styles from .player-selection-group .btn
            btn2.style.backgroundColor = '#da3b3bff';
            btn2.style.color = '#ffffffff';
            btn2.style.border = 'none';
            btn2.innerHTML = `<i class="bi bi-person-fill"></i>${truncateName(p2_name)}`;
            btn2.onclick = () => emitChooseFirst(p2_id);
            DOM.preDraftControls.appendChild(btn2);
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

function updateTeamNames(room) {
    if (room.playerOrder?.[0]) {
        DOM.player1NameEl.innerText = truncateName(room.playerHistory[room.playerOrder[0]]?.name) || 'Player 1';
    }
    if (room.playerOrder?.[1]) {
        DOM.player2NameEl.innerText = truncateName(room.playerHistory[room.playerOrder[1]]?.name) || 'Player 2';
    }
}

// Web Worker for countdown
let countdownWorker = null;

function initCountdownWorker() {
    if (!countdownWorker) {
        countdownWorker = new Worker('/js/workers/countdownWorker.js');

        // Listen for messages from worker
        countdownWorker.onmessage = function (e) {
            const { type, data } = e.data;

            switch (type) {
                case 'update':
                    // Update UI with countdown data from worker
                    DOM.countdownText.innerText = Math.floor(data.remaining);
                    DOM.countdownText.style.fontSize = '48px';
                    DOM.countdownBar.style.transform = `scaleX(${data.scale})`;
                    DOM.countdownText.classList.toggle('time-warning', data.isWarning);
                    break;

                case 'paused':
                    DOM.countdownText.innerText = "PAUSED";
                    DOM.countdownText.style.fontSize = '20px';
                    DOM.countdownBar.style.transform = 'scaleX(1)';
                    DOM.countdownText.classList.remove('time-warning');
                    break;

                case 'complete':
                    // Countdown finished
                    break;
            }
        };
    }
}

function updateCountdown(room, forceRestart = false) {
    // Initialize worker if needed
    initCountdownWorker();

    if (room.paused) {
        DOM.countdownText.style.display = 'block';
        countdownWorker.postMessage({ type: 'pause' });
    } else if (room.countdownEndTime != null && room.nextTurn) {
        DOM.countdownText.style.display = 'block';

        // Send countdown data to worker
        countdownWorker.postMessage({
            type: 'start',
            data: {
                endTime: room.countdownEndTime,
                duration: room.countdownDuration || 30
            }
        });
    } else {
        DOM.countdownText.style.display = 'none';
        DOM.countdownBar.style.transform = 'scaleX(1)';
        countdownWorker.postMessage({ type: 'stop' });
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
        if (DOM.selectedChampElementContainer) {
            DOM.selectedChampElementContainer.classList.add('d-none');
            DOM.selectedChampElementContainer.classList.remove('d-flex');
        }
        if (DOM.selectedChampRankContainer) {
            DOM.selectedChampRankContainer.classList.add('d-none');
            DOM.selectedChampRankContainer.classList.remove('d-flex');
        }

        DOM.countdownBar.style.transition = 'none';
        DOM.countdownBar.style.transform = 'scaleX(1)';
        void DOM.countdownBar.offsetWidth; // Trigger reflow
        DOM.countdownBar.style.transition = 'transform 1s linear';
    }
}
