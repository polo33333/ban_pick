import { DOM, CONSTANTS, CONFIG } from '../constants.js';
import { state } from '../state.js';
import { emitPreSelectChamp, emitSelectChamp } from '../services/socket.js';

// Chứa các hàm render các thành phần UI nhỏ, tái sử dụng được

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

// Show spine animation for character
export function initSpinePlayer(charData = null) {
    const container = DOM.spinePlayerContainer;
    if (!container) return;

    // Ensure manager is initialized
    ensureSpineManagerInit();

    // Check if Live2D is enabled
    if (!CONFIG.ENABLE_LIVE2D) {
        destroySpinePlayer();
        return;
    }

    // Check if character has spine URLs
    const hasSpineUrls = charData && charData.atlasUrl && charData.binaryUrl && charData.textureUrl;

    if (!hasSpineUrls) {
        destroySpinePlayer();
        return;
    }

    // Fade out container initially
    container.style.opacity = '0';
    container.style.display = 'block';

    // Show skeleton (will create on-demand if not cached)
    const manager = getSpineManager();
    manager.showSkeleton({
        atlasUrl: charData.atlasUrl,
        binaryUrl: charData.binaryUrl,
        textureUrl: charData.textureUrl
    }).then(() => {
        // Add delay before transition for smoother effect
        setTimeout(() => {
            // Spine loaded successfully - fade in Spine
            container.style.transition = 'opacity 0.3s ease-in-out';
            container.style.opacity = '1';

            // Hide background image when Spine is shown
            if (DOM.splashArtImg) {
                DOM.splashArtImg.style.transition = 'opacity 0.3s ease-in-out';
                DOM.splashArtImg.style.opacity = '0';
                setTimeout(() => {
                    DOM.splashArtImg.style.display = 'none';
                }, 500);
            }
        }, 300); // Delay 200ms for smoother transition
    }).catch(() => {
        // On error, just show container without fade
        container.style.opacity = '1';
    });
}

// Hide spine player
export function destroySpinePlayer() {
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

    // Show background image again with fade in
    if (DOM.splashArtImg && DOM.splashArtImg.src && !DOM.splashArtImg.src.endsWith('/')) {
        DOM.splashArtImg.style.display = 'block';
        DOM.splashArtImg.style.transition = 'opacity 0.3s ease-in-out';
        // Force reflow to ensure transition works
        void DOM.splashArtImg.offsetWidth;
        DOM.splashArtImg.style.opacity = '1';
    }
}

export function truncateName(name, maxLength = 6) {
    if (name && name.length > maxLength) {
        return name.substring(0, maxLength) + '...';
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
        item.innerHTML = `<img src="${char.icon}" alt="${char.en}" title="${char.en}"><div class="grid-champ-name">${char.en}</div>`;

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
        DOM.splashArtNameEl.innerText = turnText;
        const playerOrder = room.playerOrder || [];
        DOM.splashArtNameEl.style.color = turn ? (playerOrder[0] === turn.team ? '#0093ff' : 'red') : 'white';

        if (DOM.selectedChampNameEl) {
            DOM.selectedChampNameEl.innerText = charData.en;
            DOM.selectedChampNameEl.classList.remove('d-none');
            DOM.selectedChampNameEl.classList.add('d-flex');
        }

        if (DOM.selectedChampElementContainer) {
            if (charData.element && CONSTANTS.ELEMENT_NAMES[charData.element]) {
                DOM.selectedChampElementContainer.classList.remove('d-none');
                DOM.selectedChampElementContainer.classList.add('d-flex');
                DOM.selectedChampElementEl.src = `/element/${CONSTANTS.ELEMENT_NAMES[charData.element]}.webp`;
                DOM.selectedChampElementNameEl.innerText = CONSTANTS.ELEMENT_NAMES[charData.element];
            } else {
                DOM.selectedChampElementContainer.classList.add('d-none');
                DOM.selectedChampElementContainer.classList.remove('d-flex');
            }
        }

        if (DOM.selectedChampRankContainer) {
            if (charData.rank) {
                DOM.selectedChampRankContainer.classList.remove('d-none');
                DOM.selectedChampRankContainer.classList.add('d-flex');
                DOM.selectedChampRankEl.innerHTML = '★'.repeat(charData.rank);
            } else {
                DOM.selectedChampRankContainer.classList.add('d-none');
                DOM.selectedChampRankContainer.classList.remove('d-flex');
            }
        }

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
        DOM.splashArtNameEl.innerText = text;
        const playerOrder = room?.playerOrder || [];
        DOM.splashArtNameEl.style.color = turn ? (playerOrder[0] === turn.team ? '#0093ff' : 'red') : 'white';

        if (DOM.selectedChampNameEl) {
            DOM.selectedChampNameEl.innerText = '';
            DOM.selectedChampNameEl.classList.add('d-none');
            DOM.selectedChampNameEl.classList.remove('d-flex');
        }

        if (DOM.selectedChampElementContainer) {
            DOM.selectedChampElementContainer.classList.add('d-none');
            DOM.selectedChampElementContainer.classList.remove('d-flex');
        }

        if (DOM.selectedChampRankContainer) {
            DOM.selectedChampRankContainer.classList.add('d-none');
            DOM.selectedChampRankContainer.classList.remove('d-flex');
        }
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
