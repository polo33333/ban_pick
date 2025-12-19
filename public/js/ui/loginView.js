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
    let selectedRole = 'host'; // Default role

    // Handle role tab clicks
    const roleTabs = document.querySelectorAll('.role-tab');
    roleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            roleTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Update selected role
            selectedRole = tab.dataset.role;

            // Update UI based on role with smooth transitions
            if (selectedRole === 'host') {
                DOM.roomIdInput.value = generateRandomId();
                DOM.roomIdInput.readOnly = true;
                // Smooth hide player name field
                DOM.playerNameContainer.style.display = 'none';
            } else {
                DOM.roomIdInput.value = '';
                DOM.roomIdInput.readOnly = false;
                // Smooth show player name field
                DOM.playerNameContainer.style.display = 'block';
                // Trigger reflow to enable transition
                void DOM.playerNameContainer.offsetHeight;
            }
        });
    });

    DOM.joinBtn.onclick = () => {
        const roomId = DOM.roomIdInput.value.trim();
        let playerName = null;

        if (!roomId) {
            showWarning('Vui lòng nhập ID phòng!');
            return;
        }

        if (selectedRole === 'player') {
            playerName = DOM.playerNameInput.value.trim();
            if (!playerName) {
                showWarning('Vui lòng nhập tên người chơi!');
                return;
            }
            localStorage.setItem('lastPlayerName', playerName);
        }

        emitJoinRoom(roomId, selectedRole, playerName);
    };

    // Initialize with host role
    DOM.roomIdInput.value = generateRandomId();
    DOM.roomIdInput.readOnly = true;
    DOM.playerNameContainer.style.display = 'none';

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
