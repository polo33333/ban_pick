// Chứa các hằng số và các element DOM
export const DOM = {
    loginViewEl: document.getElementById("login-view"),
    draftViewEl: document.getElementById("draft-view"),
    champSelectionControlsEl: document.getElementById("champ-selection-controls"),
    currentTurnEl: document.getElementById("current-turn"),
    roomIdInput: document.getElementById("roomId"),
    roleSelect: document.getElementById("role"),
    playerNameInput: document.getElementById("playerName"),
    playerNameContainer: document.getElementById("playerName-container"),
    joinBtn: document.getElementById("join"),
    champSearchInput: document.getElementById("champ-search"),
    champGridEl: document.getElementById("champ-grid"),
    clearSearchBtn: document.getElementById("clear-search-btn"),
    lockInButton: document.getElementById("lock-in-button"),
    blueBansEl: document.getElementById("blue-bans"),
    redBansEl: document.getElementById("red-bans"),
    bluePicksP1El: document.getElementById("blue-picks-p1"),
    bluePicksP2El: document.getElementById("blue-picks-p2"),
    redPicksP1El: document.getElementById("red-picks-p1"),
    redPicksP2El: document.getElementById("red-picks-p2"),
    preDraftViewEl: document.getElementById("pre-draft-selection-view"),
    teamsContainerEl: document.getElementById("teams-container"),
    confirmPreDraftBtn: document.getElementById("confirm-pre-draft-button"),
    preDraftMyGridEl: document.getElementById("pre-draft-my-champ-grid"),
    preDraftMySelectionsEl: document.getElementById("pre-draft-my-selections"),
    preDraftPlayerNameEl: document.getElementById("pre-draft-player-name"),
    p1PreDraftDisplayEl: document.getElementById("p1-pre-draft-display"),
    p2PreDraftDisplayEl: document.getElementById("p2-pre-draft-display"),
    splashArtContainer: document.getElementById('splash-art-container'),
    splashArtImg: document.getElementById('splash-art-img'),
    splashArtNameEl: document.getElementById('splash-art-name'),
    countdownText: document.getElementById("countdown-text"),
    countdownBar: document.getElementById('countdown-bar'),
    hostControlsToggle: document.getElementById("host-controls-toggle"),
    kickButtonsContainer: document.getElementById("kick-buttons-container"),
    preDraftControls: document.getElementById("pre-draft-controls"),
    playerStatusEl: document.getElementById("player-status"),
    firstPickStatusEl: document.getElementById("first-pick-status"),
    player1NameEl: document.querySelector('#player1-container h3'),
    player2NameEl: document.querySelector('#player2-container h3'),
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
    }
};
