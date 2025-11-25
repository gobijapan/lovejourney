
// IndexedDB Wrapper to handle large storage limits (PWA friendly)
import { CoupleData, Memory, PlanItem } from "../types";

const DB_NAME = 'LoveSyncDB';
const DB_VERSION = 1;
const STORES = {
    DATA: 'data',
    MEMORIES: 'memories',
    PLANS: 'plans'
};

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => reject("Database error: " + (event.target as any).error);
        
        request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.DATA)) db.createObjectStore(STORES.DATA, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.MEMORIES)) db.createObjectStore(STORES.MEMORIES, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.PLANS)) db.createObjectStore(STORES.PLANS, { keyPath: 'id' });
        };
    });
};

export const dbService = {
    // Generic Get
    getAll: async <T>(storeName: string): Promise<T[]> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Generic Add/Put
    put: async (storeName: string, item: any) => {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Save Settings (Single Object)
    saveSettings: async (data: CoupleData) => {
        // We store settings as an object with id='settings'
        return dbService.put(STORES.DATA, { ...data, id: 'settings' });
    },

    // Get Settings
    getSettings: async (): Promise<CoupleData | null> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.DATA, 'readonly');
            const store = transaction.objectStore(STORES.DATA);
            const request = store.get('settings');
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    // Bulk save (for arrays like memories/plans)
    // NOTE: In IndexedDB, we store items individually, not as a big array like LocalStorage
    // This allows storing thousands of items without reading/writing the whole list every time.
    saveMemory: async (memory: Memory) => {
        return dbService.put(STORES.MEMORIES, memory);
    },
    
    deleteMemory: async (id: string) => {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORES.MEMORIES, 'readwrite');
            const store = transaction.objectStore(STORES.MEMORIES);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    savePlan: async (plan: PlanItem) => {
        return dbService.put(STORES.PLANS, plan);
    },

    deletePlan: async (id: string) => {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORES.PLANS, 'readwrite');
            const store = transaction.objectStore(STORES.PLANS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // Clear everything (Reset)
    clearAll: async () => {
         const db = await openDB();
         const transaction = db.transaction([STORES.DATA, STORES.MEMORIES, STORES.PLANS], 'readwrite');
         transaction.objectStore(STORES.DATA).clear();
         transaction.objectStore(STORES.MEMORIES).clear();
         transaction.objectStore(STORES.PLANS).clear();
         return new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
         });
    },

    // Export all data for backup
    exportData: async () => {
        const settings = await dbService.getSettings();
        const memories = await dbService.getAll<Memory>(STORES.MEMORIES);
        const plans = await dbService.getAll<PlanItem>(STORES.PLANS);
        
        return {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {
                settings,
                memories,
                plans
            }
        };
    },

    // Import data from backup
    importData: async (backupData: any) => {
        if (!backupData || !backupData.data) throw new Error("File sao lưu không hợp lệ");
        
        // Clear existing data first
        await dbService.clearAll();

        const { settings, memories, plans } = backupData.data;

        // Restore Settings
        if (settings) await dbService.saveSettings(settings);

        // Restore Memories
        if (Array.isArray(memories)) {
            for (const m of memories) await dbService.saveMemory(m);
        }

        // Restore Plans
        if (Array.isArray(plans)) {
            for (const p of plans) await dbService.savePlan(p);
        }
    }
};
