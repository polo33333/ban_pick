/**
 * Lazy Load Images using Intersection Observer API
 * Improves initial page load performance by loading images only when needed
 * 
 * @example
 * // HTML: <img data-src="/path/to/image.webp" class="lazy" alt="...">
 * 
 * import { lazyLoader } from './utils/lazyLoad.js';
 * document.querySelectorAll('img.lazy').forEach(img => lazyLoader.observe(img));
 */
export class LazyLoader {
    /**
     * @param {Object} options - Intersection Observer options
     */
    constructor(options = {}) {
        this.options = {
            root: null,
            rootMargin: '50px', // Start loading 50px before entering viewport
            threshold: 0.01,
            ...options
        };

        this.observer = new IntersectionObserver(
            this._handleIntersection.bind(this),
            this.options
        );

        this.loadedImages = new Set();
    }

    /**
     * Start observing an element for lazy loading
     * @param {HTMLElement} element - Element to observe
     */
    observe(element) {
        if (!element || this.loadedImages.has(element)) return;
        this.observer.observe(element);
    }

    /**
     * Stop observing an element
     * @param {HTMLElement} element - Element to unobserve
     */
    unobserve(element) {
        if (!element) return;
        this.observer.unobserve(element);
    }

    /**
     * Handle intersection events
     * @private
     */
    _handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this._loadImage(entry.target);
            }
        });
    }

    /**
     * Load image from data-src attribute
     * @private
     */
    _loadImage(img) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;

        if (!src && !srcset) {
            this.observer.unobserve(img);
            return;
        }

        // Create a new image to preload
        const tempImg = new Image();

        tempImg.onload = () => {
            // Apply loaded image
            if (src) img.src = src;
            if (srcset) img.srcset = srcset;

            // Remove data attributes
            delete img.dataset.src;
            delete img.dataset.srcset;

            // Add loaded class for CSS transitions
            img.classList.add('loaded');
            img.classList.remove('lazy');

            // Mark as loaded
            this.loadedImages.add(img);

            // Stop observing
            this.observer.unobserve(img);
        };

        tempImg.onerror = () => {
            console.error('[LazyLoader] Failed to load image:', src || srcset);
            img.classList.add('error');
            this.observer.unobserve(img);
        };

        // Start loading
        if (src) tempImg.src = src;
        if (srcset) tempImg.srcset = srcset;
    }

    /**
     * Disconnect observer and clean up
     */
    disconnect() {
        this.observer.disconnect();
        this.loadedImages.clear();
    }
}

/**
 * Global lazy loader instance
 */
export const lazyLoader = new LazyLoader();

/**
 * Auto-initialize lazy loading for all images with data-src attribute
 */
export function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src], img[data-srcset]');
    lazyImages.forEach(img => lazyLoader.observe(img));

    console.log(`[LazyLoader] Initialized for ${lazyImages.length} images`);
}
