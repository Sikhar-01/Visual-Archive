"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cardHasUserData, cleanLink, createCard, createLibrary, INITIAL_CARD_COUNT, type Card, type Library } from "@/lib/model";
import { clearUnusedImages, exportCardsWithImages, importCards, loadActiveLibraryId, loadLibraries, putImage, saveActiveLibraryId, saveLibraries } from "@/lib/storage";
import BackgroundLayer, { type Appearance, type BackgroundId } from "@/components/backgrounds/BackgroundLayer";
import AppearanceDrawer from "@/components/appearance/AppearanceDrawer";
import CardEditorDialog from "@/components/library/CardEditorDialog";
import LibraryNameDialog, { type LibraryDialogMode } from "@/components/library/LibraryNameDialog";
import LibraryHome from "@/components/library/LibraryHome";
import LibraryWorkspace from "@/components/library/LibraryWorkspace";
import ConfirmationDialog, { type ConfirmationRequest } from "@/components/ui/ConfirmationDialog";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

let initialLibrariesPromise: Promise<Library[]> | undefined;
const APPEARANCE_KEY = "dragDropLibrary.appearance.v1";
const LEGACY_CARD_SIZE_KEY = "dragDropLibrary.cardSize.v2";
const LIBRARY_PREFERENCES_KEY = "dragDropLibrary.libraryPreferences.v1";
const HOME_PREFERENCES_ID = "__home__";
const DEFAULT_CARD_SIZE = 240;
const VALID_BACKGROUNDS: BackgroundId[] = ["dark-veil", "waves", "spotlight", "plain"];
const DEFAULT_APPEARANCE: Appearance = { background: "dark-veil", accent: "#6b8aff" };
type LibraryPreferences = { appearance: Appearance; cardSize: number };
type UndoAction = { label: string; preservedLibraries: Library[]; undo: () => void; token: number };
const DEFAULT_LIBRARY_PREFERENCES: LibraryPreferences = { appearance: DEFAULT_APPEARANCE, cardSize: DEFAULT_CARD_SIZE };

