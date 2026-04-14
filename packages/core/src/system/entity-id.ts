export type EntityIdState = {
  nextEntityId: number;
};

export function allocateEntityId(state: EntityIdState, prefix = "entity") {
  const id = `${prefix}-${state.nextEntityId}`;
  state.nextEntityId += 1;
  return id;
}
