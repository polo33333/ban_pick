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
    clearTimeout(room.timer); // Xóa cả timeout cũ

    room.countdown = room.countdownDuration || 30;
    room.paused = false;
    room.remainingTime = null; // Reset thời gian còn lại
    room.turnStartTime = Date.now(); // Lưu thời điểm bắt đầu lượt

    // Đặt một "cái hẹn" duy nhất để xử lý timeout
    room.timer = setTimeout(() => {
        handleTimeout(roomId);
    }, room.countdown * 1000);
}

export function resumeCountdown(roomId) {
    const room = rooms[roomId];
    if (!room || !room.paused) return;

    const timeToResume = room.remainingTime ?? (room.countdownDuration * 1000);
    room.paused = false;
    room.countdown = Math.round(timeToResume / 1000); // Cập nhật lại countdown để client hiển thị
    room.turnStartTime = Date.now(); // Cập nhật lại thời điểm bắt đầu cho lần pause tiếp theo
    
    // Đặt lại timeout với thời gian còn lại
    room.timer = setTimeout(() => {
        handleTimeout(roomId);
    }, timeToResume);

    broadcastRoomState(roomId); // Gửi trạng thái ngay khi resume
}

export function nextTurn(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.currentTurn++;

    if (room.currentTurn >= room.draftOrder.length) {
        if (room.phase === 1) {
            startPhase2(roomId);
        } else {
            clearTimeout(room.timer);
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

    // Đảm bảo client nhận được trạng thái countdown = 0
    clearTimeout(room.timer);
    room.countdown = 0;
    broadcastRoomState(roomId);

    // Đợi 1 giây để client hiển thị số 0, sau đó mới xử lý và chuyển lượt
    setTimeout(() => {
        const currentRoom = rooms[roomId];
        // Kiểm tra lại phòng trong trường hợp nó đã bị xóa hoặc pause trong 1 giây chờ
        if (!currentRoom || currentRoom.paused) return;

        const turn = currentRoom.draftOrder[currentRoom.currentTurn];
        if (turn) currentRoom.actions.push({ team: turn.team, type: turn.type, champ: "SKIPPED" });
        nextTurn(roomId);
    }, 1000); // 1 giây
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
