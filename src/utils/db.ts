// --- IndexedDB for Large File Persistence ---
const DB_NAME = 'VibeFlowDB';
const STORE_NAME = 'mediaStore';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Version 2
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains('audioStore')) {
        db.createObjectStore('audioStore');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveAudioToDB = async (data: string) => {
  try {
    const db = await initDB();
    const tx = db.transaction('audioStore', 'readwrite');
    tx.objectStore('audioStore').put(data, 'currentAudio');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to save to IndexedDB", e);
  }
};

export const loadAudioFromDB = async (): Promise<string | null> => {
  try {
    const db = await initDB();
    const tx = db.transaction('audioStore', 'readonly');
    const request = tx.objectStore('audioStore').get('currentAudio');
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load from IndexedDB", e);
    return null;
  }
};

export const clearAudioFromDB = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('audioStore', 'readwrite');
    tx.objectStore('audioStore').delete('currentAudio');
  } catch (e) {
    console.error("Failed to clear IndexedDB", e);
  }
};

export const saveMediaToDB = async (key: string, data: any) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to save media to IndexedDB", e);
  }
};

export const loadMediaFromDB = async (key: string): Promise<any | null> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load media from IndexedDB", e);
    return null;
  }
};

export const clearMediaFromDB = async (key: string) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch (e) {
    console.error("Failed to clear media from IndexedDB", e);
  }
};

export const saveVoiceToDB = async (key: string, data: string, name: string) => {
  try {
    const db = await initDB();
    const tx = db.transaction('audioStore', 'readwrite');
    tx.objectStore('audioStore').put({ data, name }, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to save voice to IndexedDB", e);
  }
};

export const loadVoiceFromDB = async (key: string): Promise<{ data: string, name: string } | null> => {
  try {
    const db = await initDB();
    const tx = db.transaction('audioStore', 'readonly');
    const request = tx.objectStore('audioStore').get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load voice from IndexedDB", e);
    return null;
  }
};

export const deleteVoiceFromDB = async (key: string) => {
  try {
    const db = await initDB();
    const tx = db.transaction('audioStore', 'readwrite');
    tx.objectStore('audioStore').delete(key);
  } catch (e) {
    console.error("Failed to delete voice from IndexedDB", e);
  }
};
