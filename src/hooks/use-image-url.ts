import { useEffect, useState } from "react";
import { getImage } from "@/lib/storage";

let imageObserver: IntersectionObserver | null = null;
const observedImageCards = new Map<Element, () => void>();

export function observeImageWhenNear(element: Element, callback: () => void): () => void {
  if (!("IntersectionObserver" in window)) {
    callback();
    return () => {};
  }

  imageObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const loadImage = observedImageCards.get(entry.target);
      observedImageCards.delete(entry.target);
      imageObserver?.unobserve(entry.target);
      loadImage?.();
    }
  }, { rootMargin: "240px" });

  observedImageCards.set(element, callback);
  imageObserver.observe(element);
  return () => {
    observedImageCards.delete(element);
    imageObserver?.unobserve(element);
  };
}

export function useImageUrl(imageId: string, enabled = true): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    if (!imageId || !enabled) {
      setUrl("");
      return;
    }

    getImage(imageId)
      .then((blob) => {
        if (blob && !cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setUrl("");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId, enabled]);

  return url;
}
