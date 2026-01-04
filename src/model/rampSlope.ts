export type RampSlope = {
  gradientDeg: number;
  gradientText: string;
  ratioText: string;
};

const formatRatio = (ratioN: number): string => {
  const nearestInteger = Math.round(ratioN);
  if (Math.abs(ratioN - nearestInteger) < 0.01) {
    return String(nearestInteger);
  }
  return ratioN.toFixed(2);
};

export const computeRampSlope = (lengthMm: number, heightMm: number): RampSlope => {
  if (heightMm <= 0 || lengthMm <= 0) {
    return {
      gradientDeg: 0,
      gradientText: "0.00°",
      ratioText: "-",
    };
  }

  const gradientDeg = (Math.atan(heightMm / lengthMm) * 180) / Math.PI;
  const ratioN = lengthMm / heightMm;

  return {
    gradientDeg,
    gradientText: `${gradientDeg.toFixed(2)}°`,
    ratioText: `1 : ${formatRatio(ratioN)}`,
  };
};
