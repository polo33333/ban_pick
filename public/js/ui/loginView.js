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

    // Get the action button
    const actionBtn = document.getElementById('roomId-action-btn');

    // Function to update button based on role
    function updateActionButton(role) {
        if (!actionBtn) return;

        if (role === 'host') {
            // Copy icon for host
            actionBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            actionBtn.title = 'Copy ID phòng';
        } else {
            // Paste icon for player
            actionBtn.innerHTML = '<i class="bi bi-clipboard-check"></i>';
            actionBtn.title = 'Paste ID phòng';
        }
    }

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

            // Update action button
            updateActionButton(selectedRole);
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
    updateActionButton('host');

    // Copy/Paste Room ID functionality
    if (actionBtn) {
        actionBtn.onclick = async () => {
            if (selectedRole === 'host') {
                // Copy for host
                const roomId = DOM.roomIdInput.value;
                if (roomId) {
                    try {
                        await navigator.clipboard.writeText(roomId);
                        // Visual feedback
                        const originalIcon = actionBtn.innerHTML;
                        actionBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                        setTimeout(() => {
                            actionBtn.innerHTML = originalIcon;
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy: ', err);
                        showWarning('Không thể copy ID phòng!');
                    }
                }
            } else {
                // Paste for player
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        DOM.roomIdInput.value = text.trim();
                        // Visual feedback
                        const originalIcon = actionBtn.innerHTML;
                        actionBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                        setTimeout(() => {
                            actionBtn.innerHTML = originalIcon;
                        }, 2000);
                    }
                } catch (err) {
                    console.error('Failed to paste: ', err);
                    showWarning('Không thể paste! Vui lòng cho phép quyền truy cập clipboard.');
                }
            }
        };
    }
}
