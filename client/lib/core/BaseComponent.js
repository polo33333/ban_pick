/**
 * Base Web Component Class
 * Provides lifecycle hooks and utility methods for custom elements
 * 
 * @example
 * class MyComponent extends BaseComponent {
 *   onMount() {
 *     console.log('Component mounted');
 *   }
 *   
 *   render() {
 *     this.innerHTML = `<div>Hello World</div>`;
 *   }
 * }
 * 
 * customElements.define('my-component', MyComponent);
 */
export class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this._state = {};
        this._mounted = false;
        this._renderScheduled = false;
    }

    /**
     * Called when element is added to DOM
     */
    connectedCallback() {
        if (!this._mounted) {
            this.onMount();
            this._mounted = true;
        }
        this.scheduleRender();
    }

    /**
     * Called when element is removed from DOM
     */
    disconnectedCallback() {
        this.onUnmount();
        this._mounted = false;
    }

    /**
     * Called when observed attribute changes
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.onAttributeChange(name, oldValue, newValue);
            this.scheduleRender();
        }
    }

    // ==================== Lifecycle Hooks (Override in subclass) ====================

    /**
     * Called once when component is first mounted
     * Override this in subclass
     */
    onMount() { }

    /**
     * Called when component is unmounted
     * Override this in subclass
     */
    onUnmount() { }

    /**
     * Called when an observed attribute changes
     * Override this in subclass
     * @param {string} name - Attribute name
     * @param {string} oldValue - Old value
     * @param {string} newValue - New value
     */
    onAttributeChange(name, oldValue, newValue) { }

    // ==================== State Management ====================

    /**
     * Update component state and trigger re-render
     * @param {Object} updates - State updates
     */
    setState(updates) {
        if (typeof updates !== 'object' || updates === null) {
            console.error('[BaseComponent] setState requires an object');
            return;
        }

        this._state = { ...this._state, ...updates };
        this.scheduleRender();
    }

    /**
     * Get current component state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this._state };
    }

    // ==================== Rendering ====================

    /**
     * Schedule a render on next animation frame
     * Prevents multiple renders in same frame
     */
    scheduleRender() {
        if (this._renderScheduled) return;

        this._renderScheduled = true;
        requestAnimationFrame(() => {
            this._renderScheduled = false;
            this.render();
        });
    }

    /**
     * Render component
     * MUST be overridden in subclass
     */
    render() {
        throw new Error('render() must be implemented in subclass');
    }

    // ==================== Utility Methods ====================

    /**
     * Query selector within component
     * @param {string} selector - CSS selector
     * @returns {Element|null}
     */
    $(selector) {
        return this.querySelector(selector);
    }

    /**
     * Query selector all within component
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     */
    $$(selector) {
        return this.querySelectorAll(selector);
    }

    /**
     * Create element with props and children
     * @param {string} tag - HTML tag name
     * @param {Object} props - Element properties
     * @param {Array} children - Child elements or text
     * @returns {HTMLElement}
     */
    createElement(tag, props = {}, children = []) {
        const el = document.createElement(tag);

        // Set properties
        Object.entries(props).forEach(([key, value]) => {
            if (key.startsWith('on') && typeof value === 'function') {
                // Event listener
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'className') {
                el.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
            } else {
                el.setAttribute(key, value);
            }
        });

        // Append children
        children.forEach(child => {
            if (typeof child === 'string' || typeof child === 'number') {
                el.appendChild(document.createTextNode(String(child)));
            } else if (child instanceof HTMLElement) {
                el.appendChild(child);
            }
        });

        return el;
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail data
     * @param {Object} options - Event options
     */
    emit(eventName, detail = null, options = {}) {
        this.dispatchEvent(new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true,
            ...options
        }));
    }

    /**
     * Add event listener with automatic cleanup
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    on(event, handler, options = {}) {
        this.addEventListener(event, handler, options);

        // Store for cleanup
        if (!this._eventListeners) {
            this._eventListeners = [];
        }
        this._eventListeners.push({ event, handler, options });
    }

    /**
     * Clean up all event listeners
     */
    _cleanupListeners() {
        if (this._eventListeners) {
            this._eventListeners.forEach(({ event, handler, options }) => {
                this.removeEventListener(event, handler, options);
            });
            this._eventListeners = [];
        }
    }
}
