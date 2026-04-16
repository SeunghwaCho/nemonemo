/**
 * IndexedDB 래퍼 - DB 오류 시에도 게임 동작 보장
 * IndexedDB wrapper with graceful failure handling
 */

import { LevelProgress } from '../types';

const DB_NAME = 'NemonemoGame';
const DB_VERSION = 1;
const STORE_NAME = 'progress';

export class DBManager {
  private db: IDBDatabase | null = null;
  private available = false;

  async init(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB not available');
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('IndexedDB open failed:', request.error);
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.available = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'levelId' });
          store.createIndex('levelId', 'levelId', { unique: true });
        }
      };
    });
  }

  async saveProgress(progress: LevelProgress): Promise<void> {
    if (!this.available || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(progress);
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('Save failed:', request.error);
          resolve();
        };
      } catch (e) {
        console.warn('Save exception:', e);
        resolve();
      }
    });
  }

  async loadProgress(levelId: number): Promise<LevelProgress | null> {
    if (!this.available || !this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(levelId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          console.warn('Load failed:', request.error);
          resolve(null);
        };
      } catch (e) {
        console.warn('Load exception:', e);
        resolve(null);
      }
    });
  }

  async loadAllProgress(): Promise<LevelProgress[]> {
    if (!this.available || !this.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.warn('LoadAll failed:', request.error);
          resolve([]);
        };
      } catch (e) {
        console.warn('LoadAll exception:', e);
        resolve([]);
      }
    });
  }

  async clearProgress(levelId: number): Promise<void> {
    if (!this.available || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(levelId);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }
}
