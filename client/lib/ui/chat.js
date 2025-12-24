
import { DOM } from '../constants.js';
import { state } from '../state.js';
import { emitChatMessage } from '../services/socket.js';

let isChatOpen = false;
let unreadCount = 0;

export function initChat() {
    // Cache DOM elements
    DOM.chatWidget = document.getElementById('chat-widget');
    DOM.chatToggleBtn = document.getElementById('chat-toggle-btn');
    DOM.chatCloseBtn = document.getElementById('chat-close-btn');
    DOM.chatInput = document.getElementById('chat-input');
    DOM.chatSendBtn = document.getElementById('chat-send-btn');
    DOM.chatBody = document.getElementById('chat-body');
    DOM.chatBadge = document.getElementById('chat-notification-badge');

    if (!DOM.chatWidget) return;

    // Initially hide toggle button
    DOM.chatToggleBtn.style.display = 'none';

    // Event Listeners
    DOM.chatToggleBtn.addEventListener('click', toggleChat);
    DOM.chatCloseBtn.addEventListener('click', toggleChat);

    DOM.chatSendBtn.addEventListener('click', sendMessage);
    DOM.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
        // Prevent event propagation so spaces don't trigger other app shortcuts if any
        e.stopPropagation();
    });

    // Prevent keypress propagation for input to avoid triggering app hotkeys
    DOM.chatInput.addEventListener('keydown', (e) => e.stopPropagation());
}

export function showChatButton() {
    if (DOM.chatToggleBtn && !isChatOpen) {
        DOM.chatToggleBtn.style.display = 'flex';
    }
}

function toggleChat() {
    isChatOpen = !isChatOpen;

    if (isChatOpen) {
        DOM.chatWidget.style.display = 'flex';
        DOM.chatToggleBtn.style.display = 'none';
        resetUnreadCount();
        scrollToBottom();
        DOM.chatInput.focus();
    } else {
        DOM.chatWidget.style.display = 'none';
        DOM.chatToggleBtn.style.display = 'flex';
    }
}

function sendMessage() {
    const message = DOM.chatInput.value.trim();
    if (!message) return;

    // Check if player name is set
    let sender = state.myPlayerName;

    if (state.myRole === 'host') {
        sender = 'Host';
    } else if (!sender) {
        sender = 'Guest';
    }

    emitChatMessage(message, sender);
    DOM.chatInput.value = '';
    DOM.chatInput.focus();
}

export function loadChatHistory(messages) {
    if (!messages || !Array.isArray(messages)) return;

    // Clear existing messages to avoid duplicates if re-connecting
    DOM.chatBody.innerHTML = '';

    messages.forEach(msg => {
        handleIncomingMessage(msg, false); // false = logic for 'isHistory', to avoid sound/notification spam if desired
    });
    scrollToBottom();
}

export function handleIncomingMessage(data, isRealtime = true) {
    const { sender, message, timestamp } = data;

    let currentUserName = state.myPlayerName;
    if (state.myRole === 'host') currentUserName = 'Host';
    else if (!currentUserName) currentUserName = 'Guest';

    const isSelf = sender === currentUserName;
    const isHost = sender === 'Host';

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isSelf ? 'self' : 'other'} ${isHost ? 'host' : ''} animate-fade-in-up`;

    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const senderEl = document.createElement('span');
    senderEl.className = 'chat-message-sender';
    senderEl.innerHTML = `${isSelf ? 'Bạn' : sender} <span class="chat-timestamp">${timeStr}</span>`;

    const textEl = document.createElement('div');
    textEl.textContent = message;

    messageEl.appendChild(senderEl);
    messageEl.appendChild(textEl);

    DOM.chatBody.appendChild(messageEl);
    scrollToBottom();

    if (isRealtime && !isChatOpen) {
        incrementUnreadCount();
        // Play notification sound if needed
    }
}

function scrollToBottom() {
    if (DOM.chatBody) {
        DOM.chatBody.scrollTop = DOM.chatBody.scrollHeight;
    }
}

function incrementUnreadCount() {
    unreadCount++;
    if (DOM.chatBadge) {
        DOM.chatBadge.textContent = unreadCount;
        DOM.chatBadge.style.display = 'flex';

        // Add animation to badge
        DOM.chatBadge.classList.remove('animate-bounce');
        void DOM.chatBadge.offsetWidth; // trigger reflow
        DOM.chatBadge.classList.add('animate-bounce');
    }
}

function resetUnreadCount() {
    unreadCount = 0;
    if (DOM.chatBadge) {
        DOM.chatBadge.textContent = '0';
        DOM.chatBadge.style.display = 'none';
    }
}
