import { BaseComponent } from '../core/BaseComponent.js';

/**
 * Host Controls Panel Web Component
 * Offcanvas panel chứa tất cả controls cho host
 * 
 * @example
 * <host-controls-panel></host-controls-panel>
 */
export class HostControlsPanel extends BaseComponent {
    onMount() {
        this.classList.add('host-controls-wrapper');

        // Initialize state
        this.setState({
            isVisible: false,
            activeTab: 'tools',
            roomId: null
        });

        // Subscribe to state changes
        if (window.state) {
            window.state.subscribe('myRoom', (roomId) => {
                this.setState({ roomId });
            });
        }

        // Setup event listeners after render
        this.scheduleRender();
    }

    onUnmount() {
        this._cleanupListeners();
    }

    /**
     * Switch active tab
     */
    switchTab(tabName) {
        this.setState({ activeTab: tabName });
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        this.setState({ isVisible: !this._state.isVisible });
    }

    render() {
        const { activeTab, roomId } = this._state;

        this.innerHTML = `
      <!-- Host Controls Toggle Button -->
      <button id="host-controls-toggle"
        class="btn btn-primary position-fixed host-controls-btn"
        type="button" data-bs-toggle="offcanvas" data-bs-target="#host-controls-panel" aria-controls="host-controls-panel"
        style="top: 20px; right: 20px; z-index: 1040; display: none;">
        <i class="bi bi-gear-fill"></i>
      </button>

      <!-- Offcanvas Panel -->
      <div class="offcanvas offcanvas-end settings-offcanvas" tabindex="-1" id="host-controls-panel"
        aria-labelledby="host-controls-panel-label" data-bs-backdrop="false" data-bs-scroll="true">
        
        <!-- Header -->
        <div class="offcanvas-header settings-header">
          <div>
            <h5 class="offcanvas-title settings-title mb-0" id="host-controls-panel-label">Bảng điều khiển</h5>
            <p class="settings-subtitle mb-0">Cài đặt và quản lý phòng</p>
          </div>
          <button type="button" class="btn-close settings-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>

        <!-- Tab Navigation -->
        <div class="settings-tabs">
          <button class="settings-tab ${activeTab === 'tools' ? 'active' : ''}" data-tab="tools">
            <i class="bi bi-tools"></i>
            <span>Điều Khiển</span>
          </button>
          <button class="settings-tab ${activeTab === 'utilities' ? 'active' : ''}" data-tab="utilities">
            <i class="bi bi-magic"></i>
            <span>Công Cụ</span>
          </button>
          <button class="settings-tab ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
            <i class="bi bi-gear"></i>
            <span>Cài Đặt</span>
          </button>
          <button class="settings-tab ${activeTab === 'info' ? 'active' : ''}" data-tab="info">
            <i class="bi bi-info-circle-fill"></i>
            <span>Thông Tin</span>
          </button>
          <button class="settings-tab" data-tab="exit" id="settings-exit-btn">
            <i class="bi bi-box-arrow-right"></i>
            <span>Thoát</span>
          </button>
        </div>

        <!-- Tab Content Container -->
        <div class="offcanvas-body settings-body" id="host-controls-content">
          <!-- Content will be loaded from components/host-controls.html -->
        </div>
      </div>
    `;

        // Setup tab switching after render
        setTimeout(() => this._setupTabSwitching(), 0);
    }

    /**
     * Setup tab switching functionality
     * @private
     */
    _setupTabSwitching() {
        const tabs = this.querySelectorAll('.settings-tab[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;

                if (tabName === 'exit') {
                    this._handleExit();
                    return;
                }

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Update content visibility
                const contents = document.querySelectorAll('.settings-tab-content');
                contents.forEach(content => {
                    content.classList.toggle('active', content.dataset.tabContent === tabName);
                });

                this.setState({ activeTab: tabName });
            });
        });
    }

    /**
     * Handle exit button click
     * @private
     */
    _handleExit() {
        if (typeof closeRoom === 'function') {
            closeRoom();
        }
    }
}

// Register the custom element
customElements.define('host-controls-panel', HostControlsPanel);
