import { Consumer, FollowUpHistory, AppSettings, DEFAULT_SETTINGS, ConsumerStatus } from '../types';

const DB_NAME = 'MRA_DB';
const DB_VERSION = 1;
const STORE_CONSUMERS = 'consumers';
const STORE_HISTORY = 'history';
const STORE_SETTINGS = 'settings';

export class DBService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Consumers Store
        if (!db.objectStoreNames.contains(STORE_CONSUMERS)) {
          const store = db.createObjectStore(STORE_CONSUMERS, { keyPath: 'consumerNo' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('nextFollowUpDate', 'nextFollowUpDate', { unique: false });
        }

        // History Store
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const store = db.createObjectStore(STORE_HISTORY, { keyPath: 'id', autoIncrement: true });
          store.createIndex('consumerNo', 'consumerNo', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    return this.dbPromise;
  }

  // --- Consumers ---

  async getAllConsumers(): Promise<Consumer[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CONSUMERS], 'readonly');
      const store = tx.objectStore(STORE_CONSUMERS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getConsumer(consumerNo: string): Promise<Consumer | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CONSUMERS], 'readonly');
      const store = tx.objectStore(STORE_CONSUMERS);
      const request = store.get(consumerNo);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getConsumerCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CONSUMERS], 'readonly');
      const store = tx.objectStore(STORE_CONSUMERS);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveConsumers(consumers: Consumer[], clearOld: boolean = false): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CONSUMERS], 'readwrite');
      const store = tx.objectStore(STORE_CONSUMERS);

      if (clearOld) {
        store.clear();
      }

      consumers.forEach(c => store.put(c));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateConsumer(consumer: Consumer): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CONSUMERS], 'readwrite');
      const store = tx.objectStore(STORE_CONSUMERS);
      store.put(consumer);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async purgeConsumers(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_CONSUMERS], 'readwrite');
        const store = tx.objectStore(STORE_CONSUMERS);
        
        // 1. Clear the store
        const clearRequest = store.clear();
        
        // 2. Verified Purge: Check count inside transaction to ensure atomicity
        clearRequest.onsuccess = () => {
             const countRequest = store.count();
             countRequest.onsuccess = () => {
                 if (countRequest.result !== 0) {
                     console.error("Purge verification failed inside transaction. Count: " + countRequest.result);
                     tx.abort(); // Rollback if somehow not empty
                 }
             };
        };

        tx.oncomplete = () => {
          console.log("DB: Purge transaction committed and verified.");
          resolve();
        };
        
        tx.onerror = (e) => {
          console.error("DB: Purge transaction failed", e);
          reject(tx.error);
        };
    });
  }

  // --- History ---

  async addHistory(history: Omit<FollowUpHistory, 'id'>): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_HISTORY], 'readwrite');
      const store = tx.objectStore(STORE_HISTORY);
      store.add(history);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getHistoryForConsumer(consumerNo: string): Promise<FollowUpHistory[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_HISTORY], 'readonly');
      const store = tx.objectStore(STORE_HISTORY);
      const index = store.index('consumerNo');
      const request = index.getAll(consumerNo);
      request.onsuccess = () => {
        // Sort descending by timestamp
        const sorted = (request.result as FollowUpHistory[]).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings ---

  async getSettings(): Promise<AppSettings> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SETTINGS], 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.get('appSettings');
      request.onsuccess = () => {
        resolve(request.result?.value || DEFAULT_SETTINGS);
      };
      request.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SETTINGS], 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      store.put({ key: 'appSettings', value: settings });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Backup & Restore ---

  async exportData(): Promise<string> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      // Export History and Settings. Consumers are excluded.
      const tx = db.transaction([STORE_HISTORY, STORE_SETTINGS], 'readonly');
      const historyReq = tx.objectStore(STORE_HISTORY).getAll();
      const settingsReq = tx.objectStore(STORE_SETTINGS).getAll();

      const data: any = {};

      tx.oncomplete = () => {
        data.history = historyReq.result;
        const s = settingsReq.result.find(i => i.key === 'appSettings');
        data.settings = s ? s.value : DEFAULT_SETTINGS;
        data.meta = {
          version: 1,
          type: 'MRA_BACKUP_PARTIAL',
          date: new Date().toISOString()
        };
        
        resolve(JSON.stringify(data));
      };
      
      tx.onerror = () => reject(tx.error);
    });
  }

  async importData(jsonString: string): Promise<void> {
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      return Promise.reject(new Error("Invalid JSON File."));
    }

    // STRICT VALIDATION: Check if history exists BEFORE we clear the database
    // This prevents wiping data if the file is invalid or empty
    if (!data || !Array.isArray(data.history)) {
       return Promise.reject(new Error("Invalid Backup Format. Missing 'history' data."));
    }

    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_HISTORY, STORE_SETTINGS], 'readwrite');

      // Clear existing History and Settings
      const histStore = tx.objectStore(STORE_HISTORY);
      histStore.clear();
      
      const setStore = tx.objectStore(STORE_SETTINGS);
      setStore.clear();

      // Import History
      data.history.forEach((h: FollowUpHistory) => {
          histStore.put(h);
      });

      // Import Settings
      if (data.settings) {
        setStore.put({ key: 'appSettings', value: data.settings });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const db = new DBService();
