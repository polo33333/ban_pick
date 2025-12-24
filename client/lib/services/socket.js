import { state } from '../state.js';
import { handleRoomStateUpdate, handlePreSelectUpdate, handleDraftError, handleHostLeft, handleKicked, handleDraftFinished } from '../ui/draftView.js';
import { handleSettingsUpdate } from '../ui/settings.js';
import { handleIncomingMessage, loadChatHistory } from '../ui/chat.js';
import { showConfirm } from '../ui/toast.js';

// Quản lý kết nối và các sự kiện socket.io
export function initializeSocket() {
    state.socket = io();

    // Đăng ký các listener
    state.socket.on("room-state", handleRoomStateUpdate);
    state.socket.on("pre-select-update", handlePreSelectUpdate);
    state.socket.on("draft-finished", handleDraftFinished);
    state.socket.on("draft-error", handleDraftError);
    state.socket.on("host-left", handleHostLeft);
    state.socket.on('kicked', handleKicked);
    state.socket.on('chat-message', handleIncomingMessage);
    state.socket.on('chat-history', loadChatHistory);
    state.socket.on('room-settings-update', handleSettingsUpdate);
}

// Các hàm để emit sự kiện lên server
export function emitJoinRoom(roomId, role, playerName) {
    state.myRoom = roomId;
    state.myRole = role;
    state.myPlayerName = playerName;
    state.socket.emit("join-room", { roomId, role, playerName });
}

export function emitSwapTeams() {
    state.socket?.emit('swap-teams', { roomId: state.myRoom });
}

export function emitStartDraft() {
    state.socket?.emit('start-draft', { roomId: state.myRoom });
}

export function emitSelectChamp(champName) {
    state.socket.emit("select-champ", { roomId: state.myRoom, champ: champName });
    // Reset pre-select
    emitPreSelectChamp(null);
}

export function emitPreSelectChamp(champName) {
    state.socket.emit("pre-select-champ", { roomId: state.myRoom, champ: champName });
}

export function emitConfirmPreDraft() {
    state.socket.emit("confirm-pre-draft", { roomId: state.myRoom });
}

export function emitPreDraftSelect(champs) {
    state.socket.emit('pre-draft-select', { roomId: state.myRoom, champs });
}

// Host controls
export function emitCloseRoom() {
    showConfirm(
        'Bạn có chắc chắn muốn xóa phòng?',
        () => state.socket.emit('close-room', { roomId: state.myRoom })
    );
}

export function emitTogglePause() {
    state.socket.emit('toggle-pause', { roomId: state.myRoom });
}

export function emitSetCountdown(time) {
    state.socket.emit('set-countdown', { roomId: state.myRoom, time });
}

export function emitKickPlayer(playerId) {
    state.socket.emit('kick-player', { roomId: state.myRoom, playerIdToKick: playerId });
}

export function emitChatMessage(message, sender) {
    state.socket.emit('chat-message', { roomId: state.myRoom, message, sender });
}
