"use client";

import type { RefObject, FormEvent, DragEvent } from "react";
import { useImageUrl } from "@/hooks/use-image-url";

type CardEditorDialogProps = {
  title: string;
  link: string;
  imageId: string;
  imageRemoved: boolean;
  pendingImageUrl: string;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onTitleChange: (title: string) => void;
  onLinkChange: (link: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImageFile: (file: File) => void;
  onRemoveImage: () => void;
};

export default function CardEditorDialog({ title, link, imageId, imageRemoved, pendingImageUrl, imageInputRef, onTitleChange, onLinkChange, onClose, onSubmit, onImageFile, onRemoveImage }: CardEditorDialogProps) {
  const savedImageUrl = useImageUrl(imageId);
  const imagePreviewUrl = imageRemoved ? "" : pendingImageUrl || savedImageUrl;
  const canRemoveImage = Boolean(pendingImageUrl || (imageId && !imageRemoved));

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) onImageFile(file);
  }

  return (
    <div className="modal-backdrop show card-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal card-editor-modal" role="dialog" aria-modal="true" aria-labelledby="editorTitle" onSubmit={onSubmit}>
        <button className="button icon card-editor-close" type="button" aria-label="Close editor" onClick={onClose}>×</button>
        <section className="card-editor-image-panel" aria-label="Card image">
          {imagePreviewUrl ? (
            <div className="card-editor-image-frame" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
              <img src={imagePreviewUrl} alt="Card image preview" />
              <div className="card-editor-image-actions">
                <button className="button" type="button" onClick={() => imageInputRef.current?.click()}>Replace image</button>
                <button className="button danger" type="button" onClick={onRemoveImage}>Remove</button>
              </div>
            </div>
          ) : (
            <button className="card-editor-image-empty" type="button" onClick={() => imageInputRef.current?.click()} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
              <span className="card-editor-upload-mark" aria-hidden="true">↑</span>
              <strong>{imageRemoved ? "Choose a replacement image" : "Choose or drop an image"}</strong>
              <small>PNG, JPG, GIF, or WebP</small>
            </button>
          )}
        </section>

        <section className="card-editor-fields">
          <header className="card-editor-heading">
            <span className="eyebrow">REFERENCE DETAILS</span>
            <h2 className="modal-title" id="editorTitle">Edit card</h2>
          </header>
          <div className="card-editor-form-fields">
            <div className="field">
              <label htmlFor="titleInput">Title</label>
              <input id="titleInput" value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Untitled" />
            </div>
            <div className="field">
              <label htmlFor="linkInput">Hyperlink</label>
              <input id="linkInput" type="url" value={link} onChange={(event) => onLinkChange(event.target.value)} placeholder="https://example.com" />
            </div>
          </div>
          <footer className="card-editor-footer">
            <button className="button" type="button" onClick={onRemoveImage} disabled={!canRemoveImage}>Remove image</button>
            <button className="button primary" type="submit">Save reference</button>
          </footer>
        </section>
      </form>
    </div>
  );
}
