import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import { useEffect, useMemo } from "react";
import type { RenderModel } from "../../../core/src/types.js";

type FloatingContextMenuProps = {
  contextMenu: NonNullable<RenderModel["contextMenu"]>;
  viewport: RenderModel["viewport"];
};

const VIEWPORT_PADDING = 12;
const MENU_OFFSET = 6;

export function FloatingContextMenu({ contextMenu, viewport }: FloatingContextMenuProps) {
  const preferredWidth = Math.max(contextMenu.bounds.width, 180);
  const reference = useMemo(
    () => ({
      getBoundingClientRect() {
        const { x, y } = contextMenu.position;
        return {
          x,
          y,
          left: x,
          top: y,
          right: x,
          bottom: y,
          width: 0,
          height: 0
        };
      }
    }),
    [contextMenu.position.x, contextMenu.position.y]
  );

  const { refs, floatingStyles } = useFloating({
    open: true,
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(MENU_OFFSET),
      flip({
        padding: VIEWPORT_PADDING
      }),
      shift({
        padding: VIEWPORT_PADDING
      }),
      size({
        padding: VIEWPORT_PADDING,
        apply({ availableHeight, availableWidth, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(availableHeight, 120)}px`,
            maxWidth: `${Math.max(availableWidth, 180)}px`
          });
        }
      })
    ]
  });

  useEffect(() => {
    refs.setReference(reference);
  }, [reference, refs]);

  return (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        width: Math.min(preferredWidth, viewport.width - VIEWPORT_PADDING * 2),
        minWidth: 180,
        background: "rgba(46, 42, 58, 0.96)",
        backdropFilter: "blur(24px)",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
        padding: "6px 0",
        zIndex: 2000,
        pointerEvents: "none",
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box"
      }}
    >
      {contextMenu.items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: "7px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: item.enabled ? "#f0eef4" : "rgba(240,238,244,0.35)",
            fontSize: 13,
            lineHeight: 1.3,
            gap: 16
          }}
        >
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {item.label}
          </span>
          {item.shortcut && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 11,
                opacity: 0.5,
                fontFamily: "monospace"
              }}
            >
              {item.shortcut}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
