async function init() {
    try {
        libraries = await loadLibraries();
        saveLibraries();
        showLibraryHome();
    } catch (error) {
        libraries = [createLibrary("Main Library", loadCards().map(stripTransientCardData))];
        saveLibraries();
        showLibraryHome();
        showToast("Image storage is unavailable in this browser.");
    }
}

function showLibraryHome() {
    boardView.classList.add("hidden");
    libraryView.classList.remove("hidden");
    renderLibraryHome();
}

async function openLibrary(libraryId) {
    const library = libraries.find((item) => item.id === libraryId);
    if (!library) return;

    activeLibraryId = library.id;
    cards = library.cards;
    saveActiveLibraryId();
    await refreshImageUrls();
    updateBoardHeader();
    libraryView.classList.add("hidden");
    boardView.classList.remove("hidden");
    render();
}

function updateBoardHeader() {
    const library = getActiveLibrary();
    const name = library ? library.name : "Drag Drop Library";
    boardTitle.textContent = name;
    boardSubtitle.textContent = "Save visual links, reorder them, and keep a backup when you need one.";
}

function renderLibraryHome() {
    const query = librarySearchInput.value.trim().toLowerCase();
    libraryGrid.querySelectorAll(".library-card").forEach((card) => card.remove());

    let visibleCount = 0;

    libraries.forEach((library) => {
        const searchResult = getLibrarySearchResult(library, query);
        if (!searchResult.matches) return;

        visibleCount += 1;
        libraryGrid.insertBefore(createLibraryElement(library, searchResult), libraryEmptyState);
    });

    libraryEmptyState.classList.toggle("show", visibleCount === 0);
    libraryCount.textContent = formatLibraryCount(visibleCount, libraries.length);
}

function createLibraryElement(library, searchResult) {
    const card = document.createElement("article");
    card.className = "library-card";
    card.tabIndex = 0;

    card.addEventListener("click", () => {
        openLibrary(library.id);
    });

    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLibrary(library.id);
        }
    });

    const menuWrap = document.createElement("div");
    menuWrap.className = "library-menu-wrap";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "tool-btn";
    menuButton.title = "Library options";
    menuButton.setAttribute("aria-label", "Library options");
    menuButton.textContent = "...";

    const menu = document.createElement("div");
    menu.className = "library-menu";

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "Rename";
    renameButton.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.classList.remove("show");
        renameLibrary(library.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Remove";
    deleteButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        menu.classList.remove("show");
        await deleteLibrary(library.id);
    });

    menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeLibraryMenus(menu);
        menu.classList.toggle("show");
    });

    menu.appendChild(renameButton);
    menu.appendChild(deleteButton);
    menuWrap.appendChild(menuButton);
    menuWrap.appendChild(menu);

    const title = document.createElement("h2");
    title.textContent = library.name;

    const meta = document.createElement("div");
    meta.className = "library-meta";

    const totalCards = document.createElement("span");
    totalCards.className = "library-pill";
    totalCards.textContent = `${library.cards.length} ${library.cards.length === 1 ? "card" : "cards"}`;

    const filledCards = document.createElement("span");
    filledCards.className = "library-pill";
    const filledCount = library.cards.filter(cardHasUserData).length;
    filledCards.textContent = `${filledCount} filled`;

    meta.appendChild(totalCards);
    meta.appendChild(filledCards);

    const matches = document.createElement("div");
    matches.className = "library-matches";
    matches.textContent = searchResult.summary;

    card.appendChild(menuWrap);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(matches);

    return card;
}

function createLibraryFromPrompt() {
    const name = window.prompt("Library name", `Library ${libraries.length + 1}`);
    if (name === null) return;

    const trimmedName = name.trim() || `Library ${libraries.length + 1}`;
    const library = createLibrary(trimmedName, Array.from({ length: INITIAL_CARD_COUNT }, createCard));
    libraries.unshift(library);
    saveLibraries();
    renderLibraryHome();
    openLibrary(library.id);
}

