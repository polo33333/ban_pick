// Chứa các hằng số và các element DOM
export const DOM = {
    get loginViewEl() { return document.getElementById("login-view"); },
    get draftViewEl() { return document.getElementById("draft-view"); },
    get champSelectionControlsEl() { return document.getElementById("champ-selection-controls"); },
    get currentTurnEl() { return document.getElementById("current-turn"); },
    get roomIdInput() { return document.getElementById("roomId"); },
    get copyRoomIdBtn() { return document.getElementById("copyRoomIdBtn"); },
    get roleSelect() { return document.getElementById("role"); },
    get playerNameInput() { return document.getElementById("playerName"); },
    get playerNameContainer() { return document.getElementById("playerName-container"); },
    get joinBtn() { return document.getElementById("join"); },
    get champSearchInput() { return document.getElementById("champ-search"); },
    get champGridEl() { return document.getElementById("champ-grid"); },
    get clearSearchBtn() { return document.getElementById("clear-search-btn"); },
    get lockInButton() { return document.getElementById("lock-in-button"); },
    get blueBansEl() { return document.getElementById("blue-bans"); },
    get redBansEl() { return document.getElementById("red-bans"); },
    get bluePicksP1El() { return document.getElementById("blue-picks-p1"); },
    get bluePicksP2El() { return document.getElementById("blue-picks-p2"); },
    get redPicksP1El() { return document.getElementById("red-picks-p1"); },
    get redPicksP2El() { return document.getElementById("red-picks-p2"); },
    get preDraftViewEl() { return document.getElementById("pre-draft-selection-view"); },
    get teamsContainerEl() { return document.getElementById("teams-container"); },
    get confirmPreDraftBtn() { return document.getElementById("confirm-pre-draft-button"); },
    get preDraftMyGridEl() { return document.getElementById("pre-draft-my-champ-grid"); },
    get preDraftMySelectionsEl() { return document.getElementById("pre-draft-my-selections"); },
    get preDraftPlayerNameEl() { return document.getElementById("pre-draft-player-name"); },
    get p1PreDraftDisplayEl() { return document.getElementById("p1-pre-draft-display"); },
    get p2PreDraftDisplayEl() { return document.getElementById("p2-pre-draft-display"); },
    get splashArtContainer() { return document.getElementById('splash-art-container'); },
    get splashArtImg() { return document.getElementById('splash-art-img'); },
    get splashArtNameEl() { return document.getElementById('splash-art-name'); },
    get selectedChampNameEl() { return document.getElementById('selected-champ-name'); },
    get selectedChampElementEl() { return document.getElementById('selected-champ-element'); },
    get selectedChampElementContainer() { return document.getElementById('selected-champ-element-container'); },
    get selectedChampElementNameEl() { return document.getElementById('selected-champ-element-name'); },
    get selectedChampRankContainer() { return document.getElementById('selected-champ-rank-container'); },
    get selectedChampRankEl() { return document.getElementById('selected-champ-rank'); },
    get countdownText() { return document.getElementById("countdown-text"); },
    get countdownBar() { return document.getElementById('countdown-bar'); },
    get hostControlsToggle() { return document.getElementById("host-controls-toggle"); },
    get kickButtonsContainer() { return document.getElementById("kick-buttons-container"); },
    get preDraftControls() { return document.getElementById("pre-draft-controls"); },
    get preDraftSearchInput() { return document.getElementById("pre-draft-search"); },
    get preDraftClearSearchBtn() { return document.getElementById("pre-draft-search-clear"); },
    get playerStatusEl() { return document.getElementById("player-status"); },
    get firstPickStatusEl() { return document.getElementById("first-pick-status"); },
    get player1NameEl() { return document.querySelector('#player1-container h3'); },
    get player2NameEl() { return document.querySelector('#player2-container h3'); },
};

export const CONSTANTS = {
    BAN_SLOTS_COUNT: 2,
    PICK_SLOTS_COUNT: 9,
    P1_PICK_SLOTS_COUNT: 4,
    ELEMENT_COLORS: {
        1: '#a0e9ff', // Glacio
        2: '#ff9999', // Fusion
        3: '#e3b3ff', // Electro
        4: '#99ffd6', // Aero
        5: '#fff3a0', // Spectro
        6: '#ad6f30'  // Havoc
    },
    ELEMENT_NAMES: {
        1: 'Glacio',
        2: 'Fusion',
        3: 'Electro',
        4: 'Aero',
        5: 'Spectro',
        6: 'Havoc'
    }
};
