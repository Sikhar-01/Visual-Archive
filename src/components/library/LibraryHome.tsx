"use client";

import type { Library } from "@/lib/model";
import LibraryCard from "@/components/library/LibraryCard";
import { useEffect, useState } from "react";

type LibraryHomeProps = {
  libraries: Library[];
  filteredLibraries: Library[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onOpen: (library: Library) => void;
  onPrefetch: (library: Library) => void;
  onRename: (library: Library) => void;
  onDelete: (library: Library) => void;
  draggedLibraryId: string;
  dragOverLibraryId: string;
  canReorder: boolean;
  onLibraryDragStart: (libraryId: string) => void;
  onLibraryDragEnd: () => void;
  onLibraryDragOver: (libraryId: string) => void;
  onLibraryDrop: (targetId: string, after: boolean) => void;
};

export default function LibraryHome({ libraries, filteredLibraries, loading, search, onSearchChange, onCreate, onOpen, onPrefetch, onRename, onDelete, draggedLibraryId, dragOverLibraryId, canReorder, onLibraryDragStart, onLibraryDragEnd, onLibraryDragOver, onLibraryDrop }: LibraryHomeProps) {
  const [howToOpen, setHowToOpen] = useState(false);

  useEffect(() => {
    if (!howToOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHowToOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [howToOpen]);

  return (
    <>
      <header className="library-hero">
        <div className="hero-copy">
          <span className="eyebrow">A SPACE FOR YOUR REFERENCES</span>
          <h1>Libraries<span className="title-period">.</span></h1>
          <p>Gather the images, links, and ideas you want to return to.</p>
        </div>
        <div className="actions">
          <button className="button" onClick={() => setHowToOpen(true)} type="button">How to Use</button>
          <button className="button primary" onClick={onCreate} disabled={loading} type="button"><span aria-hidden="true">+</span> New library</button>
        </div>
      </header>
      {howToOpen && (
        <div className="modal-backdrop show how-to-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHowToOpen(false); }}>
          <section className="modal how-to-modal" role="dialog" aria-modal="true" aria-labelledby="howToTitle">
            <header className="modal-header">
              <div><span className="eyebrow">A QUICK TOUR</span><h2 className="modal-title" id="howToTitle">How to use your archive</h2></div>
              <button className="button icon" type="button" aria-label="Close guide" onClick={() => setHowToOpen(false)}>×</button>
            </header>
            <div className="how-to-content">
              <section><span className="how-to-number">01</span><div><h3>Create a library</h3><p>Choose <strong>New library</strong> to make a collection for a topic, project, or moodboard. Open a library card to start adding references.</p></div></section>
              <section><span className="how-to-number">02</span><div><h3>Add and arrange references</h3><p>Inside a library, choose <strong>Add card</strong> to save a title, link, and image. Edit cards to replace or remove images, and drag cards to reorder them.</p></div></section>
              <section><span className="how-to-number">03</span><div><h3>Find and manage your work</h3><p>Search libraries from this page or search titles and links inside a library. Use Import and Export to move library data between files. Drag library cards to reorder them.</p></div></section>
              <section><span className="how-to-number">04</span><div><h3>Make it yours</h3><p>Open <strong>Appearance</strong> to choose a background, accent color, and default card size. Your preferences and libraries are saved in this browser.</p></div></section>
            </div>
            <footer className="modal-footer"><button className="button primary" type="button" onClick={() => setHowToOpen(false)}>Got it</button></footer>
          </section>
        </div>
      )}
      <section className="library-controls" aria-label="Library controls">
        <label className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search libraries or card names" value={search} onChange={(event) => onSearchChange(event.target.value)} disabled={loading} />
        </label>
        <div className="stat">
          {loading ? "Loading libraries…" : <>{filteredLibraries.length}{filteredLibraries.length !== libraries.length ? ` of ${libraries.length}` : ""} {libraries.length === 1 ? "library" : "libraries"}</>}
        </div>
      </section>
      <section className="library-grid" aria-label="Saved libraries">
        {loading ? Array.from({ length: 3 }, (_, index) => (
          <div className="library-card-skeleton" key={index} aria-hidden="true">
            <span className="skeleton-line short" /><span className="skeleton-line skeleton-title" /><span className="skeleton-line" />
          </div>
        )) : filteredLibraries.map((library) => (
          <LibraryCard
            key={library.id}
            library={library}
            onOpen={() => onOpen(library)}
            onPrefetch={() => onPrefetch(library)}
            onRename={() => onRename(library)}
            onDelete={() => onDelete(library)}
            draggable={canReorder}
            isDragging={draggedLibraryId === library.id}
            isDropTarget={dragOverLibraryId === library.id && draggedLibraryId !== library.id}
            onDragStart={() => onLibraryDragStart(library.id)}
            onDragEnd={onLibraryDragEnd}
            onDragOver={() => onLibraryDragOver(library.id)}
            onDrop={onLibraryDrop}
          />
        ))}
        {!loading && filteredLibraries.length === 0 && <div className="empty-state show">No libraries found.</div>}
      </section>
    </>
  );
}
