import { rooms } from "./roomManager.js";
import { broadcastRoomState } from "./socketHandlers.js";

// Chứa các logic cốt lõi của game: tạo lượt, chuyển lượt, countdown...

export function generateDraftOrder(firstPlayerId, secondPlayerId, phase = 1) {
    const phase1 = [
        { team: firstPlayerId, type: "ban" }, { team: secondPlayerId, type: "ban" },
        { team: firstPlayerId, type: "pick" }, { team: secondPlayerId, type: "pick" },
        { team: secondPlayerId, type: "pick" }, { team: firstPlayerId, type: "pick" },
        { team: firstPlayerId, type: "pick" }, { team: secondPlayerId, type: "pick" },
        { team: secondPlayerId, type: "pick" }, { team: firstPlayerId, type: "pick" },
    ];
    const phase2 = [
        { team: secondPlayerId, type: "ban" }, { team: firstPlayerId, type: "ban" },
        { team: secondPlayerId, type: "pick" }, { team: firstPlayerId, type: "pick" },
        { team: firstPlayerId, type: "pick" }, { team: secondPlayerId, type: "pick" },
        { team: secondPlayerId, type: "pick" }, { team: firstPlayerId, type: "pick" },
        { team: firstPlayerId, type: "pick" }, { team: secondPlayerId, type: "pick" },
        { team: secondPlayerId, type: "pick" }, { team: firstPlayerId, type: "pick" },
    ];
    return phase === 1 ? phase1 : phase2;
}

export function startCountdown(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    clearInterval(room.timer);
    room.countdown = room.countdownDuration || 30;
    room.paused = false;

    room.timer = setInterval(() => {
        if (room.paused) {
            clearInterval(room.timer);
            return;
        }
        room.countdown--;
        broadcastRoomState(roomId);

        if (room.countdown <= 0) {
            clearInterval(room.timer);
            handleTimeout(roomId);
        }
    }, 1000);
}

export function resumeCountdown(roomId) {
    const room = rooms[roomId];
    if (!room || !room.paused) return;
    room.paused = false;
    startCountdown(roomId);
}

export function nextTurn(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.currentTurn++;

    if (room.currentTurn >= room.draftOrder.length) {
        if (room.phase === 1) {
            startPhase2(roomId);
        } else {
            clearInterval(room.timer);
            room.nextTurn = null;
            broadcastRoomState(roomId);
            room.io?.to(roomId).emit("draft-finished", { actions: room.actions });
        }
        return;
    }

    room.nextTurn = room.draftOrder[room.currentTurn];
    startCountdown(roomId);
    broadcastRoomState(roomId);
}

function handleTimeout(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const turn = room.draftOrder[room.currentTurn];
    if (turn) {
        room.actions.push({ team: turn.team, type: turn.type, champ: "SKIPPED" });
    }
    nextTurn(roomId);
}

function startPhase2(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.phase = 2;
    const [p1, p2] = room.playerOrder;
    const firstPlayerIdPhase1 = room.draftOrder[0].team;
    const secondPlayerIdPhase1 = (p1 === firstPlayerIdPhase1) ? p2 : p1;
    room.draftOrder = generateDraftOrder(firstPlayerIdPhase1, secondPlayerIdPhase1, 2);
    room.currentTurn = 0;
    room.nextTurn = room.draftOrder[0];
    startCountdown(roomId);
    broadcastRoomState(roomId);
}
