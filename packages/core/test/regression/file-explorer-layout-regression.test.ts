import { describe, expect, it } from "vitest";
import {
  FILE_EXPLORER_MIN_WINDOW_WIDTH,
  FILE_EXPLORER_STACKED_LIST_MIN_WIDTH,
  getFileExplorerLayout
} from "../../src/apps/file-explorer.js";
import type { Rect } from "../../src/types.js";

describe("file explorer layout regression", () => {
  it("anchors supplemental sidebar sections below places and above the summary card", () => {
    const bounds: Rect = { x: 92, y: 84, width: 720, height: 540 };
    const layout = getFileExplorerLayout(bounds, 3);
    const lastPlaceRect = layout.sidebarItemRects[layout.sidebarItemRects.length - 1];

    expect(layout.sidebarFavoritesHeadingBounds).toBeDefined();
    expect(layout.sidebarSummaryBounds).toBeDefined();
    expect(layout.sidebarFavoritesHeadingBounds!.y).toBeGreaterThanOrEqual(lastPlaceRect.y + lastPlaceRect.height + 18);

    const firstFavoriteRect = layout.sidebarFavoriteItemRects[0];
    expect(firstFavoriteRect.y).toBeGreaterThan(layout.sidebarFavoritesHeadingBounds!.y);

    if (layout.sidebarStorageHeadingBounds && layout.sidebarFavoriteItemRects.length > 0) {
      const lastFavoriteRect = layout.sidebarFavoriteItemRects[layout.sidebarFavoriteItemRects.length - 1];
      expect(layout.sidebarStorageHeadingBounds.y).toBeGreaterThan(lastFavoriteRect.y + lastFavoriteRect.height);
    }

    const lastSupplementalRect =
      layout.sidebarStorageItemRects[layout.sidebarStorageItemRects.length - 1] ??
      layout.sidebarFavoriteItemRects[layout.sidebarFavoriteItemRects.length - 1];
    expect(lastSupplementalRect.y + lastSupplementalRect.height).toBeLessThan(layout.sidebarSummaryBounds!.y);
  });

  it("keeps the file list usable at the file explorer minimum width", () => {
    const bounds: Rect = { x: 92, y: 84, width: FILE_EXPLORER_MIN_WINDOW_WIDTH, height: 430 };
    const layout = getFileExplorerLayout(bounds, 2);

    expect(layout.listBounds.width).toBeGreaterThanOrEqual(FILE_EXPLORER_STACKED_LIST_MIN_WIDTH);
    expect(layout.sidebarFavoritesHeadingBounds).toBeUndefined();
    expect(layout.sidebarSummaryBounds).toBeUndefined();
  });

  it("derives header, viewport, footer, and file rows from one canonical list geometry", () => {
    const bounds: Rect = { x: 92, y: 84, width: 520, height: 430 };
    const layout = getFileExplorerLayout(bounds, 3);

    expect(layout.listHeaderBounds.y).toBe(layout.listBounds.y);
    expect(layout.listHeaderBounds.x).toBe(layout.listBounds.x);
    expect(layout.listHeaderBounds.width).toBe(layout.listBounds.width);

    expect(layout.listViewportBounds.y).toBe(layout.listHeaderBounds.y + layout.listHeaderBounds.height);
    expect(layout.listViewportBounds.x).toBe(layout.listBounds.x);
    expect(layout.listViewportBounds.width).toBe(layout.listBounds.width);

    expect(layout.listFooterBounds.y).toBe(layout.listViewportBounds.y + layout.listViewportBounds.height);
    expect(layout.listFooterBounds.x).toBe(layout.listBounds.x);
    expect(layout.listFooterBounds.width).toBe(layout.listBounds.width);

    expect(layout.fileRowRects[0]).toMatchObject({
      x: layout.listViewportBounds.x,
      y: layout.listViewportBounds.y,
      width: layout.listViewportBounds.width
    });
    expect(layout.fileRowRects[1].y).toBe(layout.fileRowRects[0].y + layout.fileRowRects[0].height);
  });
});
