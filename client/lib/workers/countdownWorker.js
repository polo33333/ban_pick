// Countdown Timer Web Worker
// Runs countdown logic on a separate thread to keep main thread free for UI/Spine

let countdownEndTime = null;
let countdownDuration = 30;
let intervalId = null;
let isPaused = false;

// Listen for messages from main thread
self.onmessage = function (e) {
    const { type, data } = e.data;

    switch (type) {
        case 'start':
            startCountdown(data.endTime, data.duration);
            break;

        case 'pause':
            pauseCountdown();
            break;

        case 'resume':
            resumeCountdown(data.endTime, data.duration);
            break;

        case 'stop':
            stopCountdown();
            break;
    }
};

function startCountdown(endTime, duration) {
    stopCountdown(); // Clear any existing interval

    countdownEndTime = endTime;
    countdownDuration = duration || 30;
    isPaused = false;

    // Send initial update immediately
    updateCountdown();

    // Then update every 100ms for smooth animation
    intervalId = setInterval(updateCountdown, 100);
}

function pauseCountdown() {
    isPaused = true;
    stopCountdown();

    // Send paused state
    self.postMessage({
        type: 'paused'
    });
}

function resumeCountdown(endTime, duration) {
    isPaused = false;
    startCountdown(endTime, duration);
}

function stopCountdown() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function updateCountdown() {
    if (!countdownEndTime || isPaused) return;

    const now = Date.now();
    const remaining = Math.max(0, (countdownEndTime - now) / 1000);
    const scale = Math.max(0, remaining) / countdownDuration;

    // Send update to main thread
    self.postMessage({
        type: 'update',
        data: {
            remaining: remaining,
            scale: scale,
            isWarning: remaining <= 10,
            isComplete: remaining <= 0
        }
    });

    // Stop if countdown is complete
    if (remaining <= 0) {
        stopCountdown();
        self.postMessage({ type: 'complete' });
    }
}
