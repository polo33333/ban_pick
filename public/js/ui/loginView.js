import { DOM } from '../constants.js';
import { emitJoinRoom } from '../services/socket.js';

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
            alert('Vui lòng nhập ID phòng!');
            return;
        }

        if (role === 'player') {
            playerName = DOM.playerNameInput.value.trim();
            if (!playerName) {
                alert('Vui lòng nhập tên người chơi!');
                return;
            }
            localStorage.setItem('lastPlayerName', playerName);
        }
        
        emitJoinRoom(roomId, role, playerName);
    };

    // Tự động tạo ID cho host khi tải trang
    DOM.roleSelect.dispatchEvent(new Event('change'));
}
