// App Settings Modal - Builds and manages the settings UI with Bluesky Extension settings
async function showAppSettingsModal() {
    // Check if modal already exists
    if (document.getElementById('bsky-app-settings-modal')) {
        return;
    }

    // Load current settings (both app and extension)
    let settings = {};
    let extSettings = {
        emoji: {
            enabled: true,
            size: '1.2em',
            verticalAlign: '-20%',
            debugMode: false
        }
    };
    
    try {
        settings = await window.ipc.invoke('app:getSettings');
        
        // Load extension settings from saved settings first (priority)
        if (settings?.extension) {
            console.log('[Settings Modal] Loaded saved extension settings:', settings.extension);
            extSettings.emoji = {
                enabled: settings.extension.enabled !== false, // Default to true if not set
                size: settings.extension.emojiSize || '1.2em',
                verticalAlign: settings.extension.emojiVerticalAlign || '-20%',
                debugMode: settings.extension.debugMode || false
            };
        }
        // Otherwise get from currently running extension
        else if (window.BskyExt) {
            console.log('[Settings Modal] Loading from running extension');
            extSettings.emoji = {
                enabled: window.BskyExt.config.enabled !== false,
                size: window.BskyExt.config.emojiSize || '1.2em',
                verticalAlign: window.BskyExt.config.emojiVerticalAlign || '-20%',
                debugMode: window.BskyExt.config.debugMode || false
            };
        }
        
        console.log('[Settings Modal] Final extension settings:', extSettings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        iziToast.error({
            title: 'Error',
            message: 'Failed to load settings',
            position: 'topRight'
        });
        return;
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'bsky-app-settings-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease-in-out;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: rgb(22, 24, 27);
        border-radius: 16px;
        width: 90%;
        max-width: 650px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.3s ease-out;
    `;

    // Modal header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgb(47, 51, 56);
        position: sticky;
        top: 0;
        background-color: rgb(22, 24, 27);
        z-index: 10;
    `;

    const headerTitle = document.createElement('h2');
    headerTitle.style.cssText = `
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: rgb(255, 255, 255);
    `;
    headerTitle.innerHTML = '<i class="fa-solid fa-desktop" style="margin-right: 8px;"></i>Desktop App Settings';

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
        background: none;
        border: none;
        color: rgb(159, 167, 179);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    `;
    closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'transparent';
    });
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });

    header.appendChild(headerTitle);
    header.appendChild(closeButton);

    // Parse size and align values properly
    const emojiSizeNum = parseFloat(extSettings.emoji.size);
    const emojiAlignNum = parseInt(extSettings.emoji.verticalAlign);
    
    console.log('[Settings Modal] Parsed values - Size:', emojiSizeNum, 'Align:', emojiAlignNum);

    // Modal content
    const content = document.createElement('div');
    content.style.cssText = `padding: 24px;`;
    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Bluesky Extension Section -->
            <div>
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: rgb(255, 255, 255);">
                    <i class="fa-solid fa-face-smile" style="margin-right: 8px; color: rgb(16, 131, 254);"></i>Bluesky Extension
                </h3>
                
                <!-- Enable Extension -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: rgb(255, 255, 255);">Enable Emoji Enhancement</div>
                        <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 2px;">Replace Unicode emojis with high-quality Twemoji images</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-ext-enabled" ${extSettings.emoji.enabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Emoji Size -->
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 14px; font-weight: 500; color: rgb(255, 255, 255); margin-bottom: 8px;">
                        Emoji Size
                    </label>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <input type="range" id="setting-emoji-size" min="0.8" max="2.0" step="0.1" value="${emojiSizeNum}" 
                            style="flex: 1; height: 6px; background: rgb(47, 51, 56); border-radius: 3px; outline: none; -webkit-appearance: none;">
                        <span id="emoji-size-value" style="font-size: 14px; color: rgb(255, 255, 255); min-width: 50px; text-align: right;">
                            ${emojiSizeNum.toFixed(1)}em
                        </span>
                    </div>
                    <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 6px;">
                        Adjust the size of emoji images (0.8em - 2.0em)
                    </div>
                </div>

                <!-- Emoji Vertical Alignment -->
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 14px; font-weight: 500; color: rgb(255, 255, 255); margin-bottom: 8px;">
                        Vertical Alignment
                    </label>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <input type="range" id="setting-emoji-align" min="-30" max="0" step="1" value="${emojiAlignNum}" 
                            style="flex: 1; height: 6px; background: rgb(47, 51, 56); border-radius: 3px; outline: none; -webkit-appearance: none;">
                        <span id="emoji-align-value" style="font-size: 14px; color: rgb(255, 255, 255); min-width: 50px; text-align: right;">
                            ${emojiAlignNum}%
                        </span>
                    </div>
                    <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 6px;">
                        Fine-tune emoji alignment with text (-30% to 0%)
                    </div>
                </div>

                <!-- Debug Mode -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: rgb(255, 255, 255);">Debug Mode</div>
                        <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 2px;">Show detailed console logs for troubleshooting</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-ext-debug" ${extSettings.emoji.debugMode ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Extension Status -->
                <div id="ext-status" style="margin-top: 12px; padding: 12px; background-color: rgba(16, 131, 254, 0.1); border-radius: 8px; font-size: 12px; color: rgb(159, 167, 179);">
                    <i class="fa-solid fa-circle-info" style="margin-right: 6px; color: rgb(16, 131, 254);"></i>
                    <span id="ext-status-text">Extension ${window.BskyExt ? 'loaded and ' + (window.BskyExt.state.initialized ? 'active' : 'disabled') : 'not loaded'}</span>
                </div>
            </div>

            <div style="border-top: 1px solid rgb(47, 51, 56);"></div>

            <!-- Updates Section -->
            <div>
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: rgb(255, 255, 255);">
                    <i class="fa-solid fa-download" style="margin-right: 8px; color: rgb(16, 131, 254);"></i>Updates
                </h3>
                
                <!-- Update Channel (Hidden for now) -->
                <div style="margin-bottom: 16px; display: none;">
                    <label style="display: block; font-size: 14px; font-weight: 500; color: rgb(255, 255, 255); margin-bottom: 8px;">
                        Update Channel
                    </label>
                    <select id="setting-update-channel" style="width: 100%; padding: 10px 12px; background-color: rgb(30, 33, 37); color: rgb(255, 255, 255); border: 1px solid rgb(47, 51, 56); border-radius: 8px; font-size: 14px; cursor: pointer;">
                        <option value="stable" ${settings.updates?.channel === 'stable' ? 'selected' : ''}>Stable (Recommended)</option>
                        <option value="beta" ${settings.updates?.channel === 'beta' ? 'selected' : ''}>Beta (Testing)</option>
                        <option value="dev" ${settings.updates?.channel === 'dev' ? 'selected' : ''}>Dev (Experimental)</option>
                    </select>
                    <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 6px;">
                        Choose which update channel to receive updates from
                    </div>
                </div>

                <!-- Auto Check Updates -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: rgb(255, 255, 255);">Auto-check for updates</div>
                        <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 2px;">Automatically check for updates periodically</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-auto-check" ${settings.updates?.autoCheck ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Auto Download -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: rgb(255, 255, 255);">Auto-download updates</div>
                        <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 2px;">Download updates automatically when available</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-auto-download" ${settings.updates?.autoDownload ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Auto Install on Quit -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: rgb(255, 255, 255);">Install on quit</div>
                        <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 2px;">Install updates when the app closes</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-auto-install" ${settings.updates?.autoInstallOnQuit ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div style="border-top: 1px solid rgb(47, 51, 56);"></div>

            <!-- Appearance Section -->
            <div>
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: rgb(255, 255, 255);">
                    <i class="fa-solid fa-paintbrush" style="margin-right: 8px; color: rgb(16, 131, 254);"></i>Appearance
                </h3>
                
                <!-- Close to Tray -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: rgb(255, 255, 255);">Close to system tray</div>
                        <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 2px;">Minimize to tray instead of quitting</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-close-to-tray" ${settings.appearance?.closeToTray ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Badge System Accent -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 500; color: rgb(255, 255, 255);">Use system accent for badge</div>
                        <div style="font-size: 12px; color: rgb(159, 167, 179); margin-top: 2px;">Match notification badge color to system theme</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-badge-accent" ${settings.badge?.useSystemAccent ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div style="border-top: 1px solid rgb(47, 51, 56);"></div>

            <!-- Quick Actions -->
            <div>
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: rgb(255, 255, 255);">
                    <i class="fa-solid fa-bolt" style="margin-right: 8px; color: rgb(16, 131, 254);"></i>Quick Actions
                </h3>

                <button id="action-restart" style="width: 100%; padding: 14px; background-color: rgba(255, 255, 255, 0.05); color: rgb(255, 255, 255); border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; text-align: left; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center;">
                        <i class="fa-solid fa-rotate-right" style="margin-right: 12px; color: rgb(16, 131, 254);"></i>
                        <span>Restart Application</span>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color: rgb(159, 167, 179); font-size: 12px;"></i>
                </button>
            </div>

            <!-- Save Button -->
            <button id="save-settings" style="width: 100%; padding: 14px; background-color: rgb(16, 131, 254); color: rgb(255, 255, 255); border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;">
                <i class="fa-solid fa-save" style="margin-right: 8px;"></i>Save Settings
            </button>
        </div>
    `;

    // Add toggle switch styles and range slider styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgb(47, 51, 56);
            transition: 0.3s;
            border-radius: 24px;
        }
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
        }
        input:checked + .toggle-slider {
            background-color: rgb(16, 131, 254);
        }
        input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }
        #action-restart:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        #save-settings:hover {
            background-color: rgb(14, 116, 225);
        }
        
        /* Range slider styling */
        input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            background: rgb(16, 131, 254);
            cursor: pointer;
            border-radius: 50%;
        }
        input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: rgb(16, 131, 254);
            cursor: pointer;
            border-radius: 50%;
            border: none;
        }
        input[type="range"]::-webkit-slider-runnable-track {
            height: 6px;
            background: rgb(47, 51, 56);
            border-radius: 3px;
        }
        input[type="range"]::-moz-range-track {
            height: 6px;
            background: rgb(47, 51, 56);
            border-radius: 3px;
        }
    `;
    document.head.appendChild(style);

    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);

    // Real-time updates for range sliders
    const emojiSizeSlider = content.querySelector('#setting-emoji-size');
    const emojiSizeValue = content.querySelector('#emoji-size-value');
    const emojiAlignSlider = content.querySelector('#setting-emoji-align');
    const emojiAlignValue = content.querySelector('#emoji-align-value');

    emojiSizeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value).toFixed(1);
        emojiSizeValue.textContent = `${value}em`;
        
        // Live preview if extension is loaded
        if (window.BskyExt && window.BskyExt.state.initialized) {
            window.BskyExt.emoji.updateCSS({ emojiSize: `${value}em` });
        }
    });

    emojiAlignSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        emojiAlignValue.textContent = `${value}%`;
        
        // Live preview if extension is loaded
        if (window.BskyExt && window.BskyExt.state.initialized) {
            window.BskyExt.emoji.updateCSS({ emojiVerticalAlign: `${value}%` });
        }
    });

    // Event handlers
    content.querySelector('#save-settings').addEventListener('click', async () => {
        const newSettings = {
            updates: {
                channel: content.querySelector('#setting-update-channel')?.value || 'stable',
                autoCheck: content.querySelector('#setting-auto-check').checked,
                autoDownload: content.querySelector('#setting-auto-download').checked,
                autoInstallOnQuit: content.querySelector('#setting-auto-install').checked
            },
            appearance: {
                closeToTray: content.querySelector('#setting-close-to-tray').checked
            },
            badge: {
                useSystemAccent: content.querySelector('#setting-badge-accent').checked
            },
            extension: {
                enabled: content.querySelector('#setting-ext-enabled').checked,
                emojiSize: `${parseFloat(content.querySelector('#setting-emoji-size').value).toFixed(1)}em`,
                emojiVerticalAlign: `${parseInt(content.querySelector('#setting-emoji-align').value)}%`,
                debugMode: content.querySelector('#setting-ext-debug').checked
            }
        };

        console.log('[Settings Modal] Saving settings:', newSettings);

        // Apply extension settings immediately if BskyExt is loaded
        if (window.BskyExt) {
            try {
                if (newSettings.extension.enabled) {
                    if (!window.BskyExt.state.initialized) {
                        window.BskyExt.config.enabled = true;
                        await window.BskyExt.init();
                    }
                    await window.BskyExt.configure({
                        enabled: true,
                        emojiSize: newSettings.extension.emojiSize,
                        emojiVerticalAlign: newSettings.extension.emojiVerticalAlign,
                        debugMode: newSettings.extension.debugMode
                    }, false); // Don't save here, we'll save below
                } else {
                    window.BskyExt.config.enabled = false;
                    window.BskyExt.destroy();
                }
            } catch (error) {
                console.error('Failed to apply extension settings:', error);
            }
        }

        try {
            const result = await window.ipc.invoke('app:saveSettings', newSettings);
            if (result.success) {
                console.log('[Settings Modal] Settings saved successfully');
                
                const message = result.requiresRestart 
                    ? 'Settings saved! Please restart the app to apply all changes.'
                    : 'Settings saved successfully!';
                    
                iziToast.success({
                    title: 'Success',
                    message: message,
                    position: 'topRight',
                    timeout: result.requiresRestart ? 6000 : 3000,
                    buttons: result.requiresRestart ? [
                        ['<button>Restart Now</button>', function (instance, toast) {
                            window.ipc.send('app:restart');
                            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
                        }, true]
                    ] : []
                });
                overlay.remove();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            iziToast.error({
                title: 'Error',
                message: 'Failed to save settings: ' + error.message,
                position: 'topRight'
            });
        }
    });

    content.querySelector('#action-restart').addEventListener('click', () => {
        if (window.ipc) {
            window.ipc.send('app:restart');
            overlay.remove();
        }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    document.body.appendChild(overlay);
}

// Export for use in main injector
window.showAppSettingsModal = showAppSettingsModal;