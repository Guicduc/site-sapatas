export function calculateTubeInnerSpanMm(format, values = {}) {
  const constraint = format?.manufacturing?.tubeInnerSpan;

  if (!constraint) {
    return null;
  }

  const wallRaw = values[constraint.wallThicknessKey];
  if (wallRaw === "" || wallRaw === null || wallRaw === undefined) {
    return null;
  }

  const wallThickness = Number(wallRaw);
  const spans = constraint.sizeKeys.map((key) => {
    const sizeRaw = values[key];
    if (sizeRaw === "" || sizeRaw === null || sizeRaw === undefined) {
      return Number.NaN;
    }
    const size = Number(sizeRaw);
    const offset = Number(constraint.sizeOffsetsMm?.[key] || 0);
    return size + offset - wallThickness * 2;
  });

  if (!Number.isFinite(wallThickness) || spans.some((span) => !Number.isFinite(span))) {
    return null;
  }

  return Math.min(...spans);
}

export function validateManufacturingConstraints(format, values = {}) {
  const constraint = format?.manufacturing?.tubeInnerSpan;

  if (!constraint) {
    return [];
  }

  const innerSpan = calculateTubeInnerSpanMm(format, values);
  const minimum = Number(constraint.minimumMm || 0);

  if (innerSpan === null || innerSpan + 0.0001 >= minimum) {
    return [];
  }

  return [
    `A combinação entre tamanho e parede deixa menos de ${minimum} mm para o encaixe interno. Aumente o menor tamanho ou reduza a parede do tubo.`
  ];
}

export function isManufacturableConfiguration(format, values = {}) {
  return validateManufacturingConstraints(format, values).length === 0;
}
