/**
 * Bluesky Extension
 * Enhanced version with better control, CSS management, error handling,
 * settings persistence, and proper IPC timing for Electron browser window injection
 */

console.log("BLUESKY EXTENSION LOADED");

const BskyExt = {
    // Configuration
    config: {
        twemojiScriptUrl: "app://ui/lib/twemoji.min.js",
        debugMode: false,
        emojiSize: "1.2em",
        emojiVerticalAlign: "-20%",
        enabled: true,
    },

    // State management
    state: {
        initialized: false,
        twemojiLoaded: false,
        observers: [],
        styleElement: null,
        settingsLoaded: false,
        ipcReady: false,
    },

    /**
     * Waits for IPC to be available
     * @returns {Promise<boolean>}
     */
    async waitForIPC() {
        if (typeof window.ipc !== 'undefined' && window.ipc.invoke) {
            this.state.ipcReady = true;
            return true;
        }

        // Wait up to 5 seconds for IPC
        for (let i = 0; i < 50; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (typeof window.ipc !== 'undefined' && window.ipc.invoke) {
                BskyExt.utils.log("IPC became available");
                this.state.ipcReady = true;
                return true;
            }
        }

        BskyExt.utils.error("IPC not available after 5 seconds, using defaults");
        return false;
    },

    /**
     * Loads settings from Electron main process
     * @returns {Promise<Object>} Settings object
     */
    async loadSettings() {
        try {
            // Wait for IPC to be ready
            const ipcReady = await this.waitForIPC();
            
            if (!ipcReady || !window.ipc) {
                BskyExt.utils.log("IPC not available, using default settings");
                return null;
            }

            BskyExt.utils.log("Loading settings from IPC...");
            const settings = await window.ipc.invoke('app:getSettings');
            
            if (settings?.extension) {
                BskyExt.utils.log("Loaded extension settings:", settings.extension);
                
                // Apply settings to config
                if (settings.extension.emojiSize) {
                    this.config.emojiSize = settings.extension.emojiSize;
                }
                if (settings.extension.emojiVerticalAlign) {
                    this.config.emojiVerticalAlign = settings.extension.emojiVerticalAlign;
                }
                if (typeof settings.extension.debugMode === 'boolean') {
                    this.config.debugMode = settings.extension.debugMode;
                }
                if (typeof settings.extension.enabled === 'boolean') {
                    this.config.enabled = settings.extension.enabled;
                }
                
                this.state.settingsLoaded = true;
                BskyExt.utils.log("Settings applied successfully");
                return settings.extension;
            } else {
                BskyExt.utils.log("No extension settings found, using defaults");
            }
            
            return null;
        } catch (error) {
            BskyExt.utils.error("Failed to load settings:", error);
            return null;
        }
    },

    /**
     * Saves settings to Electron main process
     * @param {Object} extSettings Extension settings to save
     * @returns {Promise<boolean>} Success status
     */
    async saveSettings(extSettings) {
        try {
            if (!this.state.ipcReady || !window.ipc) {
                BskyExt.utils.error("IPC not available, cannot save settings");
                return false;
            }

            BskyExt.utils.log("Saving settings...", extSettings);

            // Get current app settings
            const currentSettings = await window.ipc.invoke('app:getSettings');
            
            // Merge with extension settings
            const newSettings = {
                ...currentSettings,
                extension: {
                    ...currentSettings.extension,
                    ...extSettings
                }
            };

            const result = await window.ipc.invoke('app:saveSettings', newSettings);
            
            if (result.success) {
                BskyExt.utils.log("Settings saved successfully");
                return true;
            } else {
                BskyExt.utils.error("Failed to save settings:", result.error);
                return false;
            }
        } catch (error) {
            BskyExt.utils.error("Error saving settings:", error);
            return false;
        }
    },

    // Utility functions
    utils: {
        /**
         * Logs messages when debug mode is enabled
         */
        log(message, ...args) {
            if (BskyExt.config.debugMode) {
                console.log(`[BskyExt] ${message}`, ...args);
            }
        },

        /**
         * Logs errors
         */
        error(message, ...args) {
            console.error(`[BskyExt Error] ${message}`, ...args);
        },

        /**
         * Safely queries selector without throwing
         */
        safeQuerySelector(element, selector) {
            try {
                return element?.querySelector(selector) || null;
            } catch (error) {
                this.error("Error in querySelector:", error);
                return null;
            }
        },

        /**
         * Safely queries all selectors without throwing
         */
        safeQuerySelectorAll(element, selector) {
            try {
                return element?.querySelectorAll(selector) || [];
            } catch (error) {
                this.error("Error in querySelectorAll:", error);
                return [];
            }
        },

        /**
         * Checks if element is visible in DOM
         */
        isElementVisible(element) {
            return element && element.offsetParent !== null;
        },

        /**
         * Debounce function for performance
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
    },

    emoji: {
        /**
         * Enhanced emoji regex for better Unicode emoji detection
         */
        emojiRegex: /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F300}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]/u,

        /**
         * Parses emojis in an element or string
         * @param {HTMLElement|string} element - The element or string to parse
         * @returns {HTMLElement|string} - The parsed element or string
         */
        parseEmojis(element) {
            if (!BskyExt.state.twemojiLoaded || typeof twemoji === "undefined") {
                BskyExt.utils.log("Twemoji not loaded yet, skipping parse");
                return element;
            }

            const type = typeof element;
            let workingElement = element;

            // Create temporary div if string was passed
            if (type === "string") {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = element;
                workingElement = tempDiv;
            }

            // Parse emojis if element has unicode emojis and isn't already parsed
            try {
                if (this.hasUnicodeEmoji(workingElement) && !this.hasTwemoji(workingElement)) {
                    twemoji.parse(workingElement);
                }
            } catch (error) {
                BskyExt.utils.error("Error parsing emojis:", error);
            }

            // Return appropriate type
            return type === "string" ? workingElement.innerHTML : workingElement;
        },

        /**
         * Parses emojis in element's children
         * @param {HTMLElement} element - The parent element
         * @param {Object} options - Configuration options
         * @param {string} options.selector - CSS selector to filter children
         * @param {boolean} options.recursive - Whether to recursively parse
         * @returns {boolean} - Success status
         */
        parseInChildren(element, options = {}) {
            const { selector = null, recursive = false } = options;

            if (!element?.children || element.children.length < 1) {
                return false;
            }

            try {
                const children = Array.from(element.children);

                for (const child of children) {
                    // If selector provided, check if child matches
                    if (selector && !child.matches(selector)) {
                        if (recursive) {
                            this.parseInChildren(child, options);
                        }
                        continue;
                    }

                    // Parse emojis if present
                    if (this.hasUnicodeEmoji(child)) {
                        this.parseEmojis(child);
                    }

                    // Recursively parse if enabled
                    if (recursive) {
                        this.parseInChildren(child, options);
                    }
                }

                return true;
            } catch (error) {
                BskyExt.utils.error("Error parsing children:", error);
                return false;
            }
        },

        /**
         * Checks if element contains Unicode emojis
         * @param {HTMLElement|string} element - Element to check
         * @returns {boolean} - True if emojis present
         */
        hasUnicodeEmoji(element) {
            try {
                let textContent;

                if (typeof element === "string") {
                    textContent = element;
                } else if (element?.innerText) {
                    textContent = element.innerText;
                } else {
                    return false;
                }

                return this.emojiRegex.test(textContent);
            } catch (error) {
                BskyExt.utils.error("Error checking for Unicode emoji:", error);
                return false;
            }
        },

        /**
         * Checks if element already has Twemoji images
         * @param {HTMLElement|string} element - Element to check
         * @returns {boolean} - True if Twemoji present
         */
        hasTwemoji(element) {
            try {
                let workingElement = element;

                if (typeof element === "string") {
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = element;
                    workingElement = tempDiv;
                }

                return Boolean(BskyExt.utils.safeQuerySelector(workingElement, "img.emoji"));
            } catch (error) {
                BskyExt.utils.error("Error checking for Twemoji:", error);
                return false;
            }
        },

        /**
         * Creates and injects CSS styles for emojis
         * @returns {boolean} - Success status
         */
        setCSS() {
            try {
                // Remove existing style if present
                if (BskyExt.state.styleElement) {
                    BskyExt.state.styleElement.remove();
                }

                const css = `
                    /* Bluesky Extension Emoji Styles */
                    img.emoji {
                        height: ${BskyExt.config.emojiSize};
                        width: ${BskyExt.config.emojiSize};
                        margin: 0 0.05em 0 0.1em;
                        vertical-align: ${BskyExt.config.emojiVerticalAlign};
                        display: inline-block;
                        line-height: 1;
                    }
                    
                    /* Prevent emoji image distortion */
                    img.emoji {
                        object-fit: contain;
                        -webkit-user-drag: none;
                        user-select: none;
                    }
                `;

                const styleElement = document.createElement("style");
                styleElement.id = "bsky-ext-emoji-css";
                styleElement.textContent = css;

                document.head.appendChild(styleElement);
                BskyExt.state.styleElement = styleElement;

                BskyExt.utils.log("CSS styles injected successfully");
                return true;
            } catch (error) {
                BskyExt.utils.error("Error setting CSS:", error);
                return false;
            }
        },

        /**
         * Updates CSS with new configuration
         * @param {Object} config - New CSS configuration
         */
        updateCSS(config = {}) {
            if (config.emojiSize) {
                BskyExt.config.emojiSize = config.emojiSize;
            }
            if (config.emojiVerticalAlign) {
                BskyExt.config.emojiVerticalAlign = config.emojiVerticalAlign;
            }
            this.setCSS();
        },

        /**
         * Loads Twemoji script
         * @returns {Promise<boolean>} - Promise resolving to load status
         */
        loadTwemojiScript() {
            return new Promise((resolve, reject) => {
                // Check if already loaded
                if (typeof twemoji !== "undefined") {
                    BskyExt.state.twemojiLoaded = true;
                    BskyExt.utils.log("Twemoji already loaded");
                    resolve(true);
                    return;
                }

                const script = document.createElement("script");
                script.src = BskyExt.config.twemojiScriptUrl;
                script.async = true;

                script.onload = () => {
                    BskyExt.state.twemojiLoaded = true;
                    BskyExt.utils.log("Twemoji script loaded successfully");
                    resolve(true);
                };

                script.onerror = (error) => {
                    BskyExt.utils.error("Failed to load Twemoji script:", error);
                    reject(error);
                };

                document.body.appendChild(script);
            });
        },

        /**
         * Initializes emoji parsing with MutationObserver
         */
        init() {
            if (BskyExt.state.initialized) {
                BskyExt.utils.log("Emoji module already initialized");
                return;
            }

            BskyExt.utils.log("Initializing emoji module");

            // Set CSS styles
            this.setCSS();

            // Page selectors to monitor
            const pageSelectors = [
                "[data-testid='profileView']",
                "[data-testid*='followingFeedPage']",
                "[data-testid='customFeedPage']",
                "[data-testid='notificationsScreen']",
                "[data-testid*='postThreadItem-']",
            ];

            // Debounced parse function for performance
            const debouncedParse = BskyExt.utils.debounce((element) => {
                this.parseInChildren(element, { 
                    selector: "[data-testid='postContent']",
                    recursive: true 
                });
            }, 100);

            // Create MutationObserver
            const observer = new MutationObserver((mutations) => {
                if (!BskyExt.state.twemojiLoaded) {
                    return;
                }

                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) {
                            continue;
                        }

                        const element = node;

                        // Check if node matches page selectors
                        const matchesSelector = pageSelectors.some((selector) => {
                            try {
                                return (
                                    element.matches?.(selector) ||
                                    BskyExt.utils.safeQuerySelector(element, selector)
                                );
                            } catch (error) {
                                return false;
                            }
                        });

                        if (matchesSelector) {
                            debouncedParse(element);
                        }
                    }
                }

                // Check currently visible pages
                pageSelectors.forEach((selector) => {
                    const page = BskyExt.utils.safeQuerySelector(document, selector);
                    if (page && BskyExt.utils.isElementVisible(page)) {
                        debouncedParse(page);
                    }
                });
            });

            // Start observing
            try {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                });

                BskyExt.state.observers.push(observer);
                BskyExt.utils.log("MutationObserver started");
            } catch (error) {
                BskyExt.utils.error("Error starting MutationObserver:", error);
            }

            // Load Twemoji script
            this.loadTwemojiScript()
                .then(() => {
                    BskyExt.utils.log("Twemoji loaded, starting initial parse");
                    // Parse existing content
                    pageSelectors.forEach((selector) => {
                        const page = BskyExt.utils.safeQuerySelector(document, selector);
                        if (page) {
                            this.parseInChildren(page, { 
                                selector: "[data-testid='postContent']",
                                recursive: true 
                            });
                        }
                    });
                })
                .catch((error) => {
                    BskyExt.utils.error("Failed to initialize Twemoji:", error);
                });
        },

        /**
         * Cleanup function
         */
        destroy() {
            BskyExt.utils.log("Destroying emoji module");

            // Remove observers
            BskyExt.state.observers.forEach((observer) => observer.disconnect());
            BskyExt.state.observers = [];

            // Remove styles
            if (BskyExt.state.styleElement) {
                BskyExt.state.styleElement.remove();
                BskyExt.state.styleElement = null;
            }

            BskyExt.state.initialized = false;
        },
    },

    profile: {
        parent: null,
        options: {},

        /**
         * Initializes profile module
         */
        init() {
            BskyExt.utils.log("Profile module initialized");
            // Add profile-specific initialization here
        },

        /**
         * Cleanup function
         */
        destroy() {
            BskyExt.utils.log("Destroying profile module");
            // Add cleanup code here
        },
    },

    /**
     * Main initialization
     */
    async init() {
        if (BskyExt.state.initialized) {
            BskyExt.utils.log("Extension already initialized");
            return;
        }

        console.log("[BskyExt] Starting initialization...");

        // Load settings first (this also waits for IPC)
        await this.loadSettings();

        // Check if extension is enabled
        if (!this.config.enabled) {
            console.log("[BskyExt] Extension is disabled in settings, skipping initialization");
            return;
        }

        console.log("[BskyExt] Extension is enabled, proceeding with initialization");

        // Initialize parent reference
        BskyExt.profile.parent = BskyExt;

        // Initialize modules
        BskyExt.emoji.init();
        BskyExt.profile.init();

        BskyExt.state.initialized = true;
        console.log("[BskyExt] Initialization complete!");
    },

    /**
     * Main cleanup function
     */
    destroy() {
        BskyExt.utils.log("Destroying BskyExt");

        BskyExt.emoji.destroy();
        BskyExt.profile.destroy();

        BskyExt.state.initialized = false;
        BskyExt.utils.log("BskyExt destroyed");
    },

    /**
     * Updates configuration and optionally saves to settings
     * @param {Object} newConfig - Configuration object
     * @param {boolean} save - Whether to save to persistent storage
     */
    async configure(newConfig, save = false) {
        Object.assign(BskyExt.config, newConfig);
        BskyExt.utils.log("Configuration updated:", BskyExt.config);

        // Update CSS if emoji-related config changed
        if (newConfig.emojiSize || newConfig.emojiVerticalAlign) {
            BskyExt.emoji.updateCSS();
        }

        // Save to settings if requested
        if (save) {
            await this.saveSettings({
                enabled: BskyExt.config.enabled,
                emojiSize: BskyExt.config.emojiSize,
                emojiVerticalAlign: BskyExt.config.emojiVerticalAlign,
                debugMode: BskyExt.config.debugMode
            });
        }
    },
};

// Auto-initialize when DOM is ready
// Use a slight delay to ensure IPC is fully set up by preload
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => BskyExt.init(), 250);
    });
} else {
    // If document is already loaded, init with delay
    setTimeout(() => BskyExt.init(), 250);
}

// Export for external use in Electron
if (typeof module !== "undefined" && module.exports) {
    module.exports = BskyExt;
} else if (typeof window !== "undefined") {
    window.BskyExt = BskyExt;
}