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
  const issues = [];
  const constraint = format?.manufacturing?.tubeInnerSpan;

  if (constraint) {
    const innerSpan = calculateTubeInnerSpanMm(format, values);
    const minimum = Number(constraint.minimumMm || 0);

    if (innerSpan !== null && innerSpan + 0.0001 < minimum) {
      issues.push(
        `A combinação entre tamanho e parede deixa menos de ${minimum} mm para o encaixe interno. Aumente o menor tamanho ou reduza a parede do tubo.`
      );
    }
  }

  const screw = format?.manufacturing?.screwClearance;
  if (screw && Boolean(values?.parafuso)) {
    const diameter = Number(values[screw.screwDiameterKey]);
    const minimumWall = Number(screw.minimumWallMm || 0);
    const minimumSize = diameter + minimumWall * 2;
    const sizes = screw.sizeKeys.map((key) => Number(values[key]));
    const baseHeight = Number(values[screw.baseHeightKey]);

    if (Number.isFinite(diameter) && sizes.some((size) => Number.isFinite(size) && size + 0.0001 < minimumSize)) {
      issues.push(
        `A base precisa ter ao menos ${minimumSize.toFixed(1).replace(".0", "")} mm para manter ${minimumWall} mm de material ao redor do furo.`
      );
    }
    if (Number.isFinite(baseHeight) && baseHeight + 0.0001 < Number(screw.minimumBaseHeightMm || 0)) {
      issues.push(`A fixacao por parafuso exige base com ao menos ${screw.minimumBaseHeightMm} mm de altura.`);
    }
  }

  return issues;
}

export function isManufacturableConfiguration(format, values = {}) {
  return validateManufacturingConstraints(format, values).length === 0;
}
