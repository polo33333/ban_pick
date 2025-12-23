import { DOM, CONSTANTS, CONFIG } from '../constants.js';
import { state } from '../state.js';
import { emitPreSelectChamp, emitSelectChamp } from '../services/socket.js';

// Chứa các hàm render các thành phần UI nhỏ, tái sử dụng được

// ==================== Champion Stats Management ====================
let championStatsData = null;

// Load champion statistics from server
async function loadChampionStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        championStatsData = data.characters;
        // console.log('Champion stats loaded successfully');
    } catch (error) {
        console.error('Failed to load champion stats:', error);
        championStatsData = null;
    }
}

// Update stats display for selected champion
function updateChampionStatsDisplay(championName) {
    const statsDisplay = document.getElementById('champion-stats-display');

    if (!statsDisplay) return;

    // Hide if no champion name or no stats data loaded
    if (!championName || !championStatsData) {
        statsDisplay.classList.add('d-none');
        statsDisplay.classList.remove('d-flex');
        return;
    }

    const stats = championStatsData[championName];

    // Hide if this champion has no stats
    if (!stats) {
        if (statsDisplay.classList.contains('d-flex')) {
            statsDisplay.classList.add('fade-out');
            setTimeout(() => {
                statsDisplay.classList.add('d-none');
                statsDisplay.classList.remove('d-flex', 'fade-out');
            }, 300);
        }
        return;
    }

    // Update stat values
    const banRateEl = document.getElementById('stat-ban-rate');
    const pickRateEl = document.getElementById('stat-pick-rate');
    const totalGamesEl = document.getElementById('stat-total-games');

    if (banRateEl) banRateEl.textContent = `${(stats.banRate * 100).toFixed(1)}%`;
    if (pickRateEl) pickRateEl.textContent = `${(stats.pickRate * 100).toFixed(1)}%`;
    if (totalGamesEl) totalGamesEl.textContent = stats.totalGames;

    // Show stats display
    statsDisplay.classList.remove('d-none');
    statsDisplay.classList.add('d-flex');
}

// Update champion info display (element and rank)
function updateChampionInfoDisplay(charData) {
    const infoDisplay = document.getElementById('champion-info-display');

    if (!infoDisplay) return;

    // Hide if no character data
    if (!charData) {
        if (infoDisplay.classList.contains('d-flex')) {
            infoDisplay.classList.add('fade-out');
            setTimeout(() => {
                infoDisplay.classList.add('d-none');
                infoDisplay.classList.remove('d-flex', 'fade-out');
            }, 300);
        }
        return;
    }

    const hasElement = charData.element && CONSTANTS.ELEMENT_NAMES[charData.element];
    const hasRank = charData.rank;

    // Hide if no element and no rank
    if (!hasElement && !hasRank) {
        if (infoDisplay.classList.contains('d-flex')) {
            infoDisplay.classList.add('fade-out');
            setTimeout(() => {
                infoDisplay.classList.add('d-none');
                infoDisplay.classList.remove('d-flex', 'fade-out');
            }, 300);
        }
        return;
    }

    // Update element
    const elementItem = infoDisplay.querySelector('.info-element');
    if (hasElement) {
        elementItem.style.display = 'flex';
        DOM.selectedChampElementEl.src = `/element/${CONSTANTS.ELEMENT_NAMES[charData.element]}.webp`;
        DOM.selectedChampElementNameEl.innerText = CONSTANTS.ELEMENT_NAMES[charData.element];
    } else {
        elementItem.style.display = 'none';
    }

    // Update rank
    const rankItem = infoDisplay.querySelector('.info-rank');
    if (hasRank) {
        rankItem.style.display = 'flex';
        DOM.selectedChampRankEl.innerHTML = '★'.repeat(charData.rank);
    } else {
        rankItem.style.display = 'none';
    }

    // Show info display
    infoDisplay.classList.remove('d-none');
    infoDisplay.classList.add('d-flex');
}

// Load stats when module loads
loadChampionStats();

// ==================== Spine WebGL Management (Single Context) ====================
import { getSpineManager } from '../spine/spineWebGL.js';

let spineManagerInitialized = false;

// Initialize spine manager (gọi 1 lần khi app start)
function ensureSpineManagerInit() {
    if (spineManagerInitialized) return;

    const container = DOM.spinePlayerContainer;
    if (!container) return;

    const manager = getSpineManager();
    manager.init(container);
    spineManagerInitialized = true;
}

// ==================== Public Preload Functions ====================
export function preloadSpinePlayer() {
    console.log('SpineWebGL: Single context mode - preloading skeletons');
}

