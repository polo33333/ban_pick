/**
 * SpineWebGLManager - Quản lý render nhiều Spine skeletons trên 1 canvas duy nhất
 * - Support: Fixed width & height với auto-scale
 * - Tất cả characters fit vào cùng 1 kích thước
 */

import { CONFIG } from '../constants.js';

class SpineWebGLManager {
    constructor(options = {}) {
        this.canvas = null;
        this.context = null;
        this.assetManager = null;
        this.shader = null;
        this.batcher = null;
        this.renderer = null;
        this.mvp = null;

        // Fixed size config
        this.fixedWidth = options.fixedWidth || 650;  // Độ rộng cố định (px)
        this.fixedHeight = options.fixedHeight || 750; // Độ cao cố định (px)

        this.skeletonDataCache = new Map();
        this.currentSkeleton = null;
        this.currentAnimationState = null;
        this.currentKey = null;
        this.currentCharacterName = null; // Track character name for verification

        this.lastFrameTime = 0;
        this.animationFrameId = null;
        this.initialized = false;
        this.loadingPromises = new Map();
    }

    /**
     * Initialize WebGL context
     */
    init(container) {
        if (this.initialized) return;
        if (!container) {
            console.warn('Spine: No container provided');
            return;
        }

        try {
            // Create canvas với fixed size
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'spine-webgl-canvas';
            this.canvas.width = this.fixedWidth;
            this.canvas.height = this.fixedHeight;
            this.canvas.style.cssText = `
                width: ${this.fixedWidth}px;
                height: ${this.fixedHeight}px;
                display: none;
            `;
            container.innerHTML = '';
            container.appendChild(this.canvas);

            // Initialize WebGL
            const config = {
                alpha: true,
                premultipliedAlpha: false,
                antialias: true,
            };
            this.context = new spine.ManagedWebGLRenderingContext(this.canvas, config);
            const gl = this.context.gl;

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            // Initialize components
            this.assetManager = new spine.AssetManager(this.context);
            this.shader = spine.Shader.newTwoColoredTextured(this.context);
            this.batcher = new spine.PolygonBatcher(this.context);
            this.renderer = new spine.SkeletonRenderer(this.context);
            this.mvp = new spine.Matrix4();

            // Setup viewport for fixed size
            gl.viewport(0, 0, this.fixedWidth, this.fixedHeight);
            this.mvp.ortho2d(0, 0, this.fixedWidth, this.fixedHeight);

            this.initialized = true;
            console.log(`Spine: Initialized with fixed size ${this.fixedWidth}x${this.fixedHeight}`);

            this.startRenderLoop();
        } catch (error) {
            console.error('Spine: Initialization failed', error);
        }
    }

