import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { ObjectPatch } from "../../model/objectUpdate";
import type { MeasurementKey, Object2D, RampObj } from "../../model/types";
import { computeRampSlope } from "../../model/rampSlope";

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

const measurementConfig: { key: MeasurementKey; label: string; description: string }[] = [
  { key: "L1", label: "L1", description: "Length (Side 1)" },
  { key: "L2", label: "L2", description: "Length (Side 2)" },
  { key: "W1", label: "W1", description: "Width (Side 1)" },
  { key: "W2", label: "W2", description: "Width (Side 2)" },
  { key: "WL", label: "WL", description: "Left Wing Width" },
  { key: "WR", label: "WR", description: "Right Wing Width" },
  { key: "H", label: "H", description: "Height" },
  { key: "E", label: "E", description: "Elevation" },
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
  const [leftWingSize, setLeftWingSize] = useState<string>("");
  const [rightWingSize, setRightWingSize] = useState<string>("");

  useEffect(() => {
    if (!selected) {
      setFieldValues({ lengthMm: "", widthMm: "", heightMm: "", elevationMm: "", rotationDeg: "" });
      setLeftWingSize("");
      setRightWingSize("");
      return;
    }
    setFieldValues({
      lengthMm: toDisplayValue(selected.lengthMm),
      widthMm: toDisplayValue(selected.widthMm),
      heightMm: toDisplayValue(selected.heightMm),
      elevationMm: toDisplayValue(selected.elevationMm),
      rotationDeg: toDisplayValue(selected.rotationDeg),
    });
    if (selected.kind === "ramp") {
      setLeftWingSize(toDisplayValue(selected.leftWingSizeMm));
      setRightWingSize(toDisplayValue(selected.rightWingSizeMm));
    } else {
      setLeftWingSize("");
      setRightWingSize("");
    }
  }, [
    selected?.id,
    selected?.lengthMm,
    selected?.widthMm,
    selected?.heightMm,
    selected?.elevationMm,
    selected?.rotationDeg,
    selected && selected.kind === "ramp" ? selected.leftWingSizeMm : null,
    selected && selected.kind === "ramp" ? selected.rightWingSizeMm : null,
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

  const handleToggleMeasurement = (key: MeasurementKey) => (event: ChangeEvent<HTMLInputElement>) => {
    if (!selected || selected.locked) return;
    const nextValue = event.target.checked;
    onUpdateObject(selected.id, { measurements: { [key]: nextValue } } as ObjectPatch, true);
  };

  const handleToggleArrow = () => {
    if (!selected || selected.kind !== "ramp" || selected.locked) return;
    onUpdateObject(selected.id, { showArrow: !selected.showArrow }, true);
  };

  const handleWingToggle = (key: "hasLeftWing" | "hasRightWing") => () => {
    if (!selected || selected.kind !== "ramp") return;
    const current = selected[key];
    const patch: Partial<RampObj> =
      key === "hasLeftWing"
        ? { hasLeftWing: !current, leftWingSizeMm: !current ? selected.leftWingSizeMm : 0 }
        : { hasRightWing: !current, rightWingSizeMm: !current ? selected.rightWingSizeMm : 0 };
    onUpdateObject(selected.id, patch, true);
  };

  const commitWingSize = (key: "leftWingSizeMm" | "rightWingSizeMm", raw: string) => {
    if (!selected || selected.kind !== "ramp") return;
    const parsed = raw === "" ? NaN : parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      const fallback = key === "leftWingSizeMm" ? selected.leftWingSizeMm : selected.rightWingSizeMm;
      const setter = key === "leftWingSizeMm" ? setLeftWingSize : setRightWingSize;
      setter(toDisplayValue(fallback));
      return;
    }
    onUpdateObject(selected.id, { [key]: parsed } as ObjectPatch, true);
  };

  const handleWingSizeChange = (key: "leftWingSizeMm" | "rightWingSizeMm") => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = sanitiseNumericInput(event.target.value);
    const setter = key === "leftWingSizeMm" ? setLeftWingSize : setRightWingSize;
    setter(nextValue);
  };

  const handleWingSizeBlur = (key: "leftWingSizeMm" | "rightWingSizeMm") => () => {
    const value = key === "leftWingSizeMm" ? leftWingSize : rightWingSize;
    commitWingSize(key, value);
  };

  const handleWingSizeKeyDown = (key: "leftWingSizeMm" | "rightWingSizeMm") => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const value = key === "leftWingSizeMm" ? leftWingSize : rightWingSize;
      commitWingSize(key, value);
      (event.target as HTMLInputElement).blur();
    }
  };

  const kindLabel = useMemo(() => {
    if (!selected) return "";
    return selected.kind === "ramp" ? "Ramp" : "Box / Landing";
  }, [selected]);

  const rampSlope = useMemo(() => {
    if (!selected || selected.kind !== "ramp") return null;
    return computeRampSlope(selected.lengthMm, selected.heightMm);
  }, [selected?.kind, selected?.lengthMm, selected?.heightMm]);

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
        {selected.kind === "ramp" && rampSlope && (
          <div className="inspector__section inspector__section--rampMeta">
            <label className="inspector__field">
              <span className="inspector__label">Arrow</span>
              <button
                type="button"
                className={`inspector__toggle ${selected.showArrow ? "is-on" : "is-off"}`}
                onClick={handleToggleArrow}
                aria-pressed={selected.showArrow}
                disabled={locked}
              >
                <span className="inspector__toggleTrack">
                  <span className="inspector__toggleThumb" />
                </span>
                <span className="inspector__toggleText">{selected.showArrow ? "on" : "off"}</span>
              </button>
            </label>
            <div className="inspector__field">
              <span className="inspector__label">Gradient</span>
              <span className="inspector__value inspector__value--disabled">{rampSlope.gradientText}</span>
            </div>
            <div className="inspector__field">
              <span className="inspector__label">Ratio</span>
              <span className="inspector__value inspector__value--disabled">{rampSlope.ratioText}</span>
            </div>
          </div>
        )}
      </div>
      <div className="inspector__section">
        <div className="inspector__sectionHeader">
          <span className="inspector__label">Measurements</span>
        </div>
        <div className="inspector__checkboxGrid">
          {measurementConfig.map(({ key, label, description }) => {
            const disabled = locked;
            return (
              <label key={key} className={`inspector__checkboxRow ${disabled ? "is-disabled" : ""}`}>
                <input
                  type="checkbox"
                  className="inspector__checkbox"
                  checked={Boolean(selected.measurements?.[key])}
                  onChange={handleToggleMeasurement(key)}
                  disabled={disabled}
                />
                <div className="inspector__checkboxContent">
                  <span className="inspector__checkboxLabel">{label}</span>
                  <span className="inspector__checkboxDescription">{description}</span>
                </div>
              </label>
            );
          })}
        </div>
        {selected.elevationMm === 0 && (
          <div className="inspector__helperText">Elevation dimension appears only when Elevation &gt; 0.</div>
        )}
      </div>
      {selected.kind === "ramp" && (
        <div className="inspector__section inspector__section--ramp">
          <div className="inspector__sectionHeader">
            <span className="inspector__label">Ramp Wings</span>
          </div>
          <div className="inspector__helperText">
            Wing = side extension that widens the ramp footprint on that side. Wing Size adds extra width (mm) in plan.
          </div>
          <label className="inspector__field">
            <span className="inspector__label">Has Left Wing</span>
            <button
              type="button"
              className={`inspector__toggle ${selected.hasLeftWing ? "is-on" : "is-off"}`}
              onClick={handleWingToggle("hasLeftWing")}
              aria-pressed={selected.hasLeftWing}
              disabled={locked}
            >
              <span className="inspector__toggleTrack">
                <span className="inspector__toggleThumb" />
              </span>
              <span className="inspector__toggleText">{selected.hasLeftWing ? "on" : "off"}</span>
            </button>
          </label>
          {selected.hasLeftWing && (
            <label className="inspector__field">
              <span className="inspector__label">Left Wing Size (mm)</span>
              <input
                type="text"
                inputMode="numeric"
                className="inspector__input"
                value={leftWingSize}
                onChange={handleWingSizeChange("leftWingSizeMm")}
                onBlur={handleWingSizeBlur("leftWingSizeMm")}
                onKeyDown={handleWingSizeKeyDown("leftWingSizeMm")}
                disabled={locked}
              />
            </label>
          )}
          <label className="inspector__field">
            <span className="inspector__label">Has Right Wing</span>
            <button
              type="button"
              className={`inspector__toggle ${selected.hasRightWing ? "is-on" : "is-off"}`}
              onClick={handleWingToggle("hasRightWing")}
              aria-pressed={selected.hasRightWing}
              disabled={locked}
            >
              <span className="inspector__toggleTrack">
                <span className="inspector__toggleThumb" />
              </span>
              <span className="inspector__toggleText">{selected.hasRightWing ? "on" : "off"}</span>
            </button>
          </label>
          {selected.hasRightWing && (
            <label className="inspector__field">
              <span className="inspector__label">Right Wing Size (mm)</span>
              <input
                type="text"
                inputMode="numeric"
                className="inspector__input"
                value={rightWingSize}
                onChange={handleWingSizeChange("rightWingSizeMm")}
                onBlur={handleWingSizeBlur("rightWingSizeMm")}
                onKeyDown={handleWingSizeKeyDown("rightWingSizeMm")}
                disabled={locked}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