// Preload function - now a no-op since we use pure on-demand loading
// Kept for backward compatibility
export function preloadAllSpineAnimations(onProgress = null) {
    return Promise.resolve();
}

// Track pending timeouts to cancel them when switching characters
let pendingSpineTimeouts = [];
// Track current character to prevent old animations from showing
let currentSpineCharacter = null;

// Show spine animation for character
export function initSpinePlayer(charData = null) {
    const container = DOM.spinePlayerContainer;
    if (!container) {
        console.warn('Spine: initSpinePlayer - No container found');
        return;
    }
    //console.log(`Spine: initSpinePlayer called for ${charData ? charData.en : 'null'}`);

    // CRITICAL: Cancel all pending timeouts from previous character selections
    pendingSpineTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    pendingSpineTimeouts = [];

    // Ensure manager is initialized
    ensureSpineManagerInit();

    // Check if Live2D is enabled
    if (!CONFIG.ENABLE_LIVE2D) {
        destroySpinePlayer();
        return;
    }

    // Check if character has spine URLs
    const hasSpineUrls = charData && charData.atlasUrl && charData.jsonUrl && charData.textureUrl;

    if (!hasSpineUrls) {
        //console.log('Spine: No spine URLs for this character, destroying player');
        destroySpinePlayer();
        return;
    }

    // Track this character by its name (most reliable - always matches displayed name)
    const characterKey = charData.en;
    currentSpineCharacter = characterKey;

    // IMPORTANT: Hide container immediately to prevent old Live2D from flashing
    // when switching between characters with Live2D
    container.style.transition = 'none'; // Disable transition for instant hide
    container.style.opacity = '0';
    container.style.display = 'none';

    // Force reflow to ensure the hide takes effect immediately
    void container.offsetWidth;

    // Show skeleton (will create on-demand if not cached)
    const manager = getSpineManager();

    // Track when skeleton loading started
    const loadStartTime = Date.now();
    const MIN_DISPLAY_DELAY = 800; // Minimum 1s delay before showing Live2D

    manager.showSkeleton({
        atlasUrl: charData.atlasUrl,
        jsonUrl: charData.jsonUrl,
        textureUrl: charData.textureUrl
    }, characterKey).then(() => { // Pass character name to manager
        //console.log(`Spine: Manager.showSkeleton promise resolved for ${characterKey}`);
        // Calculate how long the loading took
        const loadDuration = Date.now() - loadStartTime;

        // Ensure minimum delay is met (even if cached and loaded instantly)
        const remainingDelay = Math.max(0, MIN_DISPLAY_DELAY - loadDuration);

        const timeout1 = setTimeout(() => {
            // CRITICAL: Check if character is still current before showing
            if (currentSpineCharacter !== characterKey) {
                //console.log(`Spine: Skipping animation (timeout1) - character changed. Current: ${currentSpineCharacter}, Target: ${characterKey}`);
                return;
            }

            // EXTRA CHECK: Verify against manager's current character
            if (manager.currentCharacterName !== characterKey) {
                //console.log(`Spine: Skipping animation - manager character mismatch (expected: ${characterKey}, got: ${manager.currentCharacterName})`);
                return;
            }

            // EXTRA CHECK: Verify against actual displayed champion name
            const displayedChampName = DOM.selectedChampNameEl?.innerText || '';
            if (displayedChampName !== characterKey) {
                //console.log(`Spine: Skipping animation - name mismatch (expected: ${characterKey}, got: ${displayedChampName})`);
                return;
            }

            // First: Hide background image completely
            if (DOM.splashArtImg) {
                DOM.splashArtImg.style.transition = 'opacity 0.3s ease-in-out';
                DOM.splashArtImg.style.opacity = '0';

                // Wait for background to fully fade out before showing Spine
                const timeout2 = setTimeout(() => {
                    // CRITICAL: Double-check character is still current
                    if (currentSpineCharacter !== characterKey) {
                        //console.log(`Spine: Skipping animation (inner timeout) - character changed`);
                        return;
                    }

                    // EXTRA CHECK: Verify against manager's current character again
                    if (manager.currentCharacterName !== characterKey) {
                        // console.log(`Spine: Skipping animation (inner) - manager character mismatch`);
                        return;
                    }

                    // EXTRA CHECK: Verify against actual displayed champion name again
                    const displayedChampName2 = DOM.selectedChampNameEl?.innerText || '';
                    if (displayedChampName2 !== characterKey) {
                        //console.log(`Spine: Skipping animation (inner) - name mismatch`);
                        return;
                    }

                    DOM.splashArtImg.style.display = 'none';

                    // Now show and fade in Spine after background is hidden
                    // console.log('Spine: Showing final spine container');
                    container.style.display = 'block';
                    container.style.transition = 'opacity 0.3s ease-in-out';
                    // Force reflow to ensure transition works
                    void container.offsetWidth;
                    container.style.opacity = '1';
                }, 300); // Wait for background fade-out to complete

                pendingSpineTimeouts.push(timeout2);
            } else {
                // No background, just show Spine directly
                container.style.display = 'block';
                container.style.transition = 'opacity 0.3s ease-in-out';
                container.style.opacity = '1';
            }
        }, remainingDelay);

        pendingSpineTimeouts.push(timeout1);
    }).catch((err) => {
        console.error('Spine: Failed to show skeleton in initSpinePlayer:', err);
        // On error, just show container without fade
        container.style.display = 'block';
        container.style.opacity = '1';
    });
}

