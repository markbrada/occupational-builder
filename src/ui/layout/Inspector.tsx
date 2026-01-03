import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { ObjectPatch } from "../../model/objectUpdate";
import type { Object2D } from "../../model/types";

type InspectorProps = {
  selected: Object2D | null;
  onUpdateObject: (id: string, patch: ObjectPatch, commitChange?: boolean) => void;
  onRotateSelected: (delta: number) => void;
};

type FieldKey = "lengthMm" | "widthMm" | "heightMm" | "elevationMm" | "rotationDeg";

const fieldConfig: { key: FieldKey; label: string }[] = [
  { key: "lengthMm", label: "Length (mm)" },
  { key: "widthMm", label: "Width (mm)" },
  { key: "heightMm", label: "Height (mm)" },
  { key: "elevationMm", label: "Elevation (mm)" },
  { key: "rotationDeg", label: "Rotate (degrees)" },
];

const sanitiseNumericInput = (value: string): string => value.replace(/[^\d-]/g, "");

const toDisplayValue = (value: number | undefined): string => (Number.isFinite(value) ? String(value) : "");

export default function Inspector({ selected, onUpdateObject, onRotateSelected }: InspectorProps) {
  const [fieldValues, setFieldValues] = useState<Record<FieldKey, string>>({
    lengthMm: "",
    widthMm: "",
    heightMm: "",
    elevationMm: "",
    rotationDeg: "",
  });

  useEffect(() => {
    if (!selected) {
      setFieldValues({ lengthMm: "", widthMm: "", heightMm: "", elevationMm: "", rotationDeg: "" });
      return;
    }
    setFieldValues({
      lengthMm: toDisplayValue(selected.lengthMm),
      widthMm: toDisplayValue(selected.widthMm),
      heightMm: toDisplayValue(selected.heightMm),
      elevationMm: toDisplayValue(selected.elevationMm),
      rotationDeg: toDisplayValue(selected.rotationDeg),
    });
  }, [
    selected?.id,
    selected?.lengthMm,
    selected?.widthMm,
    selected?.heightMm,
    selected?.elevationMm,
    selected?.rotationDeg,
  ]);

  const handleChange = (key: FieldKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = sanitiseNumericInput(event.target.value);
    setFieldValues((current) => ({ ...current, [key]: nextValue }));
  };

  const commitValue = (key: FieldKey) => {
    if (!selected) return;
    const raw = fieldValues[key];
    const parsed = raw === "" ? NaN : parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setFieldValues((current) => ({ ...current, [key]: toDisplayValue(selected[key]) }));
      return;
    }
    const patch: ObjectPatch =
      key === "lengthMm" && selected.kind === "ramp"
        ? { lengthMm: parsed, runMm: parsed }
        : ({ [key]: parsed } as ObjectPatch);
    onUpdateObject(selected.id, patch, true);
  };

  const handleBlur = (key: FieldKey) => () => commitValue(key);

  const handleKeyDown = (key: FieldKey) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitValue(key);
      (event.target as HTMLInputElement).blur();
    }
  };

  const handleQuickRotate = (delta: number) => {
    if (!selected || selected.locked) return;
    onRotateSelected(delta);
  };

  const handleToggleLock = () => {
    if (!selected) return;
    onUpdateObject(selected.id, { locked: !selected.locked }, true);
  };

  const kindLabel = useMemo(() => {
    if (!selected) return "";
    return selected.kind === "ramp" ? "Ramp" : "Box / Landing";
  }, [selected]);

  if (!selected) {
    return (
      <div className="inspector">
        <div className="inspector__title">Inspector</div>
        <div className="inspector__content">No selection</div>
      </div>
    );
  }

  const locked = selected.locked;

  return (
    <div className="inspector">
      <div className="inspector__title">Inspector</div>
      <div className="inspector__objectTitle">{kindLabel}</div>
      <div className="inspector__divider" />
      <div className="inspector__fields">
        {fieldConfig.map(({ key, label }) => (
          <label key={key} className="inspector__field">
            <span className="inspector__label">{label}</span>
            <input
              type="text"
              inputMode="numeric"
              className="inspector__input"
              value={fieldValues[key]}
              onChange={handleChange(key)}
              onBlur={handleBlur(key)}
              onKeyDown={handleKeyDown(key)}
              disabled={locked}
            />
          </label>
        ))}
        <div className="inspector__field inspector__field--stacked">
          <span className="inspector__label">Quick Rotate</span>
          <div className="inspector__quickRotate">
            <button type="button" className="inspector__button" onClick={() => handleQuickRotate(90)} disabled={locked}>
              +90°
            </button>
            <button type="button" className="inspector__button" onClick={() => handleQuickRotate(-90)} disabled={locked}>
              -90°
            </button>
          </div>
        </div>
        <label className="inspector__field">
          <span className="inspector__label">Lock</span>
          <button
            type="button"
            className={`inspector__toggle ${locked ? "is-on" : "is-off"}`}
            onClick={handleToggleLock}
            aria-pressed={locked}
          >
            <span className="inspector__toggleTrack">
              <span className="inspector__toggleThumb" />
            </span>
            <span className="inspector__toggleText">{locked ? "on" : "off"}</span>
          </button>
        </label>
      </div>
      <div className="inspector__section">
        <div className="inspector__sectionHeader">
          <span className="inspector__label">Measurements</span>
        </div>
        <div className="inspector__placeholder">Coming soon</div>
      </div>
    </div>
  );
}
