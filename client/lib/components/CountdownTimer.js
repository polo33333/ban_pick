import { BaseComponent } from '../core/BaseComponent.js';

/**
 * Countdown Timer Web Component
 * Displays a circular countdown timer with SVG ring animation
 * Uses Web Worker for accurate timing
 * 
 * @example
 * <countdown-timer duration="30"></countdown-timer>
 * <countdown-timer duration="60" paused></countdown-timer>
 * 
 * @fires complete - When countdown reaches zero
 * @fires tick - On each second (optional)
 */
export class CountdownTimer extends BaseComponent {
    static get observedAttributes() {
        return ['duration', 'paused'];
    }

    onMount() {
        this.classList.add('countdown-timer-container');

        // Initialize Web Worker
        this._worker = new Worker('/lib/workers/countdownWorker.js');
        this._worker.onmessage = this._handleWorkerMessage.bind(this);

        // Initialize state
        this.setState({
            remaining: 0,
            scale: 1,
            isWarning: false,
            isPaused: false
        });

        // Start countdown if duration is set
        const duration = parseInt(this.getAttribute('duration'));
        if (duration) {
            this._startCountdown(duration);
        }
    }

    onUnmount() {
        // Cleanup worker
        if (this._worker) {
            this._worker.terminate();
            this._worker = null;
        }
    }

    onAttributeChange(name, oldValue, newValue) {
        if (name === 'duration' && newValue) {
            const duration = parseInt(newValue);
            if (!isNaN(duration)) {
                this._startCountdown(duration);
            }
        } else if (name === 'paused') {
            const isPaused = newValue !== null;
            this.setState({ isPaused });

            if (this._worker) {
                this._worker.postMessage({
                    type: isPaused ? 'pause' : 'resume'
                });
            }
        }
    }

    /**
     * Start countdown
     * @private
     */
    _startCountdown(duration) {
        if (!this._worker) return;

        this._worker.postMessage({
            type: 'start',
            data: {
                endTime: Date.now() + duration * 1000,
                duration
            }
        });
    }

    /**
     * Handle messages from Web Worker
     * @private
     */
    _handleWorkerMessage(e) {
        const { type, data } = e.data;

        switch (type) {
            case 'update':
                this.setState({
                    remaining: data.remaining,
                    scale: data.scale,
                    isWarning: data.isWarning
                });

                // Emit tick event (optional)
                this.emit('tick', { remaining: data.remaining });
                break;

            case 'complete':
                this.setState({
                    remaining: 0,
                    scale: 0
                });
                this.emit('complete');
                break;

            case 'paused':
                this.setState({ isPaused: true });
                break;
        }
    }

    /**
     * Pause countdown
     */
    pause() {
        this.setAttribute('paused', '');
    }

    /**
     * Resume countdown
     */
    resume() {
        this.removeAttribute('paused');
    }

    /**
     * Stop countdown
     */
    stop() {
        if (this._worker) {
            this._worker.postMessage({ type: 'stop' });
        }
        this.setState({
            remaining: 0,
            scale: 1
        });
    }

    render() {
        const { remaining, scale, isWarning, isPaused } = this._state;
        const displayValue = isPaused ? 'PAUSED' : Math.floor(remaining);

        this.innerHTML = `
      <svg class="countdown-svg" viewBox="0 0 100 100">
        <circle 
          class="countdown-bg" 
          cx="50" 
          cy="50" 
          r="45"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          stroke-width="4"
        />
        <circle 
          class="countdown-ring ${isWarning ? 'ring-warning' : ''}" 
          cx="50" 
          cy="50" 
          r="45"
          fill="none"
          stroke="${isWarning ? '#ef4444' : '#10b981'}"
          stroke-width="4"
          stroke-dasharray="${scale} 1"
          pathLength="1"
          transform="rotate(-90 50 50)"
          style="transition: stroke-dasharray 0.3s ease, stroke 0.3s ease;"
        />
      </svg>
      <div class="countdown-number ${isPaused ? 'paused-text' : ''} ${isWarning ? 'time-warning' : ''}">
        ${displayValue}
      </div>
    `;
    }
}

// Register the custom element
customElements.define('countdown-timer', CountdownTimer);
