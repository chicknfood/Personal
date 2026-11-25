// IndexedDB Storage for Creature Adventure Videos

const DB_NAME = 'creature_videos_db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'creatureId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve cached video entry by creatureId
 * @returns {Promise<{ creatureId: string, videoBlob?: Blob, videoUrl?: string, prompts?: object, createdAt: string } | null>}
 */
export async function getCachedVideo(creatureId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(creatureId);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) return resolve(null);

        // If stored as Blob(s), create object URL(s) for playback
        if (result.videoBlob) {
          result.videoUrl = URL.createObjectURL(result.videoBlob);
        }
        if (result.adventureBlob) {
          result.adventureVideoUrl = URL.createObjectURL(result.adventureBlob);
        }
        resolve(result);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[VideoCache] Failed to get video for ${creatureId}:`, err);
    return null;
  }
}

/**
 * Save video into IndexedDB cache
 */
export async function saveCachedVideo(creatureId, { videoBlob, adventureBlob = null, videoUrl, adventureVideoUrl = null, engine = '', prompts = null }) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const entry = {
        creatureId,
        videoBlob: videoBlob || null,
        adventureBlob: adventureBlob || null,
        videoUrl: videoUrl || null,
        adventureVideoUrl: adventureVideoUrl || null,
        engine: engine || '',
        prompts: prompts || null,
        createdAt: new Date().toISOString()
      };

      const request = store.put(entry);
      request.onsuccess = () => resolve(entry);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[VideoCache] Failed to save video for ${creatureId}:`, err);
  }
}

/**
 * Get all creature IDs that have cached videos
 * @returns {Promise<string[]>}
 */
export async function getAllCachedVideoIds() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[VideoCache] Failed to get all cached keys:', err);
    return [];
  }
}
