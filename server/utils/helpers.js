/**
 * Server-side utility functions
 * Shared helper functions to reduce code duplication
 */

/**
 * Update object property by replacing old ID with new ID
 * Used during player reconnection
 * @param {Object} obj - Object with team property
 * @param {string} oldId - Old socket ID
 * @param {string} newId - New socket ID
 */
export function updateTeamId(obj, oldId, newId) {
    if (obj && obj.team === oldId) {
        obj.team = newId;
    }
}

/**
 * Validate room exists and user is host
 * @param {Object} room - Room object
 * @param {string} socketId - Socket ID to verify
 * @returns {boolean} True if valid
 */
export function validateHostPermission(room, socketId) {
    return room && room.hostId === socketId;
}

/**
 * Validate room state for draft operations
 * @param {Object} room - Room object
 * @param {Object} socket - Socket object for error emission
 * @param {Object} requirements - Validation requirements
 * @returns {boolean} True if valid
 */
export function validateDraftState(room, socket, requirements = {}) {
    const {
        requireTwoPlayers = false,
        requireDraftNotStarted = false,
        requireDraftStarted = false,
        requireState = null
    } = requirements;

    if (requireTwoPlayers && room.playerOrder.length !== 2) {
        socket.emit("draft-error", { message: "Cần có đủ 2 người chơi." });
        return false;
    }

    if (requireDraftNotStarted && room.draftOrder.length > 0) {
        socket.emit("draft-error", { message: "Draft đã bắt đầu rồi." });
        return false;
    }

    if (requireDraftStarted && room.draftOrder.length === 0) {
        socket.emit("draft-error", { message: "Draft chưa bắt đầu." });
        return false;
    }

    if (requireState && room.state !== requireState) {
        socket.emit("draft-error", { message: `Trạng thái phòng không hợp lệ.` });
        return false;
    }

    return true;
}

/**
 * Calculate remaining time from countdown end time
 * @param {number} countdownEndTime - Timestamp when countdown ends
 * @returns {number} Remaining time in milliseconds
 */
export function calculateRemainingTime(countdownEndTime) {
    return Math.max(0, countdownEndTime - Date.now());
}
