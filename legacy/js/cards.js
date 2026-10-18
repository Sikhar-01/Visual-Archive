function render() {
    if (!getActiveLibrary()) return;

    const query = searchInput.value.trim().toLowerCase();
    container.querySelectorAll(".card").forEach((card) => card.remove());

    let visibleCount = 0;

    cards.forEach((card) => {
        if (!matchesSearch(card, query)) {
            return;
        }

        visibleCount += 1;
        container.insertBefore(createCardElement(card), emptyState);
    });

    emptyState.classList.toggle("show", visibleCount === 0);
    cardCount.textContent = formatCount(visibleCount, cards.length);

    if (document.activeElement !== slotCountInput) {
        slotCountInput.value = String(cards.length);
    }
}

function createCardElement(card) {
    const cardElement = document.createElement("article");
    cardElement.className = "card";
    cardElement.dataset.id = card.id;

    cardElement.addEventListener("dragover", (event) => {
        if (!draggedCardId || draggedImageCardId || draggedCardId === card.id || isFileDrag(event)) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        container.classList.remove("drag-append");
        setDropIndicator(cardElement, getDropPosition(event, cardElement));
    });

    cardElement.addEventListener("dragleave", (event) => {
        if (cardElement.contains(event.relatedTarget)) return;
        cardElement.classList.remove("drop-before", "drop-after", "drop-horizontal", "drop-vertical");
    });

    cardElement.addEventListener("drop", (event) => {
        if (!draggedCardId || draggedImageCardId || isFileDrag(event)) return;

        event.preventDefault();
        event.stopPropagation();
        reorderCard(draggedCardId, card.id, getDropPosition(event, cardElement));
        clearDragState();
    });

    const media = document.createElement("div");
    media.className = "media";

    const imageUrl = card.imageId ? imageUrls.get(card.imageId) : "";

    if (imageUrl) {
        media.classList.add("has-image");
        const link = document.createElement("a");
        link.href = card.link || "#";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = card.link ? `Open ${card.title}` : "No link set";

        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = card.title || "Library image";
        image.draggable = false;
        link.draggable = false;
        link.appendChild(image);
        media.appendChild(link);
    } else {
        const dropArea = document.createElement("button");
        dropArea.type = "button";
        dropArea.className = "drop-area";
        dropArea.innerHTML = `
            <span class="drop-icon" aria-hidden="true">+</span>
            <strong>Drop Image</strong>
            <small>or click to upload</small>
        `;
        dropArea.addEventListener("click", () => {
            imageTargetCardId = card.id;
            cardImageInput.click();
        });
        media.appendChild(dropArea);
    }

    media.draggable = Boolean(imageUrl);
    media.addEventListener("dragstart", (event) => {
        if (!imageUrl) {
            event.preventDefault();
            return;
        }

        draggedImageCardId = card.id;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", card.id);
    });

    media.addEventListener("dragend", () => {
        clearImageDragState();
        cardElement.classList.remove("drag-over");
    });

    media.addEventListener("dragover", (event) => {
        if (isFileDrag(event)) {
            event.preventDefault();
            event.stopPropagation();
            cardElement.classList.add("drag-over");
            return;
        }

        if (!draggedImageCardId || draggedImageCardId === card.id) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        cardElement.classList.add("drag-over");
    });

    media.addEventListener("dragleave", () => {
        cardElement.classList.remove("drag-over");
    });

    media.addEventListener("drop", async (event) => {
        if (isFileDrag(event)) {
            event.preventDefault();
            event.stopPropagation();
            cardElement.classList.remove("drag-over");
            const file = event.dataTransfer.files[0];
            if (!file) return;

            try {
                validateImageFile(file);
                await setCardImageFromFile(card.id, file);
                showToast("Image added.");
            } catch (error) {
                showToast(error.message);
            } finally {
                clearImageDragState();
            }

            return;
        }

        if (!draggedImageCardId || draggedImageCardId === card.id) return;

        event.preventDefault();
        event.stopPropagation();
        cardElement.classList.remove("drag-over");

        try {
            await applyImageFromCardToCard(draggedImageCardId, card.id);
            showToast("Image applied.");
        } catch (error) {
            showToast("Could not move image.");
        } finally {
            clearImageDragState();
        }
    });

    const body = document.createElement("div");
    body.className = "card-body";
    body.draggable = true;

    body.addEventListener("dragstart", (event) => {
        draggedCardId = card.id;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.id);
        window.requestAnimationFrame(() => {
            cardElement.classList.add("dragging");
        });
    });

    body.addEventListener("dragend", clearDragState);

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = card.title || "Untitled";
    titleRow.appendChild(title);
    body.appendChild(titleRow);

    const tools = document.createElement("div");
    tools.className = "card-tools";
    tools.appendChild(makeToolButton("Edit", "&#9998;", () => openEditor(card.id)));
    tools.appendChild(makeToolButton("Delete", "&times;", () => deleteCard(card.id), "danger"));

    cardElement.appendChild(media);
    cardElement.appendChild(body);
    cardElement.appendChild(tools);

    return cardElement;
}

