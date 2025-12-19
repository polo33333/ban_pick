import { DOM } from '../constants.js';
import { emitJoinRoom } from '../services/socket.js';
import { showWarning } from './toast.js';

// Logic cho màn hình đăng nhập
function generateRandomId(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function initializeLoginView() {
    DOM.roleSelect.onchange = () => {
        if (DOM.roleSelect.value === "host") {
            DOM.roomIdInput.value = generateRandomId();
            DOM.roomIdInput.readOnly = true;
            DOM.playerNameContainer.style.display = 'none';
        } else {
            DOM.roomIdInput.value = "";
            DOM.roomIdInput.readOnly = false;
            DOM.playerNameContainer.style.display = 'block';
        }
    };

    DOM.joinBtn.onclick = () => {
        const roomId = DOM.roomIdInput.value.trim();
        const role = DOM.roleSelect.value;
        let playerName = null;

        if (!roomId) {
            showWarning('Vui lòng nhập ID phòng!');
            return;
        }

        if (role === 'player') {
            playerName = DOM.playerNameInput.value.trim();
            if (!playerName) {
                showWarning('Vui lòng nhập tên người chơi!');
                return;
            }
            localStorage.setItem('lastPlayerName', playerName);
        }

        emitJoinRoom(roomId, role, playerName);
    };

    // Tự động tạo ID cho host khi tải trang
    DOM.roleSelect.dispatchEvent(new Event('change'));

    // Copy Room ID functionality
    if (DOM.copyRoomIdBtn) {
        DOM.copyRoomIdBtn.onclick = () => {
            const roomId = DOM.roomIdInput.value;
            if (roomId) {
                navigator.clipboard.writeText(roomId).then(() => {
                    // Visual feedback
                    const originalIcon = DOM.copyRoomIdBtn.innerHTML;
                    DOM.copyRoomIdBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                    setTimeout(() => {
                        DOM.copyRoomIdBtn.innerHTML = originalIcon;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            }
        };
    }
}
