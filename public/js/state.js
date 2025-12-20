// Quản lý trạng thái của client
export const state = {
    socket: null,
    myRoom: null,
    myRole: null,
    myPlayerName: null,
    currentRoomState: null,
    characters: {},
    uniqueCharacters: [],
    preSelectedChamp: null,
    remotePreSelectedChamp: null,
    myPreDraftSelection: [],
    hasLoadedFromStorage: false,
    hasShownBanPickView: false, // Track if ban/pick view has been shown
    isDraftComplete: false, // Track if draft has finished
};
