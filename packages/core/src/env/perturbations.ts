import type { EnvState } from "../types.js";
import { createPopup } from "../system/popup-manager.js";
import { clipPoint } from "../system/pointer.js";
import { closeWindow, minimizeAllWindows } from "../system/window-manager.js";

export interface PerturbationOp {
  id: string;
  apply(state: EnvState, params?: Record<string, unknown>): EnvState;
}

const popupInject: PerturbationOp = {
  id: "PopupInject",
  apply(state, params) {
    const next = structuredClone(state);
    next.popups.push(
      createPopup(
        String(params?.id ?? `popup-${next.popups.length + 1}`),
        String(params?.title ?? "Attention required"),
        String(params?.message ?? "A perturbation popup has appeared.")
      )
    );
    next.windows = next.windows.map((window) => ({ ...window, focused: false }));
    return next;
  }
};

const minimizeAll: PerturbationOp = {
  id: "MinimizeAll",
  apply(state) {
    return minimizeAllWindows(state);
  }
};

const randomPointerSpawn: PerturbationOp = {
  id: "RandomPointerSpawn",
  apply(state, params) {
    const x = Number(params?.x ?? state.viewport.width - 80);
    const y = Number(params?.y ?? 90);
    return {
      ...state,
      pointer: {
        ...state.pointer,
        ...clipPoint({ x, y }, state.viewport)
      }
    };
  }
};

const windowClose: PerturbationOp = {
  id: "WindowClose",
  apply(state, params) {
    const windowId =
      String(params?.windowId ?? "") ||
      state.windows.find((window) => window.focused)?.id ||
      state.windows[state.windows.length - 1]?.id;
    if (!windowId) {
      return state;
    }
    return closeWindow(state, windowId);
  }
};

const zOrderShuffle: PerturbationOp = {
  id: "ZOrderShuffle",
  apply(state) {
    const next = structuredClone(state);
    const reversed = [...next.windows].reverse();
    next.windows = reversed.map((window, index) => ({
      ...window,
      zIndex: index + 1,
      focused: index === reversed.length - 1
    }));
    return next;
  }
};

const PERTURBATIONS = [popupInject, minimizeAll, randomPointerSpawn, windowClose, zOrderShuffle];
const PERTURBATION_MAP = new Map(PERTURBATIONS.map((op) => [op.id, op]));

export function listPerturbations() {
  return PERTURBATIONS.map((op) => op.id);
}

export function applyPerturbation(
  state: EnvState,
  opId: string,
  params?: Record<string, unknown>
) {
  const op = PERTURBATION_MAP.get(opId);
  if (!op) {
    throw new Error(`Unknown perturbation: ${opId}`);
  }
  return op.apply(state, params);
}

