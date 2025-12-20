import { rooms } from "./roomManager.js";
import { broadcastRoomState } from "./socketHandlers.js";
import { recordSession } from "./statsManager.js";

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
    // Thêm 0.5 giây buffer để bù trừ network latency, đảm bảo client hiển thị đủ 30 giây và xuống được 0
    room.countdownEndTime = Date.now() + (room.countdown * 1000) + 500;

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
    // Thêm 0.5 giây buffer để bù trừ network latency
    room.countdownEndTime = Date.now() + timeToResume + 500;

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

            // Track statistics if enabled (default: true)
            if (room.settings?.enableStats !== false) {
                // All data is already in room object
                recordSession({
                    roomId: room.id,
                    actions: room.actions,
                    playerOrder: room.playerOrder,
                    playerHistory: room.playerHistory
                }).catch(err => {
                    console.error('Failed to record session statistics:', err);
                });
            }

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

    clearTimeout(room.timer);

    // Kiểm tra nếu phòng bị pause thì không xử lý
    if (room.paused) return;

    const turn = room.draftOrder[room.currentTurn];
    if (turn) room.actions.push({ team: turn.team, type: turn.type, champ: "SKIPPED" });
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