function makeToolButton(label, icon, action, extraClass = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tool-btn ${extraClass}`.trim();
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
    button.addEventListener("click", action);
    return button;
}

function openEditor(cardId) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;

    editingCardId = card.id;
    pendingImageId = card.imageId || "";
    pendingImageBlob = null;
    pendingImageUrl = pendingImageId ? imageUrls.get(pendingImageId) || "" : "";
    titleInput.value = card.title || "";
    linkInput.value = card.link || "";
    updateEditorImagePicker();
    editor.classList.add("show");
    titleInput.focus();
}

function closeEditor() {
    if (pendingImageBlob && pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
    }

    editor.classList.remove("show");
    editingCardId = null;
    pendingImageId = "";
    pendingImageBlob = null;
    pendingImageUrl = "";
}

function updateEditorImagePicker() {
    if (pendingImageUrl) {
        editorImagePicker.style.background = `linear-gradient(rgba(16, 17, 22, 0.2), rgba(16, 17, 22, 0.72)), url("${pendingImageUrl}") center / cover`;
        editorImagePicker.innerHTML = `
            <div>
                <strong>Image selected</strong>
                <span>Click or drop to replace it</span>
            </div>
        `;
        return;
    }

    editorImagePicker.style.background = "";
    editorImagePicker.innerHTML = `
        <div>
            <strong>Choose or drop an image</strong>
            <span>PNG, JPG, GIF, or WebP</span>
        </div>
    `;
}

function createCard() {
    return {
        id: createId("card"),
        title: "Untitled",
        link: "",
        imageId: "",
        createdAt: new Date().toISOString()
    };
}

function updateCard(cardId, patch) {
    cards = cards.map((card) => {
        if (card.id !== cardId) return card;
        return { ...card, ...patch };
    });
    saveCards();
    render();
}

function reorderCard(sourceCardId, targetCardId, position) {
    if (!sourceCardId || !targetCardId || sourceCardId === targetCardId) return;

    const sourceIndex = cards.findIndex((card) => card.id === sourceCardId);
    const targetIndex = cards.findIndex((card) => card.id === targetCardId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextCards = [...cards];
    const [movedCard] = nextCards.splice(sourceIndex, 1);
    let insertIndex = targetIndex;

    if (sourceIndex < targetIndex) {
        insertIndex -= 1;
    }

    if (position === "after") {
        insertIndex += 1;
    }

    nextCards.splice(insertIndex, 0, movedCard);
    cards = nextCards;
    saveCards();
    render();
}

function moveCardToEnd(cardId) {
    const sourceIndex = cards.findIndex((card) => card.id === cardId);
    if (sourceIndex < 0 || sourceIndex === cards.length - 1) return;

    const nextCards = [...cards];
    const [movedCard] = nextCards.splice(sourceIndex, 1);
    nextCards.push(movedCard);
    cards = nextCards;
    saveCards();
    render();
}

function getDropPosition(event, cardElement) {
    const rect = cardElement.getBoundingClientRect();
    if (getGridColumnCount() <= 1) {
        return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    }

    return event.clientX < rect.left + rect.width / 2 ? "before" : "after";
}

function setDropIndicator(cardElement, position) {
    clearDropIndicators();
    const orientationClass = getGridColumnCount() <= 1 ? "drop-horizontal" : "drop-vertical";
    cardElement.classList.add(position === "before" ? "drop-before" : "drop-after", orientationClass);
}

function clearDropIndicators() {
    container.querySelectorAll(".drop-before, .drop-after, .drop-horizontal, .drop-vertical").forEach((card) => {
        card.classList.remove("drop-before", "drop-after", "drop-horizontal", "drop-vertical");
    });
}

function clearDragState() {
    draggedCardId = "";
    container.classList.remove("drag-append");
    clearDropIndicators();
    container.querySelectorAll(".dragging").forEach((card) => {
        card.classList.remove("dragging");
    });
}

function clearImageDragState() {
    draggedImageCardId = "";
}

function getGridColumnCount() {
    const renderedCards = Array.from(container.querySelectorAll(".card:not(.dragging)"));
    if (renderedCards.length < 2) return 1;

    const firstTop = renderedCards[0].getBoundingClientRect().top;
    return renderedCards.filter((card) => {
        return Math.abs(card.getBoundingClientRect().top - firstTop) < 4;
    }).length;
}

async function deleteCard(cardId) {
    const card = cards.find((item) => item.id === cardId);
    const label = card && card.title ? card.title : "this card";
    const shouldDelete = window.confirm(`Delete ${label}?`);
    if (!shouldDelete) return;

    const previousImageId = card ? card.imageId : "";
    cards = cards.filter((item) => item.id !== cardId);
    saveCards();
    render();
    await deleteImageIfUnused(previousImageId);
    showToast("Card deleted.");
}

function matchesSearch(card, query) {
    if (!query) return true;
    return [card.title, card.link].join(" ").toLowerCase().includes(query);
}

function applyRequestedSlotCount(rawValue) {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        slotCountInput.value = String(cards.length);
        return;
    }

    const targetCount = Math.max(0, Math.min(500, parsed));
    const dataCount = cards.filter(cardHasUserData).length;
    const finalTarget = Math.max(targetCount, dataCount);
    const nextCards = [...cards];

    if (nextCards.length < finalTarget) {
        const toAdd = finalTarget - nextCards.length;
        for (let i = 0; i < toAdd; i += 1) {
            nextCards.push(createCard());
        }
    } else if (nextCards.length > finalTarget) {
        let toRemove = nextCards.length - finalTarget;
        for (let i = nextCards.length - 1; i >= 0 && toRemove > 0; i -= 1) {
            if (!cardHasUserData(nextCards[i])) {
                nextCards.splice(i, 1);
                toRemove -= 1;
            }
        }
    }

    cards = nextCards;
    saveCards();
    render();

    if (targetCount < dataCount) {
        showToast("Cards with data were kept.");
    }
}

function cardHasUserData(card) {
    const title = String(card.title || "").trim().toLowerCase();
    const hasCustomTitle = title && title !== "untitled";
    return Boolean(card.imageId || card.link || hasCustomTitle);
}

function isBoardAbsolutelyEmpty() {
    if (!cards.length) return true;

    return cards.every((card) => {
        const title = String(card.title || "").trim().toLowerCase();
        const hasOnlyDefaultTitle = !title || title === "untitled";
        return hasOnlyDefaultTitle && !card.link && !card.imageId;
    });
}

function isFileDrag(event) {
    return Array.from(event.dataTransfer && event.dataTransfer.types ? event.dataTransfer.types : []).includes("Files");
}

function validateImageFile(file) {
    if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
    }
}

async function applyImageFromCardToCard(sourceCardId, targetCardId) {
    const sourceCard = cards.find((item) => item.id === sourceCardId);
    const targetCard = cards.find((item) => item.id === targetCardId);
    if (!sourceCard || !targetCard || !sourceCard.imageId) return;

    const previousImageId = targetCard.imageId;
    updateCard(targetCardId, { imageId: sourceCard.imageId });
    await deleteImageIfUnused(previousImageId);
}

async function setCardImageFromFile(cardId, file) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;

    const previousImageId = card.imageId;
    const nextImageId = createImageId();
    await saveImageBlob(nextImageId, file);
    imageUrls.set(nextImageId, URL.createObjectURL(file));
    updateCard(cardId, { imageId: nextImageId });
    await deleteImageIfUnused(previousImageId);
}

function setPendingImageFile(file) {
    clearPendingImage();
    pendingImageId = "";
    pendingImageBlob = file;
    pendingImageUrl = URL.createObjectURL(file);
}

function clearPendingImage() {
    if (pendingImageBlob && pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
    }

    pendingImageId = "";
    pendingImageBlob = null;
    pendingImageUrl = "";
}

