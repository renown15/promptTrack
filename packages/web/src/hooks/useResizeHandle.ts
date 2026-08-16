import { useState } from "react";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function useResizeHandle(
  storageKey: string,
  initial: number,
  min: number,
  max: number,
  axis: "x" | "y",
  invert = false
) {
  const [size, setSize] = useState(() => {
    const s = localStorage.getItem(storageKey);
    return s ? clamp(parseInt(s, 10), min, max) : initial;
  });

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const start = axis === "y" ? e.clientY : e.clientX;
    const startSize = size;
    document.body.style.userSelect = "none";
    document.body.style.cursor = axis === "y" ? "row-resize" : "col-resize";

    function onMove(ev: MouseEvent) {
      const delta = (axis === "y" ? ev.clientY : ev.clientX) - start;
      setSize(clamp(startSize + (invert ? -delta : delta), min, max));
    }
    function onUp() {
      localStorage.setItem(storageKey, String(size));
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return { size, onMouseDown };
}
