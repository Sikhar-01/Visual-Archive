"use client";

import type { RefObject, FormEvent } from "react";

export type LibraryDialogMode = "create" | "rename";

type LibraryNameDialogProps = {
  mode: LibraryDialogMode;
  name: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function LibraryNameDialog({ mode, name, inputRef, onNameChange, onClose, onSubmit }: LibraryNameDialogProps) {
  return (
    <div className="modal-backdrop show" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal library-modal" role="dialog" aria-modal="true" aria-labelledby="libraryDialogTitle" onSubmit={onSubmit} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{mode === "create" ? "NEW COLLECTION" : "COLLECTION SETTINGS"}</span>
            <div className="modal-title" id="libraryDialogTitle">{mode === "create" ? "Create a library" : "Rename library"}</div>
          </div>
          <button className="button icon" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="library-dialog-copy">{mode === "create" ? "Give your collection a name. You can organize and search its cards later." : "Choose a new name for this library."}</p>
          <div className="field">
            <label htmlFor="libraryNameInput">Library name</label>
            <input ref={inputRef} id="libraryNameInput" value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="e.g. Design references" maxLength={60} required />
          </div>
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>Cancel</button>
          <button className="button primary" type="submit">{mode === "create" ? "Create library" : "Save name"}</button>
        </div>
      </form>
    </div>
  );
}
