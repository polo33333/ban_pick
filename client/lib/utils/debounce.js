/**
 * Debounce function - Delays execution until after wait time has elapsed
 * since the last invocation
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds (default: 300ms)
 * @returns {Function} Debounced function
 * 
 * @example
 * const search = debounce((query) => {
 *   console.log('Searching for:', query);
 * }, 300);
 * 
 * input.addEventListener('input', (e) => search(e.target.value));
 */
export function debounce(func, wait = 300) {
    let timeout;

    return function executedFunction(...args) {
        const context = this;

        const later = () => {
            clearTimeout(timeout);
            func.apply(context, args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - Ensures function is called at most once per limit period
 * 
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds (default: 300ms)
 * @returns {Function} Throttled function
 * 
 * @example
 * const handleScroll = throttle(() => {
 *   console.log('Scroll position:', window.scrollY);
 * }, 100);
 * 
 * window.addEventListener('scroll', handleScroll);
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    let lastFunc;
    let lastRan;

    return function (...args) {
        const context = this;

        if (!inThrottle) {
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, Math.max(limit - (Date.now() - lastRan), 0));
        }
    };
}

/**
 * Debounce with leading edge - Executes immediately on first call,
 * then debounces subsequent calls
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounceLeading(func, wait = 300) {
    let timeout;

    return function executedFunction(...args) {
        const context = this;
        const callNow = !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
        }, wait);

        if (callNow) func.apply(context, args);
    };
}
