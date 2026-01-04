import { Snapshot } from "./types";

const MAX_PAST = 50;

export type HistoryState = {
  past: Snapshot[];
  present: Snapshot;
  future: Snapshot[];
};

export const cloneSnapshot = (snapshot: Snapshot): Snapshot => ({
  ...snapshot,
  objects: snapshot.objects.map((obj) => ({
    ...obj,
    measurements: { ...obj.measurements },
    measurementLabels: Object.fromEntries(
      Object.entries(obj.measurementLabels).map(([key, value]) => [key, value ? { ...value } : undefined]),
    ) as Snapshot["objects"][number]["measurementLabels"],
    measurementAnchors: Object.fromEntries(
      Object.entries(obj.measurementAnchors).map(([key, value]) => [key, { ...value }]),
    ) as Snapshot["objects"][number]["measurementAnchors"],
  })),
});

export const createHistoryState = (initial: Snapshot): HistoryState => ({
  past: [],
  present: cloneSnapshot(initial),
  future: [],
});

export const replacePresent = (history: HistoryState, nextPresent: Snapshot): HistoryState => ({
  ...history,
  present: cloneSnapshot(nextPresent),
});

export const commitSnapshot = (history: HistoryState, nextPresent: Snapshot): HistoryState => {
  const nextPast = [...history.past, cloneSnapshot(history.present)];
  if (nextPast.length > MAX_PAST) {
    nextPast.shift();
  }
  return {
    past: nextPast,
    present: cloneSnapshot(nextPresent),
    future: [],
  };
};

export const undo = (history: HistoryState): HistoryState => {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  const nextPast = history.past.slice(0, -1);
  const nextFuture = [cloneSnapshot(history.present), ...history.future];
  return {
    past: nextPast,
    present: cloneSnapshot(previous),
    future: nextFuture,
  };
};

export const redo = (history: HistoryState): HistoryState => {
  if (history.future.length === 0) return history;
  const [nextPresent, ...restFuture] = history.future;
  const nextPast = [...history.past, cloneSnapshot(history.present)];
  if (nextPast.length > MAX_PAST) {
    nextPast.shift();
  }
  return {
    past: nextPast,
    present: cloneSnapshot(nextPresent),
    future: restFuture,
  };
};

export const canUndo = (history: HistoryState): boolean => history.past.length > 0;
export const canRedo = (history: HistoryState): boolean => history.future.length > 0;
