function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read that image."));
        reader.readAsDataURL(blob);
    });
}

function loadCards() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) {
            return Array.from({ length: INITIAL_CARD_COUNT }, createCard);
        }

        const parsed = JSON.parse(stored);
        const normalized = normalizeStoredCards(parsed);
        return normalized;
    } catch (error) {
        return Array.from({ length: INITIAL_CARD_COUNT }, createCard);
    }
}

function saveCards() {
    const library = getActiveLibrary();
    if (!library) return;

    library.cards = cards.map(stripTransientCardData);
    library.updatedAt = new Date().toISOString();
    saveLibraries();
}

async function exportLibrary() {
    const library = getActiveLibrary();
    if (!library) return;

    const exportCards = [];

    for (const card of cards) {
        let image = "";

        if (card.imageId) {
            const record = await getImageRecord(card.imageId);
            if (record && record.blob) {
                image = await blobToDataUrl(record.blob);
            }
        }

        exportCards.push({
            ...stripTransientCardData(card),
            image
        });
    }

    const payload = {
        name: library.name,
        exportedAt: new Date().toISOString(),
        cards: exportCards
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(library.name)}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Backup exported.");
}

function normalizeStoredCards(value) {
    const rawCards = Array.isArray(value) ? value : value && Array.isArray(value.cards) ? value.cards : [];

    return rawCards.map(normalizeStoredCard);
}

function normalizeStoredCard(card) {
    if (!card || typeof card !== "object") {
        card = {};
    }

    return {
        id: typeof card.id === "string" && card.id ? card.id : createId("card"),
        title: typeof card.title === "string" && card.title.trim() ? card.title.trim() : "Untitled",
        link: typeof card.link === "string" ? cleanLink(card.link.trim()) : "",
        imageId: typeof card.imageId === "string" ? card.imageId : "",
        legacyImage: typeof card.image === "string" && isDataImage(card.image) ? card.image : "",
        createdAt: typeof card.createdAt === "string" ? card.createdAt : new Date().toISOString()
    };
}

async function buildImportedCards(value) {
    const rawCards = Array.isArray(value) ? value : value && Array.isArray(value.cards) ? value.cards : [];
    const importedCards = [];

    for (const rawCard of rawCards) {
        const card = normalizeStoredCard(rawCard);

        if (rawCard && isDataImage(rawCard.image)) {
            const imageId = typeof rawCard.imageId === "string" && rawCard.imageId ? rawCard.imageId : createImageId();
            const blob = await dataUrlToBlob(rawCard.image);
            await saveImageBlob(imageId, blob);
            card.imageId = imageId;
        }

        importedCards.push(stripTransientCardData(card));
    }

    return importedCards;
}

async function migrateLegacyImages(sourceCards) {
    const migratedCards = [];

    for (const sourceCard of sourceCards) {
        const card = normalizeStoredCard(sourceCard);

        if (card.legacyImage) {
            const imageId = card.imageId || createImageId();
            const blob = await dataUrlToBlob(card.legacyImage);
            await saveImageBlob(imageId, blob);
            card.imageId = imageId;
        }

        migratedCards.push(stripTransientCardData(card));
    }

    return migratedCards;
}

function stripTransientCardData(card) {
    return {
        id: card.id,
        title: card.title,
        link: card.link,
        imageId: card.imageId || "",
        createdAt: card.createdAt
    };
}

function isDataImage(value) {
    return typeof value === "string" && /^data:image\//i.test(value);
}

async function dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return response.blob();
}

async function refreshImageUrls() {
    revokeAllImageUrls();

    const imageIds = [...new Set(cards.map((card) => card.imageId).filter(Boolean))];

    for (const imageId of imageIds) {
        const record = await getImageRecord(imageId);
        if (record && record.blob) {
            imageUrls.set(imageId, URL.createObjectURL(record.blob));
        }
    }
}

function revokeAllImageUrls() {
    imageUrls.forEach((url) => URL.revokeObjectURL(url));
    imageUrls.clear();
}

function getDb() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                    db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Could not open image storage."));
        });
    }

    return dbPromise;
}

function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Image storage failed."));
    });
}

function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Image storage failed."));
        transaction.onabort = () => reject(transaction.error || new Error("Image storage aborted."));
    });
}

async function saveImageBlob(imageId, blob) {
    const db = await getDb();
    const transaction = db.transaction(IMAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(IMAGE_STORE).put({
        id: imageId,
        blob,
        type: blob.type || "image/*",
        updatedAt: new Date().toISOString()
    });
    await done;
}

async function getImageRecord(imageId) {
    if (!imageId) return null;

    const db = await getDb();
    const transaction = db.transaction(IMAGE_STORE, "readonly");
    const done = transactionDone(transaction);
    const request = transaction.objectStore(IMAGE_STORE).get(imageId);
    const record = await requestToPromise(request);
    await done;
    return record || null;
}

async function deleteImageRecord(imageId) {
    if (!imageId) return;

    const db = await getDb();
    const transaction = db.transaction(IMAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(IMAGE_STORE).delete(imageId);
    await done;
}

async function deleteImageIfUnused(imageId) {
    if (!imageId || isImageUsed(imageId)) return;

    const url = imageUrls.get(imageId);
    if (url) {
        URL.revokeObjectURL(url);
        imageUrls.delete(imageId);
    }

    await deleteImageRecord(imageId);
}

async function deleteUnusedImages() {
    const usedImageIds = new Set(getAllCards().map((card) => card.imageId).filter(Boolean));
    const db = await getDb();
    const transaction = db.transaction(IMAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(IMAGE_STORE);
    const request = store.getAllKeys();

    request.onsuccess = () => {
        request.result.forEach((key) => {
            if (!usedImageIds.has(key)) {
                store.delete(key);
            }
        });
    };

    request.onerror = () => {
        transaction.abort();
    };

    await done;
}

function getAllCards() {
    return libraries.flatMap((library) => library.cards);
}

function isImageUsed(imageId) {
    return getAllCards().some((card) => card.imageId === imageId);
}

async function clearImages() {
    const db = await getDb();
    const transaction = db.transaction(IMAGE_STORE, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(IMAGE_STORE).clear();
    await done;
}

function createImageId() {
    return createId("img");
}

