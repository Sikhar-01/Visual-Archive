"use client";

import type { Card, Library } from "@/lib/model";
import VisualCard from "@/components/library/VisualCard";
import type { RefObject } from "react";

type LibraryWorkspaceProps = {
  library: Library;
  cards: Card[];
  search: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  slotValue: number;
  onBack: () => void;
  onAddCard: () => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onSlotValueChange: (value: number) => void;
  onSetCardCount: (value: string) => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
  onChooseImage: (card: Card) => void;
  onDropImage: (card: Card, file: File) => void;
  onDropImageUrl: (card: Card, url: string) => void;
  onReorder: (targetId: string, after: boolean) => void;
  onDragStart: (cardId: string) => void;
  onDragEnd: () => void;
};

export default function LibraryWorkspace({
  library, cards, search, searchInputRef, slotValue, onBack, onAddCard, onImport, onExport, onClear,
  onSearchChange, onSlotValueChange, onSetCardCount, onEditCard, onDeleteCard,
  onChooseImage, onDropImage, onDropImageUrl, onReorder, onDragStart, onDragEnd,
}: LibraryWorkspaceProps) {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="board-title-row">
            <button className="button icon" type="button" title="Back to libraries" onClick={onBack}>←</button>
            <div>
              <span className="eyebrow">YOUR LIBRARY</span>
              <h1>{library.name}<span className="title-period">.</span></h1>
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="button primary" type="button" onClick={onAddCard}>+ Add card</button>
          <button className="button" type="button" onClick={onImport}>Import</button>
          <button className="button" type="button" onClick={onExport}>Export</button>
        </div>
      </header>
      <section className="controls" aria-label="Library controls">
        <label className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input ref={searchInputRef} type="search" placeholder="Search titles or links" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </label>
        <div className="slot-control">
          <label htmlFor="slotCount">Cards</label>
          <input
            id="slotCount"
            type="number"
            min="0"
            step="1"
            value={slotValue}
            onChange={(event) => onSlotValueChange(Number(event.target.value))}
            onBlur={(event) => onSetCardCount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSetCardCount(event.currentTarget.value);
                event.currentTarget.blur();
              }
            }}
          />
        </div>
        <div className="stat">
          {cards.length}{cards.length !== library.cards.length ? ` of ${library.cards.length}` : ""} {library.cards.length === 1 ? "card" : "cards"}
        </div>
        <button className="button danger" type="button" onClick={onClear}>Clear all</button>
      </section>
      <section className="container" aria-label="Saved visual links">
        {cards.map((card) => (
          <div
            key={card.id}
            onDragStart={(event) => {
              onDragStart(card.id);
              event.dataTransfer.setData("application/x-library-card", card.id);
            }}
            onDragEnd={onDragEnd}
          >
            <VisualCard
              card={card}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card)}
              onImage={() => onChooseImage(card)}
              onDropImage={(file) => onDropImage(card, file)}
              onDropImageUrl={(url) => onDropImageUrl(card, url)}
              onReorder={onReorder}
              onDragStart={() => onDragStart(card.id)}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}
        {library.cards.length === 0 && <div className="empty-state show">No cards in this library yet.</div>}
        {library.cards.length > 0 && cards.length === 0 && search.trim() && <div className="empty-state show">No matching cards.</div>}
      </section>
    </>
  );
}
