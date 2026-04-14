import * as ScrollArea from "@radix-ui/react-scroll-area";
import type { CSSProperties, ReactNode } from "react";

type PaneScrollAreaProps = {
  children: ReactNode;
  style?: CSSProperties;
  viewportStyle?: CSSProperties;
  contentStyle?: CSSProperties;
  scrollbarInset?: number;
  type?: "auto" | "always" | "scroll" | "hover";
};

export function PaneScrollArea({
  children,
  style,
  viewportStyle,
  contentStyle,
  scrollbarInset = 6,
  type = "hover"
}: PaneScrollAreaProps) {
  const trackColor = "rgba(148, 163, 184, 0.18)";
  const thumbColor = "rgba(100, 116, 139, 0.48)";

  return (
    <ScrollArea.Root
      type={type}
      scrollHideDelay={500}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        ...style
      }}
    >
      <ScrollArea.Viewport
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "inherit",
          ...viewportStyle
        }}
      >
        <div
          style={{
            minWidth: "100%",
            minHeight: "100%",
            position: "relative",
            ...contentStyle
          }}
        >
          {children}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        style={{
          display: "flex",
          width: 10,
          padding: 2,
          right: scrollbarInset,
          top: scrollbarInset,
          bottom: scrollbarInset,
          position: "absolute",
          zIndex: 1,
          borderRadius: 999,
          background: trackColor
        }}
      >
        <ScrollArea.Thumb
          style={{
            flex: 1,
            borderRadius: 999,
            background: thumbColor,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.34)"
          }}
        />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar
        orientation="horizontal"
        style={{
          display: "flex",
          height: 10,
          padding: 2,
          left: scrollbarInset,
          right: scrollbarInset,
          bottom: scrollbarInset,
          position: "absolute",
          zIndex: 1,
          borderRadius: 999,
          background: trackColor
        }}
      >
        <ScrollArea.Thumb
          style={{
            flex: 1,
            borderRadius: 999,
            background: thumbColor,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.34)"
          }}
        />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner style={{ background: trackColor }} />
    </ScrollArea.Root>
  );
}