// Hide spine player
export function destroySpinePlayer() {
    //console.log('Spine: destroySpinePlayer called');
    // CRITICAL: Cancel all pending timeouts to prevent interference
    pendingSpineTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    pendingSpineTimeouts = [];

    // Reset current character tracking
    currentSpineCharacter = null;

    const manager = getSpineManager();
    const container = DOM.spinePlayerContainer;

    if (container && container.style.display !== 'none') {
        // Fade out Spine
        container.style.transition = 'opacity 0.3s ease-in-out';
        container.style.opacity = '0';

        setTimeout(() => {
            manager.hideSkeleton();
            container.style.display = 'none';
        }, 300);
    } else {
        manager.hideSkeleton();
        if (container) container.style.display = 'none';
    }

    // Show background image again immediately (no fade needed since Spine is being destroyed)
    if (DOM.splashArtImg && DOM.splashArtImg.src && !DOM.splashArtImg.src.endsWith('/')) {
        // Reset any pending transitions
        DOM.splashArtImg.style.transition = 'none';
        DOM.splashArtImg.style.display = 'block';
        DOM.splashArtImg.style.opacity = '1';
    }
}

export function truncateName(name, maxLength = 18) {
    if (name && name.length > maxLength) {
        return name.substring(0, maxLength) + '...';
    }
    return name;
}

export function truncateNameNoDot(name, maxLength = 18) {
    if (name && name.length > maxLength) {
        return name.substring(0, maxLength);
    }
    return name;
}

export function preloadSplashArts(charList) {
    charList.forEach(char => {
        if (char.background) {
            const img = new Image();
            img.src = char.background;
        }
    });
}

export function renderChampionGrid(charList) {
    DOM.champGridEl.innerHTML = "";
    charList.forEach(char => {
        const item = document.createElement('div');
        item.className = 'champ-item';
        item.dataset.name = char.en;
        item.innerHTML = `<img src="${char.icon}" alt="${char.en}" title="${char.en}"><div class="grid-champ-name">${truncateName(char.en, 13)}</div>`;

        item.onclick = () => {
            const room = state.currentRoomState;
            if (item.classList.contains('disabled') || !room?.nextTurn || room.paused || room.nextTurn.team !== state.socket.id) return;

            document.querySelectorAll('.champ-item.pre-selected').forEach(el => el.classList.remove('pre-selected'));
            item.classList.add('pre-selected');
            state.preSelectedChamp = char;
            DOM.lockInButton.disabled = false;

            emitPreSelectChamp(char.en);
        };
        DOM.champGridEl.appendChild(item);
    });
}

