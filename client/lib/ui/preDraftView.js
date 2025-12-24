import { DOM } from '../constants.js';
import { state } from '../state.js';
import { emitConfirmPreDraft, emitPreDraftSelect } from '../services/socket.js';
import { debounce } from '../utils/debounce.js';

// Logic cho màn hình chọn tướng không sở hữu
function truncateNameNoDot(name, maxLength = 18) {
    if (name && name.length > maxLength) {
        return name.substring(0, maxLength) + '..';
    }
    return name;
}

function renderPreDraftChampionGrid(filterText = "") {
    DOM.preDraftMyGridEl.innerHTML = "";
    const localSelections = state.currentRoomState.preDraftSelections?.[state.socket.id] || [];

    state.uniqueCharacters.forEach(char => {
        if (filterText && !char.en.toLowerCase().includes(filterText.toLowerCase())) {
            return;
        }

        const item = document.createElement('div');
        item.className = 'champ-item';
        item.dataset.name = char.en;
        item.innerHTML = `<img src="${char.icon}" alt="${char.en}" title="${char.en}"><div class="grid-champ-name">${truncateNameNoDot(char.en, 13)}</div>`;

        if (localSelections.includes(char.en)) {
            item.classList.add('pre-draft-selected');
        }

        item.onclick = () => {
            const isSelected = state.myPreDraftSelection.includes(char.en);
            if (isSelected) {
                state.myPreDraftSelection = state.myPreDraftSelection.filter(c => c !== char.en);
            } else {
                state.myPreDraftSelection.push(char.en);
            }
            emitPreDraftSelect(state.myPreDraftSelection);

            if (state.myPlayerName) {
                localStorage.setItem(`unownedChamps_${state.myPlayerName}`, JSON.stringify(state.myPreDraftSelection));
            }
        };
        DOM.preDraftMyGridEl.appendChild(item);
    });
}

function updatePreDraftMySelections() {
    DOM.preDraftMySelectionsEl.innerHTML = "";
    const selections = state.currentRoomState.preDraftSelections?.[state.socket.id] || [];
    selections.forEach(champName => {
        const char = state.characters[champName];
        if (!char) return;
        DOM.preDraftMySelectionsEl.innerHTML += `
            <div class="champ-item" title="${char.en}">
                <img src="${char.icon}" alt="${char.en}">
                <div class="pre-draft-display-champ-name">${char.en}</div>
            </div>`;
    });
}

export function initializePreDraftView() {
    DOM.confirmPreDraftBtn.onclick = emitConfirmPreDraft;

    if (DOM.preDraftSearchInput) {
        DOM.preDraftSearchInput.addEventListener('input', debounce((e) => {
            const value = e.target.value;
            renderPreDraftChampionGrid(value);
            if (DOM.preDraftClearSearchBtn) {
                DOM.preDraftClearSearchBtn.style.display = value ? 'block' : 'none';
            }
        }, 200)); // 200ms debounce
    }

    if (DOM.preDraftClearSearchBtn) {
        DOM.preDraftClearSearchBtn.addEventListener('click', () => {
            DOM.preDraftSearchInput.value = '';
            renderPreDraftChampionGrid("");
            DOM.preDraftClearSearchBtn.style.display = 'none';
            DOM.preDraftSearchInput.focus();
        });
    }
}

export function handlePreDraftPhase(room) {
    const isPreDraftPhase = room.state === 'pre-draft-selection';
    const isMyTurnToSelect = isPreDraftPhase && state.myRole === 'player' && !room.preDraftReady?.[state.socket.id];

    if (isMyTurnToSelect) {
        DOM.preDraftViewEl.style.display = 'block';
        DOM.teamsContainerEl.style.display = 'none';
        DOM.champSelectionControlsEl.style.display = 'none';

        // Load unowned champs from localStorage
        if (!state.hasLoadedFromStorage && state.myPlayerName) {
            const savedChampsJSON = localStorage.getItem(`unownedChamps_${state.myPlayerName}`);
            if (savedChampsJSON) {
                try {
                    const savedChamps = JSON.parse(savedChampsJSON);
                    if (Array.isArray(savedChamps)) {
                        state.myPreDraftSelection = savedChamps;
                        emitPreDraftSelect(state.myPreDraftSelection);
                    }
                } catch (e) { console.error("Error reading from localStorage:", e); }
            }
            state.hasLoadedFromStorage = true;
        }

        DOM.preDraftPlayerNameEl.innerText = room.players[state.socket.id]?.name || '';
        renderPreDraftChampionGrid();
        updatePreDraftMySelections();

        // Update confirm button state
        const isReady = room.preDraftReady?.[state.socket.id];
        DOM.confirmPreDraftBtn.disabled = isReady;
        DOM.confirmPreDraftBtn.innerText = isReady ? 'Đã xác nhận' : 'Xác nhận';
        DOM.confirmPreDraftBtn.classList.toggle('btn-secondary', isReady);
        DOM.confirmPreDraftBtn.classList.toggle('btn-success', !isReady);
    } else {
        DOM.preDraftViewEl.style.display = 'none';
        DOM.teamsContainerEl.style.display = 'flex';
    }

    return isMyTurnToSelect; // Trả về để draftView biết có cần render phần còn lại không
}