    /**
     * Preload only resources (files) without creating skeleton data
     */
    async preloadResources(urls) {
        const key = urls.atlasUrl;

        // Check if already loaded into AssetManager
        if (this.assetManager.isLoadingComplete() && this.assetManager.get(urls.atlasUrl)) {
            return;
        }

        // Load files into AssetManager only
        this.assetManager.loadTextureAtlas(urls.atlasUrl);
        this.assetManager.loadBinary(urls.binaryUrl);

        await new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = 30000;

            const checkLoaded = () => {
                if (this.assetManager.isLoadingComplete()) {
                    resolve();
                } else if (this.assetManager.hasErrors()) {
                    reject(new Error(`Failed to load spine resources: ${urls.atlasUrl}`));
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout loading spine resources: ${urls.atlasUrl}`));
                } else {
                    requestAnimationFrame(checkLoaded);
                }
            };
            checkLoaded();
        });
    }

    /**
     * Preload skeleton data
     */
    async preloadSkeleton(urls) {
        const key = urls.atlasUrl;

        if (this.skeletonDataCache.has(key)) {
            return this.skeletonDataCache.get(key);
        }

        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const loadPromise = this._loadSkeleton(urls);
        this.loadingPromises.set(key, loadPromise);

        try {
            const skeletonData = await loadPromise;
            this.loadingPromises.delete(key);
            return skeletonData;
        } catch (error) {
            this.loadingPromises.delete(key);
            throw error;
        }
    }

    /**
     * Internal: Load skeleton data
     */
    async _loadSkeleton(urls) {
        const key = urls.atlasUrl;

        this.assetManager.loadTextureAtlas(urls.atlasUrl);
        this.assetManager.loadBinary(urls.binaryUrl);

        await new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = 30000;

            const checkLoaded = () => {
                if (this.assetManager.isLoadingComplete()) {
                    resolve();
                } else if (this.assetManager.hasErrors()) {
                    reject(new Error(`Failed to load spine assets: ${urls.atlasUrl}`));
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout loading spine assets: ${urls.atlasUrl}`));
                } else {
                    requestAnimationFrame(checkLoaded);
                }
            };
            checkLoaded();
        });

        // Wrap heavy parsing in setTimeout to avoid blocking UI
        const skeletonData = await new Promise((resolve) => {
            setTimeout(() => {
                const atlas = this.assetManager.require(urls.atlasUrl);
                const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
                const skeletonBinary = new spine.SkeletonBinary(atlasLoader);
                skeletonBinary.scale = 1.0;
                skeletonBinary.premultipliedAlpha = false;

                const data = skeletonBinary.readSkeletonData(
                    this.assetManager.require(urls.binaryUrl)
                );

                resolve(data);
            }, 0); // Defer to next tick to let UI update
        });

        this.skeletonDataCache.set(key, skeletonData);

        return skeletonData;
    }

    /**
     * Calculate scale để fit skeleton vào fixed size
     */
    calculateFitScale(skeleton) {
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform();

        const bounds = new spine.Vector2();
        const size = new spine.Vector2();
        skeleton.getBounds(bounds, size, []);

        if (size.x <= 0 || size.y <= 0) {
            return 1;
        }

        // Padding từ cạnh
        const paddingX = this.fixedWidth * 0.1;  // 10% padding
        const paddingY = this.fixedHeight * 0.1; // 10% padding

        const availableWidth = this.fixedWidth - paddingX * 2;
        const availableHeight = this.fixedHeight - paddingY * 2;

        // Scale để fit vào available space (lấy scale nhỏ hơn để fit both directions)
        const scaleX = availableWidth / size.x;
        const scaleY = availableHeight / size.y;
        const scale = Math.min(scaleX, scaleY);

        return Math.max(scale, 0.01); // Min scale 0.01
    }

    /**
     * Switch to display a specific skeleton
     */
    async showSkeleton(urls, characterName = null) {
        if (!this.initialized) {
            console.warn('Spine: Not initialized');
            return;
        }

        if (!urls?.atlasUrl) {
            this.hideSkeleton();
            return;
        }

        // Track character name
        this.currentCharacterName = characterName;

        const key = urls.atlasUrl;

        if (this.currentKey === key && this.currentSkeleton) {
            this.canvas.style.display = 'block';
            return;
        }

        try {
            let skeletonData = this.skeletonDataCache.get(key);
            if (!skeletonData) {
                skeletonData = await this.preloadSkeleton(urls);
            }

            // CRITICAL: Check if character changed during async loading
            if (this.currentCharacterName !== characterName && characterName !== null) {
                //console.log(`Spine: Aborted showing ${characterName} - switched to ${this.currentCharacterName}`);
                return;
            }

            // Create skeleton instance
            this.currentSkeleton = new spine.Skeleton(skeletonData);

            // Calculate scale để fit vào fixed size
            const scale = this.calculateFitScale(this.currentSkeleton);

            // Reset và setup lại với scale
            this.currentSkeleton.setToSetupPose();
            this.currentSkeleton.scaleX = scale;
            this.currentSkeleton.scaleY = scale;
            this.currentSkeleton.updateWorldTransform();

            // Get bounds sau khi scale
            const bounds = new spine.Vector2();
            const size = new spine.Vector2();
            this.currentSkeleton.getBounds(bounds, size, []);

            // Center horizontally, position vertically trong canvas
            const centerX = this.fixedWidth / 2;
            const centerY = this.fixedHeight / 2;

            this.currentSkeleton.x = centerX - bounds.x - size.x / 2;
            this.currentSkeleton.y = centerY - bounds.y - size.y / 2;

            // Setup animation
            const animationStateData = new spine.AnimationStateData(skeletonData);
            animationStateData.defaultMix = 0.2;
            this.currentAnimationState = new spine.AnimationState(animationStateData);

            const idleAnimation = skeletonData.findAnimation("idle");
            if (idleAnimation) {
                this.currentAnimationState.setAnimation(0, "idle", true);
            } else if (skeletonData.animations.length > 0) {
                this.currentAnimationState.setAnimation(0, skeletonData.animations[0].name, true);
            }

            this.currentKey = key;
            this.canvas.style.display = 'block';
            //console.log(`Spine: Showing ${key} with scale ${scale.toFixed(2)}`);

        } catch (error) {
            console.error('Spine: Failed to show skeleton', error);
            this.hideSkeleton();
        }
    }

    /**
     * Hide skeleton
     */
    hideSkeleton() {
        this.currentSkeleton = null;
        this.currentAnimationState = null;
        this.currentKey = null;
        this.currentCharacterName = null;
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
    }

    /**
     * Render loop
     */
    startRenderLoop() {
        const render = (timestamp) => {
            if (!this.initialized) return;

            const delta = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
            this.lastFrameTime = timestamp;

            const gl = this.context.gl;

            // Clear canvas
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Render current skeleton
            if (this.currentSkeleton && this.currentAnimationState) {
                this.currentAnimationState.update(delta);
                this.currentAnimationState.apply(this.currentSkeleton);
                this.currentSkeleton.updateWorldTransform();

                this.shader.bind();
                this.shader.setUniformi(spine.Shader.SAMPLER, 0);
                this.shader.setUniform4x4f(spine.Shader.MVP_MATRIX, this.mvp.values);

                this.batcher.begin(this.shader);
                this.renderer.premultipliedAlpha = false;
                this.renderer.draw(this.batcher, this.currentSkeleton);
                this.batcher.end();

                this.shader.unbind();
            }

            this.animationFrameId = requestAnimationFrame(render);
        };

        this.animationFrameId = requestAnimationFrame(render);
    }

    /**
     * Check if skeleton is loaded and ready
     */
    isSkeletonLoaded(urls) {
        if (!urls?.atlasUrl) return false;
        const key = urls.atlasUrl;
        return this.skeletonDataCache.has(key);
    }

    /**
     * Get cache size
     */
    getCacheSize() {
        return this.skeletonDataCache.size;
    }

    /**
     * Dispose
     */
    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.hideSkeleton();

        if (this.context) {
            try {
                this.context.gl.getExtension('WEBGL_lose_context')?.loseContext();
            } catch (e) {
                console.warn('Spine: Error disposing', e);
            }
        }

        this.skeletonDataCache.clear();
        this.loadingPromises.clear();
        this.initialized = false;
        console.log('Spine: Disposed');
    }
}

// Singleton
let instance = null;

export function getSpineManager(options = {}) {
    if (!instance) {
        instance = new SpineWebGLManager(options);
    }
    return instance;
}

export function disposeSpineManager() {
    if (instance) {
        instance.dispose();
        instance = null;
    }
}