import { BaseComponent } from '../core/BaseComponent.js';

/**
 * Champion Card Web Component
 * Displays a single champion with icon, name, and interactive states
 * 
 * @example
 * <champion-card champion="Jiyan"></champion-card>
 * <champion-card champion="Yinlin" disabled></champion-card>
 * <champion-card champion="Camellya" selected></champion-card>
 * 
 * @fires champion-select - When card is clicked (if not disabled)
 */
export class ChampionCard extends BaseComponent {
    static get observedAttributes() {
        return ['champion', 'disabled', 'selected'];
    }

    onMount() {
        this.classList.add('champ-card');
        this.on('click', this._handleClick.bind(this));
    }

    onUnmount() {
        this._cleanupListeners();
    }

    _handleClick(e) {
        if (this.hasAttribute('disabled')) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const champion = this.getAttribute('champion');
        this.emit('champion-select', { champion });
    }

    render() {
        const champion = this.getAttribute('champion');
        if (!champion) {
            this.innerHTML = '';
            return;
        }

        // Get champion data from global state
        const charData = window.state?.characters?.[champion];
        if (!charData) {
            console.warn(`[ChampionCard] Character data not found for: ${champion}`);
            this.innerHTML = `<div class="champ-card-error">?</div>`;
            return;
        }

        const disabled = this.hasAttribute('disabled');
        const selected = this.hasAttribute('selected');

        // Update classes
        this.classList.toggle('disabled', disabled);
        this.classList.toggle('selected', selected);
        this.classList.toggle('champ-card-clickable', !disabled);

        // Render content
        this.innerHTML = `
      <img 
        src="${charData.icon}" 
        alt="${charData.en}"
        title="${charData.en}"
        loading="lazy"
        class="champ-card-img"
      >
      <div class="champ-card-name">${this._truncateName(charData.en, 13)}</div>
      ${disabled ? '<div class="champ-card-disabled-overlay"></div>' : ''}
      ${selected ? '<div class="champ-card-selected-indicator"></div>' : ''}
    `;
    }

    /**
     * Truncate name if too long
     * @private
     */
    _truncateName(name, maxLength = 13) {
        if (name && name.length > maxLength) {
            return name.substring(0, maxLength) + '..';
        }
        return name;
    }
}

// Register the custom element
customElements.define('champion-card', ChampionCard);