export default function Home() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [libraryDialog, setLibraryDialog] = useState<{ mode: LibraryDialogMode; libraryId?: string } | null>(null);
  const [libraryName, setLibraryName] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState("");
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imageTargetId, setImageTargetId] = useState("");
  const [toast, setToast] = useState("");
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const [libraryPreferences, setLibraryPreferences] = useState<Record<string, LibraryPreferences>>({});
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [slotValue, setSlotValue] = useState(0);
  const [draggedId, setDraggedId] = useState("");
  const [draggedLibraryId, setDraggedLibraryId] = useState("");
  const [dragOverLibraryId, setDragOverLibraryId] = useState("");
  const librariesRef = useRef(libraries);
  const undoActionRef = useRef<UndoAction | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  librariesRef.current = libraries;
  const fileInput = useRef<HTMLInputElement>(null);
  const editorImageInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const libraryNameInput = useRef<HTMLInputElement>(null);

  const openAppearance = useCallback(() => setAppearanceOpen(true), []);
  const closeAppearance = useCallback(() => setAppearanceOpen(false), []);
  const preferencesId = activeId || HOME_PREFERENCES_ID;
  const appearance = libraryPreferences[preferencesId]?.appearance ?? DEFAULT_APPEARANCE;
  const cardSize = libraryPreferences[preferencesId]?.cardSize ?? DEFAULT_CARD_SIZE;

  function updateAppearance(change: (current: Appearance) => Appearance) {
    setLibraryPreferences((current) => {
      const preferences = current[preferencesId] ?? DEFAULT_LIBRARY_PREFERENCES;
      return { ...current, [preferencesId]: { ...preferences, appearance: change(preferences.appearance) } };
    });
  }

  function updateCardSize(size: number) {
    setLibraryPreferences((current) => {
      const preferences = current[preferencesId] ?? DEFAULT_LIBRARY_PREFERENCES;
      return { ...current, [preferencesId]: { ...preferences, cardSize: size } };
    });
  }

  function resetAppearance() {
    setLibraryPreferences((current) => ({ ...current, [preferencesId]: DEFAULT_LIBRARY_PREFERENCES }));
  }

  function clearUnusedImagesSafely(nextLibraries: Library[]) {
    const preservedLibraries = undoActionRef.current?.preservedLibraries ?? [];
    return clearUnusedImages([...nextLibraries, ...preservedLibraries]);
  }

  function queueUndo(label: string, preservedLibraries: Library[], undo: () => void) {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const action: UndoAction = { label, preservedLibraries, undo, token: Date.now() + Math.random() };
    undoActionRef.current = action;
    setUndoAction(action);
    undoTimerRef.current = window.setTimeout(() => {
      if (undoActionRef.current?.token !== action.token) return;
      undoActionRef.current = null;
      undoTimerRef.current = null;
      setUndoAction(null);
      void clearUnusedImages(librariesRef.current);
    }, 6000);
  }

  function undoLastAction() {
    const action = undoActionRef.current;
    if (!action) return;
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    undoActionRef.current = null;
    undoTimerRef.current = null;
    setUndoAction(null);
    action.undo();
    setToast("Restored.");
  }

  useEffect(() => {
    let cancelled = false;
    (initialLibrariesPromise ??= loadLibraries()).then((items) => { if (!cancelled) setLibraries(items); }).catch(() => {
      if (!cancelled) setLibraries([createLibrary("Main Library", Array.from({ length: INITIAL_CARD_COUNT }, createCard))]);
    });
    setActiveId(loadActiveLibraryId());
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let preferences: Record<string, LibraryPreferences> = {};
    try {
      const saved = localStorage.getItem(LIBRARY_PREFERENCES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, Partial<LibraryPreferences>>;
        preferences = Object.fromEntries(Object.entries(parsed).map(([id, value]) => {
          const savedAppearance = value?.appearance;
          const validBackground = VALID_BACKGROUNDS.some((background) => background === savedAppearance?.background);
          const appearance: Appearance = {
            background: validBackground ? savedAppearance!.background as BackgroundId : DEFAULT_APPEARANCE.background,
            accent: typeof savedAppearance?.accent === "string" && /^#[\da-f]{6}$/i.test(savedAppearance.accent) ? savedAppearance.accent : DEFAULT_APPEARANCE.accent,
          };
          const savedSize = Number(value?.cardSize);
          return [id, { appearance, cardSize: Number.isFinite(savedSize) && savedSize >= 160 && savedSize <= 360 ? savedSize : DEFAULT_CARD_SIZE }];
        }));
      } else {
        const legacyAppearance = localStorage.getItem(APPEARANCE_KEY);
        const legacySizeValue = localStorage.getItem(LEGACY_CARD_SIZE_KEY);
        const legacySize = Number(legacySizeValue);
        const activeLibraryId = loadActiveLibraryId();
        if (legacyAppearance || legacySizeValue !== null) {
          const parsed = legacyAppearance ? JSON.parse(legacyAppearance) as Partial<Appearance> : {};
          const validBackground = VALID_BACKGROUNDS.some((background) => background === parsed.background);
          const migrated: LibraryPreferences = {
            appearance: {
              background: validBackground ? parsed.background as BackgroundId : DEFAULT_APPEARANCE.background,
              accent: typeof parsed.accent === "string" && /^#[\da-f]{6}$/i.test(parsed.accent) ? parsed.accent : DEFAULT_APPEARANCE.accent,
            },
            cardSize: Number.isFinite(legacySize) && legacySize >= 160 && legacySize <= 360 ? legacySize : DEFAULT_CARD_SIZE,
          };
          preferences[HOME_PREFERENCES_ID] = migrated;
          if (activeLibraryId) preferences[activeLibraryId] = migrated;
        }
      }
    } catch { /* Use default preferences if saved settings are unreadable. */ }
    setLibraryPreferences(preferences);
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", appearance.accent);
    root.style.setProperty("--accent-2", `color-mix(in srgb, ${appearance.accent} 62%, white)`);
    root.style.setProperty("--panel", `color-mix(in srgb, ${appearance.accent} 3%, #0a0a0b)`);
    root.style.setProperty("--panel-strong", `color-mix(in srgb, ${appearance.accent} 6%, #111214)`);
    root.style.setProperty("--line", `color-mix(in srgb, ${appearance.accent} 18%, #26272c)`);
    root.style.setProperty("--pointer-x", `${window.innerWidth * 0.5}px`);
    root.style.setProperty("--pointer-y", `${window.innerHeight * 0.35}px`);
    document.documentElement.style.setProperty("--card-size", `${cardSize}px`);
    if (preferencesReady) localStorage.setItem(LIBRARY_PREFERENCES_KEY, JSON.stringify(libraryPreferences));
  }, [appearance, cardSize, libraryPreferences, preferencesReady]);

  useEffect(() => { saveLibraries(libraries); }, [libraries]);
  useEffect(() => saveActiveLibraryId(activeId), [activeId]);
  useEffect(() => setAppearanceOpen(false), [activeId]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2400); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => () => { if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current); }, []);
  useEffect(() => { if (libraryDialog) libraryNameInput.current?.focus(); }, [libraryDialog]);
  const active = libraries.find((library) => library.id === activeId) ?? null;
  useEffect(() => setSlotValue(active?.cards.length ?? 0), [active?.id, active?.cards.length]);
  const filteredLibraries = useMemo(() => libraries.filter((library) => {
    const query = librarySearch.trim().toLowerCase();
    return !query || library.name.toLowerCase().includes(query) || library.cards.some((card) => `${card.title} ${card.link}`.toLowerCase().includes(query));
  }), [libraries, librarySearch]);
  const filteredCards = useMemo(() => (active?.cards ?? []).filter((card) => !search.trim() || `${card.title} ${card.link}`.toLowerCase().includes(search.trim().toLowerCase())), [active, search]);

  const updateLibrary = useCallback((id: string, change: (library: Library) => Library) => {
    setLibraries((items) => items.map((library) => library.id === id ? change(library) : library));
  }, []);

  function createNewLibrary() {
    setLibraryName(`Library ${libraries.length + 1}`);
    setLibraryDialog({ mode: "create" });
  }
  function renameLibrary(library: Library) {
    setLibraryName(library.name);
    setLibraryDialog({ mode: "rename", libraryId: library.id });
  }
  function saveLibraryName(event: React.FormEvent) {
    event.preventDefault();
    const name = libraryName.trim();
    if (!name || !libraryDialog) return;
    if (libraryDialog.mode === "rename" && libraryDialog.libraryId) {
      updateLibrary(libraryDialog.libraryId, (item) => ({ ...item, name, updatedAt: new Date().toISOString() }));
    } else {
      const library = createLibrary(name, Array.from({ length: INITIAL_CARD_COUNT }, createCard));
      setLibraries((items) => [library, ...items]);
      setActiveId(library.id);
    }
    setLibraryDialog(null);
  }
  function removeLibrary(library: Library) {
    setConfirmation({
      title: "Remove this library?",
      message: `“${library.name}” and its cards will be removed from this browser.`,
      confirmLabel: "Remove library",
      onConfirm: async () => {
        const originalIndex = libraries.findIndex((item) => item.id === library.id);
        const wasActive = activeId === library.id;
        const next = libraries.filter((item) => item.id !== library.id);
        setLibraries(next);
        if (wasActive) setActiveId("");
        queueUndo("Library removed", [library], () => {
          const restored = [...librariesRef.current];
          if (!restored.some((item) => item.id === library.id)) restored.splice(Math.min(originalIndex, restored.length), 0, library);
          setLibraries(restored);
          if (wasActive) setActiveId(library.id);
          void clearUnusedImages(restored);
        });
      },
    });
  }
  function openEditor(card: Card) { setEditingId(card.id); setTitle(card.title); setLink(card.link); setPendingImage(null); setPendingImageUrl(""); setImageRemoved(false); }
  function closeEditor() { if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl); setEditingId(""); setPendingImage(null); setPendingImageUrl(""); setImageRemoved(false); }
  function chooseImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setToast("Please choose an image file."); return; }
    if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    setPendingImage(file); setPendingImageUrl(URL.createObjectURL(file)); setImageRemoved(false);
  }
  async function saveEditor(event: React.FormEvent) {
    event.preventDefault(); if (!active || !editingId) return;
    const card = active.cards.find((item) => item.id === editingId); if (!card) return;
    let imageId = imageRemoved ? "" : card.imageId;
    if (pendingImage) { imageId = `img-${crypto.randomUUID()}`; await putImage(imageId, pendingImage); }
    const nextLibraries = libraries.map((library) => library.id === active.id ? { ...library, updatedAt: new Date().toISOString(), cards: library.cards.map((current) => current.id === editingId ? { ...current, title: title.trim() || "Untitled", link: cleanLink(link.trim()), imageId } : current) } : library);
    setLibraries(nextLibraries);
    if (card.imageId && card.imageId !== imageId) await clearUnusedImagesSafely(nextLibraries);
    closeEditor(); setToast("Card saved.");
  }
  function addCard() { if (!active) return; const card = createCard(); updateLibrary(active.id, (item) => ({ ...item, cards: [card, ...item.cards], updatedAt: new Date().toISOString() })); openEditor(card); }
  function deleteCard(card: Card) {
    if (!active) return;
    setConfirmation({
      title: "Delete this card?",
      message: `“${card.title || "Untitled"}” will be removed from this library.`,
      confirmLabel: "Delete card",
      onConfirm: async () => {
        const libraryId = active.id;
        const originalIndex = active.cards.findIndex((item) => item.id === card.id);
        const next = libraries.map((library) => library.id === libraryId ? { ...library, cards: library.cards.filter((item) => item.id !== card.id) } : library);
        setLibraries(next);
        queueUndo("Card deleted", [{ ...active, cards: [card] }], () => {
          const restored = librariesRef.current.map((library) => {
            if (library.id !== libraryId || library.cards.some((item) => item.id === card.id)) return library;
            const cards = [...library.cards];
            cards.splice(Math.min(originalIndex, cards.length), 0, card);
            return { ...library, cards };
          });
          setLibraries(restored);
          void clearUnusedImages(restored);
        });
      },
    });
  }
  async function addCardImage(card: Card, file?: File) {
    if (!active || !file) return;
    if (!file.type.startsWith("image/")) { setToast("Please choose an image file."); return; }
    const imageId = `img-${crypto.randomUUID()}`; await putImage(imageId, file);
    const nextLibraries = libraries.map((library) => library.id === active.id ? { ...library, cards: library.cards.map((current) => current.id === card.id ? { ...current, imageId } : current) } : library);
    setLibraries(nextLibraries);
    if (card.imageId) await clearUnusedImagesSafely(nextLibraries); setToast("Image added.");
  }
  async function exportLibrary() {
    if (!active) return;
    const blob = await exportCardsWithImages(active); const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${active.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "library"}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click(); URL.revokeObjectURL(url); setToast("Backup exported.");
  }
  async function importLibrary(file?: File) {
    if (!active || !file) return;
    try { const cards = await importCards(file); if (!cards.length) { setToast("That backup did not include any cards."); return; }
      const nextLibraries = libraries.map((library) => library.id === active.id ? { ...library, cards, updatedAt: new Date().toISOString() } : library);
      setLibraries(nextLibraries); await clearUnusedImagesSafely(nextLibraries); setToast("Library imported.");
    } catch { setToast("Import failed. Use a valid JSON backup."); }
  }
  function requestImport() {
    if (!active) return;
    if (!active.cards.some(cardHasUserData)) {
      importInput.current?.click();
      return;
    }
    setConfirmation({
      title: "Replace this library’s cards?",
      message: "Importing a backup replaces the cards currently in this library. Export a backup first if you want to keep them.",
      confirmLabel: "Choose backup",
      onConfirm: () => importInput.current?.click(),
    });
  }
  function clearBoard() {
    if (!active || !active.cards.length) return;
    setConfirmation({
      title: "Clear this library?",
      message: "Every card in this library will be removed from this browser.",
      confirmLabel: "Clear library",
      onConfirm: async () => {
        const libraryId = active.id;
        const cardsToRestore = active.cards;
        const next = libraries.map((library) => library.id === active.id ? { ...library, cards: [] } : library);
        setLibraries(next);
        queueUndo("Library cleared", [active], () => {
          const restored = librariesRef.current.map((library) => {
            if (library.id !== libraryId) return library;
            const currentIds = new Set(library.cards.map((card) => card.id));
            return { ...library, cards: [...cardsToRestore.filter((card) => !currentIds.has(card.id)), ...library.cards] };
          });
          setLibraries(restored);
          void clearUnusedImages(restored);
        });
      },
    });
  }
  function setCardCount(value: string) {
    if (!active) return; const parsed = Number.parseInt(value, 10); if (!Number.isFinite(parsed) || parsed < 0) return;
    const count = Math.min(parsed, 500); const filledCount = active.cards.filter(cardHasUserData).length; const target = Math.max(count, filledCount);
    const cards = [...active.cards];
    while (cards.length < target) cards.push(createCard());
    for (let index = cards.length - 1; cards.length > target && index >= 0; index--) if (!cardHasUserData(cards[index])) cards.splice(index, 1);
    updateLibrary(active.id, (item) => ({ ...item, cards })); if (count < filledCount) setToast("Cards with data were kept.");
  }
  function reorder(targetId: string, after: boolean) {
    if (!active || !draggedId || draggedId === targetId) return;
    const cards = [...active.cards]; const from = cards.findIndex((card) => card.id === draggedId); const to = cards.findIndex((card) => card.id === targetId);
    if (from < 0 || to < 0) return; const [moved] = cards.splice(from, 1); const adjusted = from < to ? to - 1 : to; cards.splice(adjusted + (after ? 1 : 0), 0, moved);
    updateLibrary(active.id, (item) => ({ ...item, cards }));
  }
  function reorderLibraries(targetId: string, after: boolean) {
    if (!draggedLibraryId || draggedLibraryId === targetId) return;
    setLibraries((items) => {
      const from = items.findIndex((item) => item.id === draggedLibraryId);
      if (from < 0 || !items.some((item) => item.id === targetId)) return items;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      const target = next.findIndex((item) => item.id === targetId);
      next.splice(target + (after ? 1 : 0), 0, moved);
      return next;
    });
  }
  const editingCard = active?.cards.find((card) => card.id === editingId);

  return <main className={`app-shell${active ? " workspace-shell" : ""}`}>
    <ServiceWorkerRegistration showButton={!active && !appearanceOpen} />
    <BackgroundLayer {...appearance} />
    <AppearanceDrawer
      open={appearanceOpen}
      appearance={appearance}
      cardSize={cardSize}
      onCardSizeChange={updateCardSize}
      onChange={updateAppearance}
      onReset={resetAppearance}
      onClose={closeAppearance}
      onOpen={openAppearance}
    />
    <ConfirmationDialog
      confirmation={confirmation}
      onClose={() => setConfirmation(null)}
      onConfirm={() => {
        const action = confirmation?.onConfirm;
        setConfirmation(null);
        if (action) void action();
      }}
    />
    {libraryDialog && <LibraryNameDialog mode={libraryDialog.mode} name={libraryName} inputRef={libraryNameInput} onNameChange={setLibraryName} onClose={() => setLibraryDialog(null)} onSubmit={saveLibraryName} />}
    <div className="app-content">
    {!active ? (
      <LibraryHome
        libraries={libraries}
        filteredLibraries={filteredLibraries}
        search={librarySearch}
        onSearchChange={setLibrarySearch}
        onCreate={createNewLibrary}
        onOpen={(library) => setActiveId(library.id)}
        onRename={renameLibrary}
        onDelete={removeLibrary}
        draggedLibraryId={draggedLibraryId}
        dragOverLibraryId={dragOverLibraryId}
        canReorder={!librarySearch.trim()}
        onLibraryDragStart={setDraggedLibraryId}
        onLibraryDragEnd={() => { setDraggedLibraryId(""); setDragOverLibraryId(""); }}
        onLibraryDragOver={setDragOverLibraryId}
        onLibraryDrop={reorderLibraries}
      />
    ) : (
      <LibraryWorkspace
        library={active}
        cards={filteredCards}
        search={search}
        slotValue={slotValue}
        onBack={() => setActiveId("")}
        onAddCard={addCard}
        onImport={requestImport}
        onExport={() => void exportLibrary()}
        onClear={clearBoard}
        onSearchChange={setSearch}
        onSlotValueChange={setSlotValue}
        onSetCardCount={setCardCount}
        onEditCard={openEditor}
        onDeleteCard={deleteCard}
        onChooseImage={(card) => { setImageTargetId(card.id); fileInput.current?.click(); }}
        onDropImage={(card, file) => void addCardImage(card, file)}
        onReorder={reorder}
        onDragStart={setDraggedId}
        onDragEnd={() => setDraggedId("")}
      />
    )}
    </div>
    <input ref={fileInput} className="sr-only" type="file" accept="image/*" onChange={(event) => { const card = active?.cards.find((item) => item.id === imageTargetId); if (card) void addCardImage(card, event.target.files?.[0]); setImageTargetId(""); event.currentTarget.value = ""; }} />
    <input ref={editorImageInput} className="sr-only" type="file" accept="image/*" onChange={(event) => { chooseImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    <input ref={importInput} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { void importLibrary(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    {editingCard && <CardEditorDialog title={title} link={link} imageId={editingCard.imageId} imageRemoved={imageRemoved} pendingImageUrl={pendingImageUrl} imageInputRef={editorImageInput} onTitleChange={setTitle} onLinkChange={setLink} onClose={closeEditor} onSubmit={(event) => void saveEditor(event)} onImageFile={chooseImage} onRemoveImage={() => { if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl); setPendingImage(null); setPendingImageUrl(""); setImageRemoved(true); }} />}
    {(undoAction || toast) && <div className={`toast show${undoAction ? " toast-undo" : ""}`} role="status" aria-live="polite">
      <span>{undoAction?.label ?? toast}</span>
      {undoAction && <button className="toast-undo-button" type="button" onClick={undoLastAction}>Undo</button>}
    </div>}
  </main>;
}



