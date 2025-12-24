/**
 * Component Registry
 * Central place to import and register all Web Components
 * 
 * Usage:
 * import './components/index.js'; // Registers all components
 */

// Import all components
import './ChampionCard.js';
import './ChampionGrid.js';
import './CountdownTimer.js';
import './HostControlsPanel.js';

// Export for programmatic access if needed
export { ChampionCard } from './ChampionCard.js';
export { ChampionGrid } from './ChampionGrid.js';
export { CountdownTimer } from './CountdownTimer.js';
export { HostControlsPanel } from './HostControlsPanel.js';

console.log('[Components] Web Components registered');
