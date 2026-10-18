import {
  ACTIVE_LIBRARY_KEY, IMAGE_DB_NAME, IMAGE_STORE_NAME, LEGACY_CARDS_KEY,
  LIBRARIES_KEY, createCard, createLibrary, normalizeCard, normalizeLibrary,
  type Card, type Library,
} from "@/lib/model";

export async function loadLibraries(): Promise<Library[]> {
  const saved = localStorage.getItem(LIBRARIES_KEY);
  if (saved !== null) {
    const parsed: unknown = JSON.parse(saved);
    const values = Array.isArray(parsed) ? parsed : (parsed as { libraries?: unknown[] } | null)?.libraries ?? [];
    return values.map(normalizeLibrary);
  }
  const legacy = localStorage.getItem(LEGACY_CARDS_KEY);
  let cards = Array.from({ length: 12 }, createCard);
  if (legacy) {
    try {
      const parsed: unknown = JSON.parse(legacy);
      const values = Array.isArray(parsed) ? parsed : (parsed as { cards?: unknown[] } | null)?.cards ?? [];
      if (values.length) {
        cards = [];
        for (const value of values) {
          const card = normalizeCard(value);
          const embeddedImage = value && typeof value === "object" ? (value as { image?: unknown }).image : null;
          if (typeof embeddedImage === "string" && /^data:image\//i.test(embeddedImage)) {
            card.imageId = card.imageId || `img-${crypto.randomUUID()}`;
            await putImage(card.imageId, await (await fetch(embeddedImage)).blob());
          }
          cards.push(card);
        }
      }
    } catch { /* Keep a fresh board when legacy data is malformed. */ }
  }
  return [createLibrary("Main Library", cards)];
}

export function saveLibraries(libraries: Library[]): void {
  localStorage.setItem(LIBRARIES_KEY, JSON.stringify(libraries));
}

export function loadActiveLibraryId(): string {
  return localStorage.getItem(ACTIVE_LIBRARY_KEY) ?? "";
}

export function saveActiveLibraryId(id: string): void {
  if (id) localStorage.setItem(ACTIVE_LIBRARY_KEY, id);
  else localStorage.removeItem(ACTIVE_LIBRARY_KEY);
}

let imageDbPromise: Promise<IDBDatabase> | null = null;

function openImageDb(): Promise<IDBDatabase> {
  if (!imageDbPromise) imageDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE_NAME)) request.result.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); imageDbPromise = null; };
      resolve(db);
    };
    request.onerror = () => {
      imageDbPromise = null;
      reject(request.error ?? new Error("Could not open image storage."));
    };
  });
  return imageDbPromise;
}

export async function getImage(imageId: string): Promise<Blob | null> {
  if (!imageId) return null;
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(IMAGE_STORE_NAME, "readonly").objectStore(IMAGE_STORE_NAME).get(imageId);
    request.onsuccess = () => resolve(request.result?.blob instanceof Blob ? request.result.blob : null);
    request.onerror = () => reject(request.error);
  });
}

export async function putImage(imageId: string, blob: Blob): Promise<void> {
  const db = await openImageDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    tx.objectStore(IMAGE_STORE_NAME).put({ id: imageId, blob, type: blob.type || "image/*", updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function deleteImage(imageId: string): Promise<void> {
  if (!imageId) return;
  const db = await openImageDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    tx.objectStore(IMAGE_STORE_NAME).delete(imageId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearUnusedImages(libraries: Library[]): Promise<void> {
  const used = new Set(libraries.flatMap((library) => library.cards.map((card) => card.imageId)).filter(Boolean));
  const db = await openImageDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => request.result.forEach((key) => { if (!used.has(String(key))) store.delete(key); });
    request.onerror = () => tx.abort();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportCardsWithImages(library: Library): Promise<Blob> {
  const cards = await Promise.all(library.cards.map(async (card) => {
    const blob = card.imageId ? await getImage(card.imageId) : null;
    const image = blob ? await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }) : "";
    return { ...card, image };
  }));
  return new Blob([JSON.stringify({ name: library.name, exportedAt: new Date().toISOString(), cards }, null, 2)], { type: "application/json" });
}

export async function importCards(file: File): Promise<Card[]> {
  const parsed: unknown = JSON.parse(await file.text());
  const rawCards = Array.isArray(parsed) ? parsed : (parsed as { cards?: unknown[] } | null)?.cards ?? [];
  const cards: Card[] = [];
  for (const raw of rawCards) {
    const normalized = normalizeCard(raw);
    const image = raw && typeof raw === "object" ? (raw as { image?: unknown }).image : null;
    if (typeof image === "string" && /^data:image\//i.test(image)) {
      const blob = await (await fetch(image)).blob();
      normalized.imageId = normalized.imageId || `img-${crypto.randomUUID()}`;
      await putImage(normalized.imageId, blob);
    }
    cards.push(normalized);
  }
  return cards;
}
