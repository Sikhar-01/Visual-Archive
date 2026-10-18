"use client";

import { useEffect } from "react";
import type { Appearance, BackgroundId } from "@/components/backgrounds/BackgroundLayer";

const COLOR_PRESETS = [
  { name: "Ice", color: "#6b8aff" },
  { name: "Lavender", color: "#9b7bff" },
  { name: "Sky", color: "#43a8df" },
  { name: "Mint", color: "#43b998" },
  { name: "Gold", color: "#d9a949" },
  { name: "Rose", color: "#d66b92" },
];

const BACKGROUND_CHOICES: { id: BackgroundId; name: string; detail: string }[] = [
  { id: "dark-veil", name: "Dark Veil", detail: "Animated shader with cursor response" },
  { id: "waves", name: "Flowing Waves", detail: "Slow moving line work" },
  { id: "spotlight", name: "Cursor Glow", detail: "A soft light follows your pointer" },
  { id: "plain", name: "Plain", detail: "A quiet, still canvas" },
];

type AppearanceDrawerProps = {
  open: boolean;
  appearance: Appearance;
  cardSize: number;
  onCardSizeChange: (size: number) => void;
  onChange: (change: (current: Appearance) => Appearance) => void;
  onReset: () => void;
  onClose: () => void;
  onOpen: () => void;
};

export default function AppearanceDrawer({ open, appearance, cardSize, onCardSizeChange, onChange, onReset, onClose, onOpen }: AppearanceDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      <button className={`settings-trigger ${open ? "is-open" : ""}`} type="button" aria-label={open ? "Close appearance settings" : "Open appearance settings"} onClick={open ? onClose : onOpen}>
        <span aria-hidden="true">◐</span>
        <span>Appearance</span>
      </button>
      {open && (
        <>
          <button className="settings-scrim" type="button" aria-label="Close appearance settings" onClick={onClose} />
          <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="appearanceTitle">
            <header className="settings-drawer-header">
              <div>
                <h2 id="appearanceTitle">Appearance</h2>
                <p>Shape the atmosphere of your library.</p>
              </div>
              <button className="button icon" type="button" aria-label="Close settings" onClick={onClose}>×</button>
            </header>
            <div className="settings-drawer-body">
              <section className="settings-group">
                <div className="settings-group-heading"><span>01</span><h3>Background</h3></div>
                <div className="background-options">
                  {BACKGROUND_CHOICES.map((choice) => (
                    <button key={choice.id} type="button" className={`background-option ${appearance.background === choice.id ? "selected" : ""}`} aria-pressed={appearance.background === choice.id} onClick={() => onChange((current) => ({ ...current, background: choice.id }))}>
                      <span className={`background-swatch background-swatch-${choice.id}`}><i /></span>
                      <span className="background-option-copy"><strong>{choice.name}</strong><small>{choice.detail}</small></span>
                      <span className="option-check" aria-hidden="true">{appearance.background === choice.id ? "✓" : ""}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="settings-group">
                <div className="settings-group-heading"><span>02</span><h3>Accent color</h3></div>
                <div className="color-options">
                  {COLOR_PRESETS.map((preset) => (
                    <button key={preset.name} type="button" className={`color-option ${appearance.accent.toLowerCase() === preset.color ? "selected" : ""}`} style={{ "--swatch-color": preset.color } as React.CSSProperties} aria-label={preset.name} aria-pressed={appearance.accent.toLowerCase() === preset.color} onClick={() => onChange((current) => ({ ...current, accent: preset.color }))}>
                      <span />{preset.name}
                    </button>
                  ))}
                  <label className="custom-color-option">
                    <input type="color" value={appearance.accent} aria-label="Choose a custom accent color" onChange={(event) => onChange((current) => ({ ...current, accent: event.target.value }))} />
                    <span className="custom-color-wheel" aria-hidden="true">＋</span><span>Custom</span>
                  </label>
                </div>
                <div className="color-readout"><span style={{ background: appearance.accent }} />{appearance.accent.toUpperCase()}</div>
              </section>
              <section className="settings-group">
                <div className="settings-group-heading"><span>03</span><h3>Card size</h3></div>
                <div className="card-size-control">
                  <div className="card-size-copy"><span>Default width</span><strong>{cardSize}px</strong></div>
                  <input type="range" min="160" max="360" step="20" value={cardSize} aria-label="Default card width" onChange={(event) => onCardSizeChange(Number(event.target.value))} />
                  <div className="card-size-range-labels"><span>Compact</span><span>Spacious</span></div>
                  <p>Cards wrap to fit your screen. Zooming out lets more cards fit in each row.</p>
                </div>
              </section>
              <p className="appearance-note">Dark Veil is adapted from <a href="https://reactbits.dev/backgrounds/dark-veil" target="_blank" rel="noreferrer">React Bits</a>. Your choices are saved in this browser.</p>
            </div>
            <footer className="settings-drawer-footer">
              <button className="button" type="button" onClick={onReset}>Reset to default</button>
              <button className="button primary" type="button" onClick={onClose}>Done</button>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}