function renameLibrary(libraryId) {
    const library = libraries.find((item) => item.id === libraryId);
    if (!library) return;

    const name = window.prompt("Rename library", library.name);
    if (name === null) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    library.name = trimmedName;
    library.updatedAt = new Date().toISOString();
    saveLibraries();
    renderLibraryHome();

    if (library.id === activeLibraryId) {
        updateBoardHeader();
    }
}

async function deleteLibrary(libraryId) {
    const library = libraries.find((item) => item.id === libraryId);
    if (!library) return;

    const shouldDelete = window.confirm(`Remove ${library.name}?`);
    if (!shouldDelete) return;

    libraries = libraries.filter((item) => item.id !== libraryId);

    if (activeLibraryId === libraryId) {
        activeLibraryId = "";
        cards = [];
    }

    saveLibraries();
    saveActiveLibraryId();
    await deleteUnusedImages();
    renderLibraryHome();
    showToast("Library removed.");
}

function closeLibraryMenus(exceptMenu) {
    document.querySelectorAll(".library-menu.show").forEach((menu) => {
        if (menu !== exceptMenu) {
            menu.classList.remove("show");
        }
    });
}

function getLibrarySearchResult(library, query) {
    if (!query) {
        return {
            matches: true,
            summary: getLibrarySummary(library)
        };
    }

    const nameMatches = library.name.toLowerCase().includes(query);
    const matchingCards = library.cards.filter((card) => {
        return [card.title, card.link].join(" ").toLowerCase().includes(query);
    });

    if (!nameMatches && !matchingCards.length) {
        return { matches: false, summary: "" };
    }

    if (matchingCards.length) {
        const names = matchingCards.slice(0, 3).map((card) => card.title || "Untitled").join(", ");
        const extra = matchingCards.length > 3 ? ` +${matchingCards.length - 3} more` : "";
        return {
            matches: true,
            summary: `Matches: ${names}${extra}`
        };
    }

    return {
        matches: true,
        summary: "Library name match"
    };
}

function getLibrarySummary(library) {
    const filled = library.cards.filter(cardHasUserData).length;
    if (!library.cards.length) return "No cards yet";
    if (!filled) return "Empty board";
    return `${filled} saved ${filled === 1 ? "card" : "cards"}`;
}

function createLibrary(name, sourceCards = []) {
    const now = new Date().toISOString();

    return {
        id: createId("library"),
        name,
        cards: sourceCards.map(stripTransientCardData),
        createdAt: now,
        updatedAt: now
    };
}

async function loadLibraries() {
    const stored = localStorage.getItem(LIBRARIES_KEY);

    if (stored !== null) {
        const parsed = JSON.parse(stored);
        const rawLibraries = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.libraries) ? parsed.libraries : [];
        return rawLibraries.map(normalizeLibrary);
    }

    const legacyCards = await migrateLegacyImages(loadCards());
    return [createLibrary("Main Library", legacyCards)];
}

function normalizeLibrary(library) {
    if (!library || typeof library !== "object") {
        library = {};
    }

    return {
        id: typeof library.id === "string" && library.id ? library.id : createId("library"),
        name: typeof library.name === "string" && library.name.trim() ? library.name.trim() : "Untitled Library",
        cards: normalizeStoredCards(library.cards),
        createdAt: typeof library.createdAt === "string" ? library.createdAt : new Date().toISOString(),
        updatedAt: typeof library.updatedAt === "string" ? library.updatedAt : new Date().toISOString()
    };
}

function saveLibraries() {
    localStorage.setItem(LIBRARIES_KEY, JSON.stringify(libraries.map((library) => ({
        ...library,
        cards: library.cards.map(stripTransientCardData)
    }))));
}

function saveActiveLibraryId() {
    if (activeLibraryId) {
        localStorage.setItem(ACTIVE_LIBRARY_KEY, activeLibraryId);
    } else {
        localStorage.removeItem(ACTIVE_LIBRARY_KEY);
    }
}

function getActiveLibrary() {
    return libraries.find((library) => library.id === activeLibraryId) || null;
}

