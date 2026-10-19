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
  onDropImageUrl: (url: string) => void;
  onReorder: (targetId: string, after: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export default function VisualCard({ card, onEdit, onDelete, onImage, onDropImage, onDropImageUrl, onReorder, onDragStart, onDragEnd }: VisualCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  const [isImageDropTarget, setIsImageDropTarget] = useState(false);
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
      className={`card${isImageDropTarget ? " is-image-drop-target" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => { setIsImageDropTarget(false); onDragEnd(); }}
      onDragEnter={(event) => {
        const types = Array.from(event.dataTransfer.types);
        if (types.includes("Files") || types.includes("text/uri-list") || types.includes("text/html")) setIsImageDropTarget(true);
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsImageDropTarget(false);
      }}
      onDragOver={(event) => {
        const types = Array.from(event.dataTransfer.types);
        const hasDroppedFiles = types.includes("Files");
        const isReorderingCard = types.includes("application/x-library-card");
        const hasImageReference = types.includes("text/uri-list") || types.includes("text/html");
        if (hasDroppedFiles || isReorderingCard || hasImageReference) {
          event.preventDefault();
          event.dataTransfer.dropEffect = isReorderingCard ? "move" : "copy";
        }
      }}
      onDrop={(event) => {
        setIsImageDropTarget(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length) {
          event.preventDefault();
          event.stopPropagation();
          onDropImage(files.find((item) => item.type.startsWith("image/")) ?? files[0]);
          return;
        }
        const dragged = event.dataTransfer.getData("application/x-library-card");
        if (dragged) {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          onReorder(card.id, event.clientX > rect.left + rect.width / 2);
          return;
        }
        const uriList = event.dataTransfer.getData("text/uri-list");
        const uri = uriList.split(/\r?\n/).find((line) => line && !line.startsWith("#"));
        const html = event.dataTransfer.getData("text/html");
        const imageSource = uri || (html ? new DOMParser().parseFromString(html, "text/html").querySelector("img")?.getAttribute("src") : null);
        if (imageSource) {
          event.preventDefault();
          event.stopPropagation();
          try { onDropImageUrl(new URL(imageSource, window.location.href).href); } catch { /* Ignore invalid dropped URLs. */ }
        }
      }}
    >
      <span className="card-drag-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
      <div className={`media ${imageUrl ? "has-image" : "media-empty"}`} onClick={() => !imageUrl && onImage()}>
        {imageUrl ? (
          <a
            href={card.link || undefined}
            target={card.link ? "_blank" : undefined}
            rel="noreferrer"
            draggable={false}
            onClick={(event) => { if (!card.link) event.preventDefault(); }}
            onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}
          >
            <img src={imageUrl} alt={card.title} loading="lazy" decoding="async" draggable={false} />
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
