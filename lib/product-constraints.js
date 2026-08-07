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
  const screwIssues = [];
  const screw = format?.manufacturing?.screwClearance;

  if (screw) {
    const countersinkDiameter = Number(screw.countersinkDiameterMm || 0);
    const minimumWall = Number(screw.minimumWallMm || 0);
    const minimumSize = countersinkDiameter + minimumWall * 2;
    const sizes = screw.sizeKeys.map((key) => Number(values[key]));

    if (sizes.some((size) => Number.isFinite(size) && size + 0.0001 < minimumSize)) {
      screwIssues.push(
        `A base precisa ter ao menos ${minimumSize} mm para manter ${minimumWall} mm de material ao redor do rebaixo do parafuso.`
      );
    }
  }

  const constraint = format?.manufacturing?.tubeInnerSpan;

  if (!constraint) {
    return screwIssues;
  }

  const innerSpan = calculateTubeInnerSpanMm(format, values);
  const minimum = Number(constraint.minimumMm || 0);

  if (innerSpan === null || innerSpan + 0.0001 >= minimum) {
    return screwIssues;
  }

  return [
    `A combinação entre tamanho e parede deixa menos de ${minimum} mm para o encaixe interno. Aumente o menor tamanho ou reduza a parede do tubo.`
  ];
}

export function isManufacturableConfiguration(format, values = {}) {
  return validateManufacturingConstraints(format, values).length === 0;
}
