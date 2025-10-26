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
};
