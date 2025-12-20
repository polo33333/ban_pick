import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATS_FILE = path.join(__dirname, '..', 'stats.json');

// Initialize empty stats structure
const emptyStats = {
    sessions: [],
    characters: {},
    metadata: {
        totalGames: 0,
        totalSessions: 0,
        firstSession: null,
        lastSession: null,
        lastUpdated: null
    }
};

/**
 * Load statistics from stats.json
 */
export async function loadStats() {
    try {
        const data = await fs.readFile(STATS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is invalid, return empty stats
        if (error.code === 'ENOENT') {
            console.log('stats.json not found, creating new file...');
            await saveStats(emptyStats);
            return emptyStats;
        }
        console.error('Error loading stats:', error);
        return emptyStats;
    }
}

/**
 * Save statistics to stats.json
 */
export async function saveStats(stats) {
    try {
        await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
        console.log('Statistics saved successfully');
    } catch (error) {
        console.error('Error saving stats:', error);
    }
}

/**
 * Record a new draft session and update aggregated statistics
 */
export async function recordSession(sessionData) {
    try {
        const stats = await loadStats();

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        // Create session object
        const session = {
            sessionId,
            timestamp,
            roomId: sessionData.roomId,
            players: {
                player1: {
                    id: sessionData.playerOrder[0],
                    name: sessionData.playerHistory[sessionData.playerOrder[0]]?.name || 'Player 1'
                },
                player2: {
                    id: sessionData.playerOrder[1],
                    name: sessionData.playerHistory[sessionData.playerOrder[1]]?.name || 'Player 2'
                }
            },
            bans: sessionData.actions.filter(a => a.type === 'ban' && a.champ !== 'SKIPPED').map(a => a.champ),
            picks: {
                player1: sessionData.actions.filter(a => a.type === 'pick' && a.team === sessionData.playerOrder[0] && a.champ !== 'SKIPPED').map(a => a.champ),
                player2: sessionData.actions.filter(a => a.type === 'pick' && a.team === sessionData.playerOrder[1] && a.champ !== 'SKIPPED').map(a => a.champ)
            }
        };

        // Add to sessions array
        stats.sessions.push(session);

        // Update character statistics
        sessionData.actions.forEach(action => {
            // Skip SKIPPED actions
            if (action.champ === 'SKIPPED') return;

            const champName = action.champ;

            // Initialize character if not exists
            if (!stats.characters[champName]) {
                stats.characters[champName] = {
                    totalBans: 0,
                    totalPicks: 0,
                    totalGames: 0,
                    banRate: 0,
                    pickRate: 0,
                    lastBanned: null,
                    lastPicked: null,
                    lastUpdated: null
                };
            }

            const char = stats.characters[champName];

            // Update counts
            if (action.type === 'ban') {
                char.totalBans++;
                char.lastBanned = timestamp;
            } else if (action.type === 'pick') {
                char.totalPicks++;
                char.lastPicked = timestamp;
            }
        });

        // Update totalGames for all characters that appeared in this session
        const appearedChamps = new Set(
            sessionData.actions
                .filter(a => a.champ !== 'SKIPPED')
                .map(a => a.champ)
        );

        appearedChamps.forEach(champName => {
            stats.characters[champName].totalGames++;

            // Recalculate rates
            const char = stats.characters[champName];
            char.banRate = char.totalGames > 0 ? char.totalBans / char.totalGames : 0;
            char.pickRate = char.totalGames > 0 ? char.totalPicks / char.totalGames : 0;
            char.lastUpdated = timestamp;
        });

        // Update metadata
        stats.metadata.totalGames++;
        stats.metadata.totalSessions++;

        if (!stats.metadata.firstSession) {
            stats.metadata.firstSession = timestamp;
        }

        stats.metadata.lastSession = timestamp;
        stats.metadata.lastUpdated = timestamp;

        // Save to file
        await saveStats(stats);

        console.log(`Session ${sessionId} recorded successfully`);
        return session;
    } catch (error) {
        console.error('Error recording session:', error);
        throw error;
    }
}

/**
 * Get current statistics
 */
export async function getStats() {
    return await loadStats();
}

/**
 * Reset all statistics (optional admin function)
 */
export async function resetStats() {
    await saveStats(emptyStats);
    console.log('Statistics reset successfully');
}
