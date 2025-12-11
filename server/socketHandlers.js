import { rooms, createRoom, deleteRoom, getSafeRoomState } from "./roomManager.js";
import { generateDraftOrder, startCountdown, resumeCountdown, nextTurn } from "./gameLogic.js";

let ioInstance;

// Hàm helper để broadcast state, tránh lặp code
export function broadcastRoomState(roomId) {
    if (!ioInstance) return;
    const safeRoom = getSafeRoomState(roomId);
    if (safeRoom) {
        ioInstance.to(roomId).emit("room-state", safeRoom);
    }
}

// Khởi tạo tất cả các listener cho một socket
export function initializeSocketHandlers(io, socket) {
    if (!ioInstance) ioInstance = io;

    // --- Handlers ---
    socket.on("join-room", ({ roomId, role, playerName }) => handleJoinRoom(io, socket, { roomId, role, playerName }));
    socket.on("choose-first", (data) => handleChooseFirst(socket, data));
    socket.on("select-champ", (data) => handleSelectChamp(socket, data));
    socket.on("pre-select-champ", (data) => handlePreSelectChamp(socket, data));
    socket.on('pre-draft-select', (data) => handlePreDraftSelect(socket, data));
    socket.on('confirm-pre-draft', (data) => handleConfirmPreDraft(socket, data));
    socket.on('close-room', (data) => handleCloseRoom(io, socket, data));
    socket.on('toggle-pause', (data) => handleTogglePause(socket, data));
    socket.on('set-countdown', (data) => handleSetCountdown(socket, data));
    socket.on('kick-player', (data) => handleKickPlayer(io, socket, data));
    socket.on('chat-message', (data) => handleChatMessage(io, socket, data));
    socket.on("disconnect", () => handleDisconnect(io, socket));
}

// --- Chi tiết các Handler ---

function handleJoinRoom(io, socket, { roomId, role, playerName }) {
    if (role === 'host' && !rooms[roomId]) {
        createRoom(roomId, socket.id);
        if (rooms[roomId]) rooms[roomId].chatHistory = []; // Initialize chat history
    }

    const room = rooms[roomId];
    if (!room) return socket.emit("draft-error", { message: "Room not found." });

    // Initialize chatHistory if missing (for existing rooms)
    if (!room.chatHistory) room.chatHistory = [];

    room.io = io; // Gán io instance vào room để các module khác dùng
    socket.join(roomId);
    socket.data = { roomId, role };

    if (role === 'player') {
        handlePlayerJoin(socket, room, playerName);
    } else if (role === 'host') {
        room.hostId = socket.id;
    }

    if (room.playerOrder.length >= 1 && room.state === 'waiting') {
        room.state = 'pre-draft-selection';
    }

    broadcastRoomState(roomId);

    // Send chat history to the joining user
    socket.emit('chat-history', room.chatHistory);
}

// ... (other functions)

function handlePlayerJoin(socket, room, playerName) {
    const oldPlayerEntry = Object.entries(room.playerHistory).find(([id, data]) => data.name === playerName && !room.players[id]);

    if (oldPlayerEntry) { // Reconnect logic
        const [oldSocketId] = oldPlayerEntry;
        const newSocketId = socket.id;
        console.log(`Player ${playerName} reconnected. Mapping ${oldSocketId} to ${newSocketId}`);

        // Cập nhật các cấu trúc dữ liệu với socket.id mới
        const updateId = (obj) => { if (obj && obj.team === oldSocketId) obj.team = newSocketId; };
        room.playerOrder = room.playerOrder.map(id => (id === oldSocketId ? newSocketId : id));
        room.players[newSocketId] = room.playerHistory[oldSocketId];
        delete room.playerHistory[oldSocketId];
        room.playerHistory[newSocketId] = room.players[newSocketId];
        room.draftOrder.forEach(updateId);
        room.actions.forEach(updateId);
        updateId(room.nextTurn);
        if (room.preDraftSelections?.[oldSocketId]) {
            room.preDraftSelections[newSocketId] = room.preDraftSelections[oldSocketId];
            delete room.preDraftSelections[oldSocketId];
        }
        if (room.preDraftReady?.[oldSocketId]) {
            room.preDraftReady[newSocketId] = room.preDraftReady[oldSocketId];
            delete room.preDraftReady[oldSocketId];
        }
    } else if (Object.keys(room.players).length >= 2) {
        socket.emit("draft-error", { message: "Room is full." });
    } else { // New player logic
        const playerData = { name: playerName };
        room.players[socket.id] = playerData;
        room.playerHistory[socket.id] = playerData;
        room.playerOrder.push(socket.id);
        console.log(`Player ${playerName} (${socket.id}) joined room ${room.id}`);
    }
}


