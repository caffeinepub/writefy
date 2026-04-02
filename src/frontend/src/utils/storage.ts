// ============================================================
// Writefy Storage Utility
// Dual-layer persistence: IndexedDB + File System Access API
// ============================================================

export type SyncStatus = "saved" | "memory" | "error" | "idle";

// ── IndexedDB wrapper ──────────────────────────────────────

const DB_NAME = "writefy_db";
const DB_VERSION = 1;
const STORE_NAME = "writefy_store";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToIDB(key: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[IDB] saveToIDB failed:", e);
  }
}

export async function loadFromIDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[IDB] loadFromIDB failed:", e);
    return null;
  }
}

// ── File System Access API helpers ────────────────────────

export async function requestFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    return null;
  }
  try {
    // @ts-ignore – File System Access API
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    return handle as FileSystemDirectoryHandle;
  } catch {
    return null;
  }
}

export async function saveToFolder(
  folderHandle: FileSystemDirectoryHandle,
  filename: string,
  data: string,
): Promise<boolean> {
  try {
    // @ts-ignore – File System Access API
    const fileHandle = await folderHandle.getFileHandle(filename, {
      create: true,
    });
    // @ts-ignore – File System Access API
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  } catch (e) {
    console.warn("[FS] saveToFolder failed:", e);
    return false;
  }
}

export async function readFromFolder(
  folderHandle: FileSystemDirectoryHandle,
  filename: string,
): Promise<string | null> {
  try {
    // @ts-ignore – File System Access API
    const fileHandle = await folderHandle.getFileHandle(filename);
    // @ts-ignore – File System Access API
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

// ── Debounce utility ──────────────────────────────────────

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}
