"use client";

import type { Card } from "@/lib/model";
import { useEffect, useRef, useState } from "react";
import { observeImageWhenNear, useImageUrl } from "@/hooks/use-image-url";

type VisualCardProps = {
  card: Card;
  onEdit: () => void;
  onDelete: () => void;
  onImage: () => void;
  onDropImage: (file: File) => void;
  onReorder: (targetId: string, after: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export default function VisualCard({ card, onEdit, onDelete, onImage, onDropImage, onReorder, onDragStart, onDragEnd }: VisualCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  const imageUrl = useImageUrl(card.imageId, shouldLoadImage);
  useEffect(() => {
    if (!card.imageId || shouldLoadImage || !cardRef.current) return;
    return observeImageWhenNear(cardRef.current, () => setShouldLoadImage(true));
  }, [card.imageId, shouldLoadImage]);
  let linkLabel = "Add a link in edit";
  if (card.link) {
    try { linkLabel = new URL(card.link).hostname.replace(/^www\./, ""); }
    catch { linkLabel = card.link; }
  }

  return (
    <article
      ref={cardRef}
      className="card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-library-card")) event.preventDefault();
      }}
      onDrop={(event) => {
        const dragged = event.dataTransfer.getData("application/x-library-card");
        if (dragged) {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          onReorder(card.id, event.clientX > rect.left + rect.width / 2);
        } else if (event.dataTransfer.files[0]) {
          event.preventDefault();
          onDropImage(event.dataTransfer.files[0]);
        }
      }}
    >
      <span className="card-drag-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
      <div className={`media ${imageUrl ? "has-image" : "media-empty"}`} onClick={() => !imageUrl && onImage()}>
        {imageUrl ? (
          <a href={card.link || undefined} target={card.link ? "_blank" : undefined} rel="noreferrer" onClick={(event) => { if (!card.link) event.preventDefault(); }}>
            <img src={imageUrl} alt={card.title} loading="lazy" decoding="async" />
          </a>
        ) : card.imageId ? (
          <div className="media-loading" aria-label="Loading image" />
        ) : (
          <button type="button" className="drop-area" onClick={onImage}>
            <span className="drop-icon">+</span>
            <strong>Add image</strong>
            <small>Choose or drop an image</small>
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="title-row"><div className="title">{card.title || "Untitled"}</div></div>
        {card.link ? (
          <a className="card-link" href={card.link} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} title={card.link}>
            <span aria-hidden="true">↗</span>{linkLabel}
          </a>
        ) : <span className="card-link is-empty"><span aria-hidden="true">↗</span>{linkLabel}</span>}
      </div>
      <div className="card-tools">
        <button className="tool-btn" type="button" title="Edit" aria-label="Edit" onClick={onEdit}>✎</button>
        <button className="tool-btn danger" type="button" title="Delete" aria-label="Delete" onClick={onDelete}>×</button>
      </div>
    </article>
  );
}