function handleChooseFirst(socket, { roomId, team }) {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id || room.state !== 'drafting' || room.draftOrder.length > 0) return;
    if (room.playerOrder.length !== 2) return socket.emit("draft-error", { message: "Cần có đủ 2 người chơi." });

    const secondPlayerId = room.playerOrder.find(id => id !== team);
    room.draftOrder = generateDraftOrder(team, secondPlayerId, 1);
    room.currentTurn = 0;
    room.phase = 1;
    room.nextTurn = room.draftOrder[0];
    startCountdown(roomId);
    broadcastRoomState(roomId);
}

function handleSelectChamp(socket, { roomId, champ }) {
    const room = rooms[roomId];
    if (!room) return;
    const turn = room.draftOrder?.[room.currentTurn];
    if (!turn || socket.id !== turn.team) return;

    room.actions.push({ team: turn.team, type: turn.type, champ });
    nextTurn(roomId);
}

function handlePreSelectChamp(socket, { roomId, champ }) {
    ioInstance.to(roomId).emit("pre-select-update", { champ });
}

function handlePreDraftSelect(socket, { roomId, champs }) {
    const room = rooms[roomId];
    if (!room || room.state !== 'pre-draft-selection') return;
    room.preDraftSelections[socket.id] = champs;
    broadcastRoomState(roomId);
}

function handleConfirmPreDraft(socket, { roomId }) {
    const room = rooms[roomId];
    if (!room || room.state !== 'pre-draft-selection') return;
    room.preDraftReady[socket.id] = true;

    const allPlayersIn = room.playerOrder.length === 2;
    const allPlayersReady = allPlayersIn && room.playerOrder.every(id => room.preDraftReady[id]);
    if (allPlayersReady) {
        room.state = 'drafting';
    }
    broadcastRoomState(roomId);
}

function handleCloseRoom(io, socket, { roomId }) {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
        io.to(roomId).emit("host-left");
        deleteRoom(roomId);
    }
}

function handleTogglePause(socket, { roomId }) {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id && room.nextTurn) {
        if (room.paused) {
            resumeCountdown(roomId);
        } else {
            // Hủy timeout hiện tại và tính thời gian còn lại
            clearTimeout(room.timer);
            room.remainingTime = Math.max(0, room.countdownEndTime - Date.now());

            room.paused = true;
            broadcastRoomState(roomId);
        }
    }
}

function handleSetCountdown(socket, { roomId, time }) {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id && time > 0) {
        room.countdownDuration = time;
        broadcastRoomState(roomId);
    }
}

function handleKickPlayer(io, socket, { roomId, playerIdToKick }) {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;
    const kickedSocket = io.sockets.sockets.get(playerIdToKick);
    if (kickedSocket) {
        kickedSocket.emit('kicked', { reason: 'Kicked by host' });
        kickedSocket.leave(roomId);
        kickedSocket.disconnect(true);
    }
}

function handleChatMessage(io, socket, { roomId, message, sender }) {
    const room = rooms[roomId];
    if (!room) return;

    const msgData = { sender, message, timestamp: Date.now() };

    // Store in history
    if (!room.chatHistory) room.chatHistory = [];
    room.chatHistory.push(msgData);

    // Limit history length (e.g., 50 messages)
    if (room.chatHistory.length > 50) {
        room.chatHistory.shift();
    }

    io.to(roomId).emit('chat-message', msgData);
}

function handleDisconnect(io, socket) {
    const { roomId, role } = socket.data;
    const room = rooms[roomId];
    if (!room) return;

    if (role === 'host' || room.hostId === socket.id) {
        io.to(roomId).emit("host-left");
        deleteRoom(roomId);
    } else { // Player disconnect
        delete room.players[socket.id];
        if (room.nextTurn && !room.paused) {
            clearTimeout(room.timer); // Hủy timeout khi người chơi thoát

            // TÍNH TOÁN VÀ LƯU LẠI THỜI GIAN CÒN LẠI (FIX)
            room.remainingTime = Math.max(0, room.countdownEndTime - Date.now());
            room.paused = true;

        }
        console.log(`Player ${socket.id} disconnected from room ${roomId}`);
        broadcastRoomState(roomId);
    }
}
