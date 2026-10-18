"use client";

import type { Library } from "@/lib/model";
import LibraryCard from "@/components/library/LibraryCard";

type LibraryHomeProps = {
  libraries: Library[];
  filteredLibraries: Library[];
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onOpen: (library: Library) => void;
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

export default function LibraryHome({ libraries, filteredLibraries, search, onSearchChange, onCreate, onOpen, onRename, onDelete, draggedLibraryId, dragOverLibraryId, canReorder, onLibraryDragStart, onLibraryDragEnd, onLibraryDragOver, onLibraryDrop }: LibraryHomeProps) {
  return (
    <>
      <header className="library-hero">
        <div className="hero-copy">
          <span className="eyebrow">A SPACE FOR YOUR REFERENCES</span>
          <h1>Libraries<span className="title-period">.</span></h1>
          <p>Gather the images, links, and ideas you want to return to.</p>
        </div>
        <div className="actions">
          <button className="button primary" onClick={onCreate} type="button"><span aria-hidden="true">+</span> New library</button>
        </div>
      </header>
      <section className="library-controls" aria-label="Library controls">
        <label className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search libraries or card names" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </label>
        <div className="stat">
          {filteredLibraries.length}{filteredLibraries.length !== libraries.length ? ` of ${libraries.length}` : ""} {libraries.length === 1 ? "library" : "libraries"}
        </div>
      </section>
      <section className="library-grid" aria-label="Saved libraries">
        {filteredLibraries.map((library) => (
          <LibraryCard
            key={library.id}
            library={library}
            onOpen={() => onOpen(library)}
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
        {filteredLibraries.length === 0 && <div className="empty-state show">No libraries found.</div>}
      </section>
    </>
  );
}
