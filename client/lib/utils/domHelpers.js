/**
 * DOM manipulation helper functions
 * Shared utilities for common DOM operations
 */

/**
 * Toggle element visibility with fade effect
 * @param {HTMLElement} element - Element to toggle
 * @param {boolean} show - Whether to show or hide
 * @param {number} duration - Fade duration in ms (default: 300)
 */
export function toggleFade(element, show, duration = 300) {
    if (!element) return;

    if (show) {
        element.classList.remove('d-none');
        element.classList.add('d-flex');
        // Remove fade-out if present
        element.classList.remove('fade-out');
    } else {
        if (element.classList.contains('d-flex')) {
            element.classList.add('fade-out');
            setTimeout(() => {
                element.classList.add('d-none');
                element.classList.remove('d-flex', 'fade-out');
            }, duration);
        }
    }
}

/**
 * Update button icon with temporary feedback
 * @param {HTMLElement} button - Button element
 * @param {string} feedbackIcon - Icon HTML for feedback (e.g., '<i class="bi bi-check-lg"></i>')
 * @param {number} duration - Duration to show feedback (default: 2000ms)
 */
export function showButtonFeedback(button, feedbackIcon, duration = 2000) {
    if (!button) return;

    const originalIcon = button.innerHTML;
    button.innerHTML = feedbackIcon;

    setTimeout(() => {
        button.innerHTML = originalIcon;
    }, duration);
}

/**
 * Copy text to clipboard with visual feedback
 * @param {string} text - Text to copy
 * @param {HTMLElement} feedbackButton - Button to show feedback on
 * @param {Function} onError - Error callback
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text, feedbackButton = null, onError = null) {
    try {
        await navigator.clipboard.writeText(text);
        if (feedbackButton) {
            showButtonFeedback(feedbackButton, '<i class="bi bi-check-lg"></i>');
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        if (onError) onError(err);
    }
}

/**
 * Paste text from clipboard
 * @param {HTMLElement} targetInput - Input element to paste into
 * @param {HTMLElement} feedbackButton - Button to show feedback on
 * @param {Function} onError - Error callback
 * @returns {Promise<string>} Pasted text
 */
export async function pasteFromClipboard(targetInput = null, feedbackButton = null, onError = null) {
    try {
        const text = await navigator.clipboard.readText();
        if (text && targetInput) {
            targetInput.value = text.trim();
        }
        if (feedbackButton) {
            showButtonFeedback(feedbackButton, '<i class="bi bi-check-lg"></i>');
        }
        return text;
    } catch (err) {
        console.error('Failed to paste:', err);
        if (onError) onError(err);
        return '';
    }
}

/**
 * Update player status indicator
 * @param {HTMLElement} card - Player card element
 * @param {boolean} isOnline - Whether player is online
 */
export function updatePlayerStatus(card, isOnline) {
    if (!card) return;

    const statusIndicator = card.querySelector('.player-status-indicator');
    if (statusIndicator) {
        statusIndicator.classList.toggle('online', isOnline);
        statusIndicator.classList.toggle('offline', !isOnline);
        statusIndicator.title = isOnline ? 'Online' : 'Offline';
    }
}

/**
 * Update player turn info display
 * @param {HTMLElement} turnInfoEl - Turn info element
 * @param {Object} options - Display options
 * @param {boolean} options.isMyTurn - Whether it's this player's turn
 * @param {string} options.turnType - 'ban' or 'pick'
 */
export function updatePlayerTurnInfo(turnInfoEl, { isMyTurn, turnType }) {
    if (!turnInfoEl) return;

    turnInfoEl.classList.toggle('active-turn', isMyTurn);

    if (isMyTurn) {
        const displayType = turnType === 'ban' ? 'Banning' : 'Picking';
        const icon = turnType === 'ban' ? 'bi-x-circle-fill' : 'bi-check-circle-fill';
        const color = turnType === 'ban' ? '#deef44ff' : '#10b981';

        turnInfoEl.innerHTML = `
            <i class="${icon}" style="color: ${color}"></i>
            <span style="color: ${color}; font-weight: 800;">${displayType}</span>
        `;
        turnInfoEl.style.background = 'rgba(255, 255, 255, 0.2)';
    } else {
        turnInfoEl.innerHTML = `
            <i class="bi bi-unlock2-fill"></i>
            <span>...</span>
        `;
        turnInfoEl.style.background = 'rgba(255, 255, 255, 0.1)';
    }
}
