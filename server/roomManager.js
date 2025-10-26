// Quản lý trạng thái, tạo, xóa phòng
export const rooms = {};

export function createRoom(roomId, hostId) {
    if (rooms[roomId]) return;
    rooms[roomId] = {
        state: 'waiting',
        preDraftSelections: {},
        preDraftReady: {},
        id: roomId,
        actions: [],
        currentTurn: -1,
        nextTurn: null,
        hostId: hostId,
        countdownDuration: 30,
        timer: null,
        draftOrder: [],
        phase: 1,
        paused: false,
        players: {},
        playerOrder: [],
        playerHistory: {},
    };
    console.log(`Room created: ${roomId} (host ${hostId})`);
}

export function deleteRoom(roomId) {
    const room = rooms[roomId];
    if (room) {
        clearInterval(room.timer);
        delete rooms[roomId];
        console.log(`Room ${roomId} closed.`);
    }
}

export function getSafeRoomState(roomId) {
    const room = rooms[roomId];
    if (!room) return null;

    // Trả về một bản sao an toàn của state, không chứa các đối tượng nhạy cảm như timer
    return {
        id: room.id,
        state: room.state,
        preDraftSelections: room.preDraftSelections,
        preDraftReady: room.preDraftReady,
        actions: room.actions,
        currentTurn: room.currentTurn,
        nextTurn: room.nextTurn,
        hostId: room.hostId,
        countdown: room.countdown,
        countdownDuration: room.countdownDuration,
        phase: room.phase,
        players: room.players,
        paused: room.paused,
        draftOrder: room.draftOrder,
        playerOrder: room.playerOrder,
        playerHistory: room.playerHistory,
    };
}
