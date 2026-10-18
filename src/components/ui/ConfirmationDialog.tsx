"use client";

export type ConfirmationRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
};

type ConfirmationDialogProps = {
  confirmation: ConfirmationRequest | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmationDialog({ confirmation, onClose, onConfirm }: ConfirmationDialogProps) {
  if (!confirmation) return null;

  return (
    <div className="modal-backdrop show" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmationTitle" aria-describedby="confirmationMessage">
        <div className="modal-header">
          <div className="modal-title" id="confirmationTitle">{confirmation.title}</div>
          <button className="button icon" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <div className="modal-body"><p className="confirmation-message" id="confirmationMessage">{confirmation.message}</p></div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>Cancel</button>
          <button className="button danger" type="button" onClick={onConfirm}>{confirmation.confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
