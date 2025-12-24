import { BaseComponent } from '../core/BaseComponent.js';
import './ChampionCard.js';

/**
 * Champion Grid Web Component
 * Displays a grid of champion cards with filtering capabilities
 * 
 * @example
 * <champion-grid></champion-grid>
 * 
 * // Set filters programmatically
 * const grid = document.querySelector('champion-grid');
 * grid.setFilters({ query: 'jin', rank: '5', element: '1' });
 * 
 * @fires champion-select - Bubbled from champion cards
 */
export class ChampionGrid extends BaseComponent {
    onMount() {
        this.classList.add('champion-grid-container');

        // Initialize state
        this.setState({
            champions: [],
            filters: {
                query: '',
                rank: 'all',
                element: 'all',
                weapon: 'all'
            },
            disabledChampions: []
        });

        // Subscribe to state changes
        this._subscriptions = [];

        if (window.state) {
            this._subscriptions.push(
                window.state.subscribe('uniqueCharacters', (chars) => {
                    this.setState({ champions: chars || [] });
                })
            );

            this._subscriptions.push(
                window.state.subscribe('currentRoomState', (room) => {
                    const disabled = room?.actions?.map(a => a.champ) || [];
                    this.setState({ disabledChampions: disabled });
                })
            );

            // Initial load
            if (window.state.uniqueCharacters) {
                this.setState({ champions: window.state.uniqueCharacters });
            }
        }

        // Listen to champion select events from cards
        this.on('champion-select', (e) => {
            // Re-emit for parent components
            this.emit('select', e.detail);
        });
    }

    onUnmount() {
        // Cleanup subscriptions
        this._subscriptions?.forEach(unsub => unsub());
        this._cleanupListeners();
    }

    /**
     * Set filters for the grid
     * @param {Object} filters - Filter object
     */
    setFilters(filters) {
        const currentFilters = this._state.filters;
        this.setState({
            filters: { ...currentFilters, ...filters }
        });
    }

    /**
     * Get filtered champions based on current filters
     * @private
     */
    _getFilteredChampions() {
        const { champions, filters } = this._state;

        return champions.filter(char => {
            // Query filter (name or nickname)
            const matchesQuery = !filters.query ||
                char.en.toLowerCase().includes(filters.query.toLowerCase()) ||
                (char.nickname && char.nickname.toLowerCase().includes(filters.query.toLowerCase()));

            // Rank filter
            const matchesRank = filters.rank === 'all' || char.rank == filters.rank;

            // Element filter
            const matchesElement = filters.element === 'all' || char.element == filters.element;

            // Weapon filter
            const matchesWeapon = filters.weapon === 'all' || char.weapon == filters.weapon;

            return matchesQuery && matchesRank && matchesElement && matchesWeapon;
        });
    }

    render() {
        const filtered = this._getFilteredChampions();
        const { disabledChampions } = this._state;

        if (filtered.length === 0) {
            this.innerHTML = `
        <div class="champion-grid-empty">
          <i class="bi bi-search"></i>
          <p>Không tìm thấy tướng nào</p>
        </div>
      `;
            return;
        }

        // Create grid
        const grid = this.createElement('div', { className: 'champ-grid' });

        filtered.forEach(char => {
            const card = document.createElement('champion-card');
            card.setAttribute('champion', char.en);

            if (disabledChampions.includes(char.en)) {
                card.setAttribute('disabled', '');
            }

            grid.appendChild(card);
        });

        // Clear and append
        this.innerHTML = '';
        this.appendChild(grid);
    }
}

// Register the custom element
customElements.define('champion-grid', ChampionGrid);
