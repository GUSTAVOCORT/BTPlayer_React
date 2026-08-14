import { TrackItem } from '../types';

const DB_NAME = 'BTPlayerDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_tracks';

export interface StoredTrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  blob: Blob;
  createdAt: number;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save multiple audio tracks (Blobs + metadata) to IndexedDB for persistent storage across app reloads.
 */
export async function saveTracksToStorage(
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    album: string;
    durationMs: number;
    blob: Blob;
  }>
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const track of tracks) {
      const record: StoredTrackRecord = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        durationMs: track.durationMs || 180000,
        blob: track.blob,
        createdAt: Date.now(),
      };
      store.put(record);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save tracks to IndexedDB:', err);
  }
}

/**
 * Load all stored tracks from IndexedDB, recreating valid blob URLs.
 */
export async function loadTracksFromStorage(): Promise<TrackItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const records: StoredTrackRecord[] = request.result || [];
        // Sort by createdAt descending (newest first)
        records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const trackItems: TrackItem[] = records.map((rec) => {
          let url = '';
          if (rec.blob) {
            try {
              url = URL.createObjectURL(rec.blob);
            } catch (e) {
              console.warn('Could not create ObjectURL for stored track:', e);
            }
          }
          return {
            id: rec.id,
            title: rec.title,
            artist: rec.artist || 'Archivo Local',
            album: rec.album || 'Mi Música',
            durationMs: rec.durationMs || 180000,
            url,
            isSynth: false,
          };
        });

        resolve(trackItems);
      };

      request.onerror = () => {
        console.warn('Error fetching tracks from IndexedDB:', request.error);
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Failed to load tracks from IndexedDB:', err);
    return [];
  }
}

/**
 * Remove a track from IndexedDB
 */
export async function deleteTrackFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to delete track from IndexedDB:', err);
  }
}

/**
 * Clear all stored tracks
 */
export async function clearAllTracksFromStorage(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear tracks from IndexedDB:', err);
  }
}

/**
 * Playback session state persistence (localStorage)
 */
const PLAYBACK_SESSION_KEY = 'btplayer_session_state';

export interface PlaybackSessionState {
  currentTrackId?: string;
  currentTrackIndex?: number;
  positionMs?: number;
  repeatMode?: 'off' | 'all' | 'one';
  shuffle?: boolean;
}

export function savePlaybackSession(state: PlaybackSessionState) {
  try {
    localStorage.setItem(PLAYBACK_SESSION_KEY, JSON.stringify(state));
  } catch (_e) {}
}

export function loadPlaybackSession(): PlaybackSessionState | null {
  try {
    const data = localStorage.getItem(PLAYBACK_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (_e) {
    return null;
  }
}
