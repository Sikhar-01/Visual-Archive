"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const DarkVeil = dynamic(() => import("@/components/backgrounds/DarkVeil"), { ssr: false });

export type BackgroundId = "dark-veil" | "waves" | "spotlight" | "plain";
export type Appearance = { background: BackgroundId; accent: string };

export default function BackgroundLayer({ background, accent }: Appearance) {
  useEffect(() => {
    const movePointer = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
    };

    window.addEventListener("pointermove", movePointer, { passive: true });
    return () => window.removeEventListener("pointermove", movePointer);
  }, []);

  return (
    <div className={`background-layer background-${background}`} aria-hidden="true">
      {background === "dark-veil" && (
        <DarkVeil baseColor={accent} speed={0.3} noiseIntensity={0.025} scanlineIntensity={0.12} scanlineFrequency={0.35} warpAmount={0.14} resolutionScale={0.65} />
      )}
      {background === "waves" && <div className="wave-field" style={{ "--background-accent": accent } as React.CSSProperties} />}
      {background === "spotlight" && <div className="spotlight-field" style={{ "--background-accent": accent } as React.CSSProperties} />}
    </div>
  );
}
