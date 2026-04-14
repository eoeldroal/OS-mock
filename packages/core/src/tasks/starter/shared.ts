export function pickVariant(seed: number, values: string[]) {
  return values[Math.abs(seed) % values.length];
}

export function explorerBounds() {
  return { x: 92, y: 84, width: 388, height: 446 };
}

export function renameExplorerBounds() {
  return { x: 92, y: 84, width: 452, height: 484 };
}

export function renameBrowserBounds() {
  return { x: 576, y: 96, width: 596, height: 404 };
}

export function noteBoundsLeft() {
  return { x: 432, y: 84, width: 390, height: 470 };
}

export function noteBoundsRight() {
  return { x: 842, y: 84, width: 390, height: 470 };
}

export function noteBoundsCenter() {
  return { x: 452, y: 108, width: 460, height: 500 };
}

export function browserBounds() {
  return { x: 492, y: 84, width: 760, height: 540 };
}

export function terminalBounds() {
  return { x: 458, y: 462, width: 520, height: 250 };
}

export function mailBounds() {
  return { x: 792, y: 84, width: 460, height: 460 };
}
