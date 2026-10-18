"use client";

import { useState } from "react";
import { cardHasUserData, type Library } from "@/lib/model";

type LibraryCardProps = {
  library: Library;
  onOpen: () => void;
  onPrefetch: () => void;
  onRename: () => void;
  onDelete: () => void;
  draggable: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: (targetId: string, after: boolean) => void;
};

export default function LibraryCard({ library, onOpen, onPrefetch, onRename, onDelete, draggable, isDragging, isDropTarget, onDragStart, onDragEnd, onDragOver, onDrop }: LibraryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const filled = library.cards.filter(cardHasUserData).length;

  return (
    <article
      className={`library-card${isDragging ? " is-dragging" : ""}${isDropTarget ? " is-drop-target" : ""}`}
      tabIndex={0}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-library-item", library.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-library-item")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          onDragOver();
        }
      }}
      onDrop={(event) => {
        const dragged = event.dataTransfer.getData("application/x-library-item");
        if (!dragged) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        onDrop(library.id, event.clientX > rect.left + rect.width / 2);
      }}
      onClick={onOpen}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="library-menu-wrap" draggable={false} onClick={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()}>
        <button
          className="tool-btn"
          type="button"
          title="Library options"
          aria-label="Library options"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          ···
        </button>
        {menuOpen && (
          <div className="library-menu show">
            <button type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); onRename(); }}>Rename</button>
            <button className="danger" type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); onDelete(); }}>Remove</button>
          </div>
        )}
      </div>
      <div className="library-card-heading">
        <div className="library-card-label"><span className="library-card-mark" aria-hidden="true">▤</span> Collection</div>
        <div className="library-card-affordances">
          <span className="library-card-drag-handle" aria-label="Drag to reorder libraries" title="Drag to reorder">⠿</span>
          <span className="library-card-arrow" aria-hidden="true">↗</span>
        </div>
      </div>
      <h2>{library.name}</h2>
      <div className="library-card-footer">
        <div className="library-meta">
          <span className="library-pill">{library.cards.length} {library.cards.length === 1 ? "card" : "cards"}</span>
          <span className="library-pill">{filled} filled</span>
        </div>
        <div className="library-matches">
          <span className={`library-status-dot${filled ? " has-content" : ""}`} aria-hidden="true" />
          {!library.cards.length ? "No cards yet" : filled ? `${filled} saved ${filled === 1 ? "card" : "cards"}` : "Empty board"}
        </div>
      </div>
    </article>
  );
}
