import type { PointerState } from "../../../core/src/types.js";

export function PointerLayer({ pointer }: { pointer: PointerState }) {
  return (
    <div
      style={{
        position: "absolute",
        left: pointer.x,
        top: pointer.y,
        width: 17,
        height: 24,
        clipPath: "polygon(0 0, 0 100%, 31% 73%, 48% 100%, 63% 92%, 47% 64%, 100% 64%)",
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.72)",
        boxShadow: "0 8px 16px rgba(15,23,42,0.26)",
        transform: "translate(-2px, -2px)",
        pointerEvents: "none",
        zIndex: 2000
      }}
    />
  );
}
