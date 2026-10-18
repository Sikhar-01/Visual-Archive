export type Card = {
  id: string;
  title: string;
  link: string;
  imageId: string;
  createdAt: string;
};

export type Library = {
  id: string;
  name: string;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
};

export const INITIAL_CARD_COUNT = 12;
export const LIBRARIES_KEY = "dragDropLibrary.libraries.v1";
export const ACTIVE_LIBRARY_KEY = "dragDropLibrary.activeLibrary.v1";
export const LEGACY_CARDS_KEY = "dragDropLibrary.cards.v2";
export const IMAGE_DB_NAME = "dragDropLibrary.imageStore";
export const IMAGE_STORE_NAME = "images";

export function createId(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

export function createCard(): Card {
  return { id: createId("card"), title: "Untitled", link: "", imageId: "", createdAt: new Date().toISOString() };
}

export function normalizeCard(value: unknown): Card {
  const card = value && typeof value === "object" ? value as Partial<Card> & { image?: unknown } : {};
  return {
    id: typeof card.id === "string" && card.id ? card.id : createId("card"),
    title: typeof card.title === "string" && card.title.trim() ? card.title.trim() : "Untitled",
    link: typeof card.link === "string" ? cleanLink(card.link.trim()) : "",
    imageId: typeof card.imageId === "string" ? card.imageId : "",
    createdAt: typeof card.createdAt === "string" ? card.createdAt : new Date().toISOString(),
  };
}

export function normalizeLibrary(value: unknown): Library {
  const library = value && typeof value === "object" ? value as Partial<Library> : {};
  return {
    id: typeof library.id === "string" && library.id ? library.id : createId("library"),
    name: typeof library.name === "string" && library.name.trim() ? library.name.trim() : "Untitled Library",
    cards: Array.isArray(library.cards) ? library.cards.map(normalizeCard) : [],
    createdAt: typeof library.createdAt === "string" ? library.createdAt : new Date().toISOString(),
    updatedAt: typeof library.updatedAt === "string" ? library.updatedAt : new Date().toISOString(),
  };
}

export function createLibrary(name: string, cards: Card[] = []): Library {
  const now = new Date().toISOString();
  return { id: createId("library"), name, cards, createdAt: now, updatedAt: now };
}

export function cleanLink(value: string): string {
  if (!value || value === "#") return "";
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  return `https://${value}`;
}

export function cardHasUserData(card: Card): boolean {
  return Boolean(card.imageId || card.link || (card.title.trim() && card.title.trim().toLowerCase() !== "untitled"));
}
