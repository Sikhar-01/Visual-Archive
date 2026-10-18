let draggedImageCardId = "";
let toastTimer = 0;

cardCount.textContent = "Loading...";
init();

addLibraryBtn.addEventListener("click", () => {
    createLibraryFromPrompt();
});

librarySearchInput.addEventListener("input", renderLibraryHome);

backToLibrariesBtn.addEventListener("click", () => {
    closeEditor();
    activeLibraryId = "";
    cards = [];
    saveActiveLibraryId();
    showLibraryHome();
});

addCardBtn.addEventListener("click", () => {
    if (!getActiveLibrary()) return;

    const card = createCard();
    cards.unshift(card);
    saveCards();
    render();
    openEditor(card.id);
});

searchInput.addEventListener("input", render);

slotCountInput.addEventListener("change", () => {
    applyRequestedSlotCount(slotCountInput.value);
});

slotCountInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        applyRequestedSlotCount(slotCountInput.value);
        slotCountInput.blur();
    }
});

container.addEventListener("dragover", (event) => {
    if (!draggedCardId || draggedImageCardId || isFileDrag(event) || event.target.closest(".card")) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDropIndicators();
    container.classList.add("drag-append");
});

container.addEventListener("dragleave", (event) => {
    if (container.contains(event.relatedTarget)) return;
    container.classList.remove("drag-append");
});

container.addEventListener("drop", (event) => {
    if (!draggedCardId || draggedImageCardId || isFileDrag(event) || event.target.closest(".card")) return;

    event.preventDefault();
    moveCardToEnd(draggedCardId);
    clearDragState();
});

exportBtn.addEventListener("click", () => {
    exportLibrary().catch(() => {
        showToast("Export failed.");
    });
});

importBtn.addEventListener("click", () => {
    if (!isBoardAbsolutelyEmpty()) {
        const proceed = window.confirm("Save your current library before importing a different one.");
        if (!proceed) return;
    }

    importInput.click();
});

importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const imported = JSON.parse(text);
        const nextCards = await buildImportedCards(imported);

        if (!nextCards.length) {
            showToast("That backup did not include any cards.");
            return;
        }

        cards = nextCards;
        saveCards();
        await refreshImageUrls();
        await deleteUnusedImages();
        render();
        showToast("Library imported.");
    } catch (error) {
        showToast("Import failed. Use a valid JSON backup.");
    } finally {
        importInput.value = "";
    }
});

clearBtn.addEventListener("click", async () => {
    if (!cards.length) return;

    const shouldClear = window.confirm("Delete all cards from this browser?");
    if (!shouldClear) return;

    cards = [];
    saveCards();
    await deleteUnusedImages();
    revokeAllImageUrls();
    render();
    showToast("Library cleared.");
});

cardImageInput.addEventListener("change", async () => {
    const file = cardImageInput.files[0];
    if (!file) return;

    try {
        validateImageFile(file);

        if (imageTargetCardId) {
            await setCardImageFromFile(imageTargetCardId, file);
            showToast("Image added.");
        } else if (editingCardId) {
            setPendingImageFile(file);
            updateEditorImagePicker();
        }
    } catch (error) {
        showToast(error.message);
    } finally {
        imageTargetCardId = null;
        cardImageInput.value = "";
    }
});

editorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editingCardId) return;

    try {
        const card = cards.find((item) => item.id === editingCardId);
        if (!card) return;

        const previousImageId = card.imageId;
        let nextImageId = pendingImageId;

        if (pendingImageBlob) {
            nextImageId = createImageId();
            await saveImageBlob(nextImageId, pendingImageBlob);
            imageUrls.set(nextImageId, pendingImageUrl);
            pendingImageBlob = null;
        }

        updateCard(editingCardId, {
            title: titleInput.value.trim() || "Untitled",
            link: cleanLink(linkInput.value.trim()),
            imageId: nextImageId
        });

        await deleteImageIfUnused(previousImageId);
        closeEditor();
        showToast("Card saved.");
    } catch (error) {
        showToast("Could not save that card.");
    }
});

closeEditorBtn.addEventListener("click", closeEditor);

editor.addEventListener("click", (event) => {
    if (event.target === editor) {
        closeEditor();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && editor.classList.contains("show")) {
        closeEditor();
    }

    if (event.key === "Escape") {
        closeLibraryMenus();
    }
});

document.addEventListener("click", () => {
    closeLibraryMenus();
});

editorImagePicker.addEventListener("click", () => {
    imageTargetCardId = null;
    cardImageInput.click();
});

editorImagePicker.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        imageTargetCardId = null;
        cardImageInput.click();
    }
});

editorImagePicker.addEventListener("dragover", (event) => {
    event.preventDefault();
});

editorImagePicker.addEventListener("drop", async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    try {
        validateImageFile(file);
        setPendingImageFile(file);
        updateEditorImagePicker();
    } catch (error) {
        showToast(error.message);
    }
});

removeImageBtn.addEventListener("click", () => {
    clearPendingImage();
    updateEditorImagePicker();
});

