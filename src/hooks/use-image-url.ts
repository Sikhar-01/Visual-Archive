import { useEffect, useState } from "react";
import { getImage } from "@/lib/storage";

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
