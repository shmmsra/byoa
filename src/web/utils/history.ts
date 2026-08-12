import { HistoryEntry, HistoryFilter } from '../app';

export interface HistoryQueryResult {
    items: HistoryEntry[];
    total: number;
}

// Bump when the shape of a saved entry changes, so future migrations can
// tell which rows were written by which client version.
// v2: added systemContent (the actual instruction sent to the LLM).
export const HISTORY_SCHEMA_VERSION = 2;

export type NewHistoryEntry = Omit<HistoryEntry, 'id' | 'schemaVersion'>;

// History utility functions for recording and browsing local query/response history
export class HistoryUtils {
    /**
     * Save a query/response entry to the local history database
     */
    static async saveEntry(entry: NewHistoryEntry): Promise<boolean> {
        try {
            if (!window.saucer?.exposed?.history_saveEntry) {
                console.warn('History API not available, cannot save entry');
                return false;
            }

            const payload = JSON.stringify({ ...entry, schemaVersion: HISTORY_SCHEMA_VERSION });
            const success = await window.saucer.exposed.history_saveEntry(payload);

            if (!success) {
                console.error('Failed to save history entry');
            }

            return success;
        } catch (error) {
            console.error('Error saving history entry:', error);
            return false;
        }
    }

    /**
     * Query history entries matching an optional filter
     */
    static async queryEntries(filter: HistoryFilter = {}): Promise<HistoryQueryResult> {
        try {
            if (!window.saucer?.exposed?.history_queryEntries) {
                console.warn('History API not available, returning empty history');
                return { items: [], total: 0 };
            }

            const resultJson = await window.saucer.exposed.history_queryEntries(
                JSON.stringify(filter),
            );
            const result = JSON.parse(resultJson) as HistoryQueryResult;
            return result;
        } catch (error) {
            console.error('Error querying history entries:', error);
            return { items: [], total: 0 };
        }
    }

    /**
     * Delete a single history entry
     */
    static async deleteEntry(id: number): Promise<boolean> {
        try {
            if (!window.saucer?.exposed?.history_deleteEntry) {
                console.warn('History API not available, cannot delete entry');
                return false;
            }

            const success = await window.saucer.exposed.history_deleteEntry(String(id));

            if (!success) {
                console.error('Failed to delete history entry:', id);
            }

            return success;
        } catch (error) {
            console.error('Error deleting history entry:', error);
            return false;
        }
    }

    /**
     * Delete all history entries
     */
    static async clearAll(): Promise<boolean> {
        try {
            if (!window.saucer?.exposed?.history_clearAll) {
                console.warn('History API not available, cannot clear history');
                return false;
            }

            const success = await window.saucer.exposed.history_clearAll();

            if (!success) {
                console.error('Failed to clear history');
            }

            return success;
        } catch (error) {
            console.error('Error clearing history:', error);
            return false;
        }
    }
}
