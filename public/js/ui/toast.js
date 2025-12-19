// Toast Notification System
// Hệ thống thông báo toast hiện đại thay thế cho alert()

let toastContainer = null;

// Initialize toast container
function initToastContainer() {
    if (toastContainer) return;

    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';

    // Force inline styles to ensure visibility - positioned at top center
    toastContainer.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 99999 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        pointer-events: none !important;
        max-width: 400px !important;
    `;

    document.body.appendChild(toastContainer);
}

/**
 * Show toast notification
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Thời gian hiển thị (ms), default 3000
 */
export function showToast(message, type = 'info', duration = 3000) {
    initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;

    // Icon based on type
    const icons = {
        success: '<i class="bi bi-check-circle-fill"></i>',
        error: '<i class="bi bi-x-circle-fill"></i>',
        warning: '<i class="bi bi-exclamation-triangle-fill"></i>',
        info: '<i class="bi bi-info-circle-fill"></i>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" aria-label="Close">
            <i class="bi bi-x"></i>
        </button>
    `;

    // Force inline styles for visibility
    toast.style.cssText = `
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%) !important;
        backdrop-filter: blur(20px) !important;
        border-radius: 12px !important;
        padding: 16px 20px !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
        pointer-events: auto !important;
        min-width: 300px !important;
        max-width: 400px !important;
        position: relative !important;
        overflow: hidden !important;
        border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'} !important;
        opacity: 1 !important;
        transform: translateX(0) scale(1) !important;
        transition: all 0.3s ease !important;
    `;

    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-show');
    });

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => removeToast(toast);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }

    return toast;
}

/**
 * Remove toast with animation
 */
function removeToast(toast) {
    if (!toast || !toast.parentElement) return;

    toast.classList.remove('toast-show');
    toast.classList.add('toast-exit');

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 300);
}

/**
 * Convenience methods
 */
export function showSuccess(message, duration = 3000) {
    return showToast(message, 'success', duration);
}

export function showError(message, duration = 4000) {
    return showToast(message, 'error', duration);
}

export function showWarning(message, duration = 3500) {
    return showToast(message, 'warning', duration);
}

export function showInfo(message, duration = 3000) {
    return showToast(message, 'info', duration);
}

/**
 * Show confirmation toast with action buttons
 */
export function showConfirm(message, onConfirm, onCancel) {
    initToastContainer();

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'toast-backdrop';
    backdrop.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.5) !important;
        z-index: 99998 !important;
        backdrop-filter: blur(4px) !important;
        animation: backdrop-fade-in 0.3s ease !important;
    `;
    document.body.appendChild(backdrop);

    const toast = document.createElement('div');
    toast.className = 'toast toast-confirm toast-enter';

    toast.innerHTML = `
        <div class="toast-icon"><i class="bi bi-question-circle-fill"></i></div>
        <div class="toast-message">${message}</div>
        <div class="toast-actions">
            <button class="toast-btn toast-btn-cancel">Hủy</button>
            <button class="toast-btn toast-btn-confirm">Xác nhận</button>
        </div>
    `;

    // Force inline styles for visibility
    toast.style.cssText = `
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%) !important;
        backdrop-filter: blur(20px) !important;
        border-radius: 12px !important;
        padding: 16px 20px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
        pointer-events: auto !important;
        min-width: 300px !important;
        max-width: 400px !important;
        position: relative !important;
        overflow: hidden !important;
        border-left: 4px solid #8b5cf6 !important;
        opacity: 1 !important;
        transform: translateX(0) scale(1) !important;
        transition: all 0.3s ease !important;
        z-index: 99999 !important;
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-show');
    });

    const confirmBtn = toast.querySelector('.toast-btn-confirm');
    const cancelBtn = toast.querySelector('.toast-btn-cancel');

    const cleanup = () => {
        // Animate toast exit
        toast.classList.remove('toast-show');
        toast.classList.add('toast-exit');

        // Fade out backdrop
        backdrop.style.animation = 'backdrop-fade-out 0.3s ease';

        // Remove both after animation completes
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
            if (backdrop.parentElement) {
                backdrop.remove();
            }
        }, 300);
    };

    confirmBtn.onclick = () => {
        cleanup();
        if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
        cleanup();
        if (onCancel) onCancel();
    };

    // Click backdrop to cancel
    backdrop.onclick = () => {
        cleanup();
        if (onCancel) onCancel();
    };

    return toast;
}
