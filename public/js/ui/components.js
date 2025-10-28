import { DOM, CONSTANTS } from '../constants.js';
import { state } from '../state.js';
import { emitPreSelectChamp, emitSelectChamp } from '../services/socket.js';

// Chứa các hàm render các thành phần UI nhỏ, tái sử dụng được

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
        DOM.splashArtImg.style.display = 'block';
        DOM.splashArtImg.src = charData.background || '';
        
        let turnText = '';
        if (turn) {
            const playerName = room.players[turn.team]?.name || '???';
            const actionText = turn.type.toUpperCase() === "PICK" ? "CHỌN" : "CẤM";
            turnText = `${truncateName(playerName).toUpperCase()}: ${actionText}`;
        }
        DOM.splashArtNameEl.innerText = turnText;
        const playerOrder = room.playerOrder || [];
        DOM.splashArtNameEl.style.color = turn ? (playerOrder[0] === turn.team ? '#0093ff' : 'red') : 'white';

    } else { // Trường hợp không có tướng (lượt mới, skip,...)
        DOM.splashArtContainer.style.display = 'block'; // Luôn hiển thị container
        DOM.splashArtImg.src = '';
        DOM.splashArtImg.style.display = 'none';
        
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
