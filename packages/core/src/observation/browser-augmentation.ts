import type {
  A11yNode,
  BrowserObservationAugmentation,
  BrowserObservationAugmentationSource,
  Observation,
  Rect
} from "../types.js";

type ObservationInit = Omit<Observation, "browserAugmentations"> & {
  browserAugmentations?: BrowserObservationAugmentation[];
};

function isInside(inner: Rect, outer: Rect) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function getWindowId(nodeId: string) {
  return nodeId.endsWith("-window") ? nodeId.slice(0, -"-window".length) : undefined;
}

function applyAugmentationsToTree(
  tree: A11yNode[],
  augmentationsByWindow: Map<string, BrowserObservationAugmentation[]>
): A11yNode[] {
  const applyToNode = (node: A11yNode): A11yNode => {
    const children = node.children.map(applyToNode);
    const windowId = getWindowId(node.id);
    const augmentations = windowId ? augmentationsByWindow.get(windowId) ?? [] : [];
    if (augmentations.length === 0) {
      return children === node.children ? node : { ...node, children };
    }

    let nextChildren = children;
    for (const augmentation of augmentations) {
      if (augmentation.strategy === "replace-content") {
        nextChildren = [
          ...nextChildren.filter((child) => !isInside(child.bounds, augmentation.contentBounds)),
          ...augmentation.nodes
        ];
      }
    }

    return {
      ...node,
      children: nextChildren
    };
  };

  return tree.map(applyToNode);
}

export function finalizeObservation(observation: Observation): Observation {
  const normalizedObservation = createObservation(observation);
  if (normalizedObservation.browserAugmentations.length === 0) {
    return normalizedObservation;
  }

  const augmentationsByWindow = new Map<string, BrowserObservationAugmentation[]>();
  for (const augmentation of normalizedObservation.browserAugmentations) {
    const existing = augmentationsByWindow.get(augmentation.windowId);
    if (existing) {
      existing.push(augmentation);
      continue;
    }
    augmentationsByWindow.set(augmentation.windowId, [augmentation]);
  }

  return {
    ...normalizedObservation,
    a11yTree: applyAugmentationsToTree(normalizedObservation.a11yTree, augmentationsByWindow)
  };
}

export function createObservation(observation: ObservationInit): Observation {
  return {
    ...observation,
    browserAugmentations: [...(observation.browserAugmentations ?? [])]
  };
}

export function createBrowserContentReplacementAugmentation(args: {
  windowId: string;
  source: BrowserObservationAugmentationSource;
  contentBounds: Rect;
  nodes: A11yNode[];
}): BrowserObservationAugmentation {
  return {
    windowId: args.windowId,
    source: args.source,
    strategy: "replace-content",
    contentBounds: args.contentBounds,
    nodes: [...args.nodes]
  };
}

export function withBrowserAugmentations(
  observation: Observation,
  browserAugmentations: BrowserObservationAugmentation[]
): Observation {
  return finalizeObservation(createObservation({
    ...observation,
    browserAugmentations
  }));
}