export function updateSplashArt(champName) {
    const charData = state.characters[champName];
    const room = state.currentRoomState;
    const turn = room?.nextTurn;

    if (charData) {
        DOM.splashArtContainer.style.display = 'block';

        // Always show background immediately with full opacity
        // Spine will load on-demand in initSpinePlayer
        DOM.splashArtImg.style.display = 'block';
        DOM.splashArtImg.style.opacity = '1'; // Ensure full visibility
        DOM.splashArtImg.src = charData.background || '';

        // Hiển thị SpinePlayer animation với URL từ character (nếu có)
        // This will create skeleton on-demand if not cached
        initSpinePlayer(charData);

        let turnText = '';
        if (turn) {
            const playerName = room.players[turn.team]?.name || '???';
            const actionText = turn.type.toUpperCase() === "PICK" ? "CHỌN" : "CẤM";
            turnText = `${truncateName(playerName).toUpperCase()}: ${actionText}`;
        }
        // Hide splash-art-name when champion is selected (turn info is in player card now)
        if (DOM.splashArtNameEl) {
            DOM.splashArtNameEl.style.display = 'none';
        }

        if (DOM.selectedChampNameEl) {
            DOM.selectedChampNameEl.innerText = charData.en;
            DOM.selectedChampNameEl.style.display = 'block';
        }

        // Update stats display
        updateChampionStatsDisplay(charData.en);

        // Update info display (element and rank)
        updateChampionInfoDisplay(charData);

    } else { // Trường hợp không có tướng (lượt mới, skip,...)
        DOM.splashArtContainer.style.display = 'block'; // Luôn hiển thị container
        DOM.splashArtImg.src = '';
        DOM.splashArtImg.style.display = 'none';

        // Ẩn SpinePlayer animation
        destroySpinePlayer();

        let text = '';
        if (turn) {
            const playerName = room.players[turn.team]?.name || '???';
            const actionText = turn.type.toUpperCase() === "PICK" ? "CHỌN" : "CẤM";
            text = `${truncateName(playerName).toUpperCase()}: ${actionText}`;
        } else if (room?.state === 'pre-draft-selection') {
            // Giai đoạn chọn tướng không sở hữu
            const notReadyPlayers = room.playerOrder.filter(id => !room.preDraftReady?.[id]);
            if (notReadyPlayers.length > 1) {
                text = `Đợi ${notReadyPlayers.length} người chơi...`;
            } else if (notReadyPlayers.length === 1) {
                const waitingForPlayerId = notReadyPlayers[0];
                const playerName = room.playerHistory[waitingForPlayerId]?.name || 'Player';
                text = `Đợi ${truncateName(playerName)}...`;
            } else {
                text = 'Đợi host bắt đầu...';
            }
        } else if (room?.state === 'drafting' && room?.actions?.length === 0) {
            // Giai đoạn drafting nhưng host chưa chọn người đi trước
            text = 'Đợi host bắt đầu...';
        } else if (!turn && room?.actions?.length > 0) {
            // Trường hợp draft đã kết thúc
            text = 'DRAFT COMPLETE';
        } else {
            text = 'Đợi người chơi...';
        }

        // Show splash-art-name only:
        // 1. Before drafting starts (no turn yet)
        // 2. After drafting completes (no turn but has actions)
        // Hide as soon as turn exists (host selected first player)
        if (DOM.splashArtNameEl) {
            const shouldShow = !turn && (
                (room?.state === 'pre-draft-selection') ||
                (room?.state === 'drafting' && room?.actions?.length === 0) ||
                (room?.actions?.length > 0)
            );

            if (shouldShow) {
                DOM.splashArtNameEl.innerText = text;
                DOM.splashArtNameEl.style.display = 'block';
                DOM.splashArtNameEl.style.color = 'white';
            } else {
                DOM.splashArtNameEl.style.display = 'none';
            }
        }

        if (DOM.selectedChampNameEl) {
            DOM.selectedChampNameEl.innerText = '';
            DOM.selectedChampNameEl.style.display = 'none';
        }

        // Hide stats display
        updateChampionStatsDisplay(null);

        // Hide info display
        updateChampionInfoDisplay(null);
    }
}

export function setupInitialSlots() {
    for (let i = 0; i < CONSTANTS.BAN_SLOTS_COUNT; i++) {
        const blueBanSlot = DOM.blueBansEl.appendChild(document.createElement("div"));
        blueBanSlot.className = "slot blue";
        blueBanSlot.dataset.turnNumber = i + 1;
        const redBanSlot = DOM.redBansEl.appendChild(document.createElement("div"));
        redBanSlot.className = "slot red";
        redBanSlot.dataset.turnNumber = i + 1;
    }
    let bluePickCounter = 1;
    let redPickCounter = 1;
    for (let i = 0; i < CONSTANTS.PICK_SLOTS_COUNT; i++) {
        const blueSlot = document.createElement("div");
        blueSlot.className = "slot blue";
        blueSlot.dataset.turnNumber = bluePickCounter++;
        const redSlot = document.createElement("div");
        redSlot.className = "slot red";
        redSlot.dataset.turnNumber = redPickCounter++;
        if (i < CONSTANTS.P1_PICK_SLOTS_COUNT) {
            DOM.bluePicksP1El.appendChild(blueSlot);
            DOM.redPicksP1El.appendChild(redSlot);
        } else {
            DOM.bluePicksP2El.appendChild(blueSlot);
            DOM.redPicksP2El.appendChild(redSlot);
        }
    }
}
