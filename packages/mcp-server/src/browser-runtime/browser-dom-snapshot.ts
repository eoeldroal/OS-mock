import type { A11yNode, Rect } from "../../../core/src/types.js";
import type { Page } from "playwright";

type RawNode = {
  id: string;
  role: A11yNode["role"];
  name: string;
  text?: string;
  bounds: Rect;
  enabled: boolean;
  focused: boolean;
};

export async function extractBrowserDomSnapshot(
  page: Page,
  windowId: string,
  contentBounds: Rect
): Promise<A11yNode[]> {
  const rawNodes = await page.evaluate(() => {
    const explicitElements = Array.from(document.querySelectorAll<HTMLElement>("[data-a11y-id]"));
    const hasExplicit = explicitElements.length > 0;
    const elements = hasExplicit
      ? explicitElements
      : Array.from(
          document.querySelectorAll<HTMLElement>(
            "button,a,input,textarea,select,[role],li,h1,h2,h3,h4,p"
          )
        );

    const seen = new Set<string>();
    return elements
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const textSource =
          element.dataset.a11yText ??
          element.getAttribute("aria-label") ??
          (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
            ? element.value || element.placeholder || ""
            : element.innerText || element.textContent || "");
        const text = textSource.trim().replace(/\s+/g, " ");
        const enabled =
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-disabled") !== "true";
        const role = hasExplicit
          ? (element.dataset.a11yRole ?? "label")
          : element.tagName === "BUTTON"
            ? "button"
            : element.tagName === "A"
              ? "button"
              : element.tagName === "INPUT" || element.tagName === "TEXTAREA"
                ? "textbox"
                : element.tagName === "LI"
                  ? "listitem"
                  : "label";

        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        ) {
          return null;
        }
        if (!hasExplicit) {
          const looksLikeStyleNoise =
            /[{;}]|^\.[\w-]+|^@media|^https?:\/\/\S+$/i.test(text) ||
            (text.includes(":") && text.length > 120 && !/\s{2,}/.test(text));
          if (!text || text.length > 160 || looksLikeStyleNoise) {
            return null;
          }
          const key = `${role}:${text}:${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
          if (seen.has(key)) {
            return null;
          }
          seen.add(key);
        }
        return {
          id: hasExplicit ? element.dataset.a11yId ?? "" : `node-${index}`,
          role: role as RawNode["role"],
          name: hasExplicit ? element.dataset.a11yName ?? text ?? "node" : text,
          text: text || undefined,
          enabled: hasExplicit ? element.dataset.a11yEnabled !== "false" : enabled,
          focused: hasExplicit ? element.dataset.a11yFocused === "true" : document.activeElement === element,
          bounds: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };
      })
      .filter(Boolean)
      .slice(0, hasExplicit ? 500 : 180);
  });

  const filteredNodes: RawNode[] = [];
  for (const node of rawNodes as Array<RawNode | null>) {
    if (node && node.id && node.bounds.width > 0 && node.bounds.height > 0) {
      filteredNodes.push(node);
    }
  }

  return filteredNodes.map((node) => ({
      id: `${windowId}-hybrid-${node.id}`,
      role: node.role,
      name: node.name,
      text: node.text,
      bounds: {
        x: contentBounds.x + node.bounds.x,
        y: contentBounds.y + node.bounds.y,
        width: node.bounds.width,
        height: node.bounds.height
      },
      visible: true,
      enabled: node.enabled,
      focusable: node.role === "button" || node.role === "listitem" || node.role === "textbox",
      focused: node.focused,
      children: []
    }));
}
