"use client";

const canvasWidth = 720;
const canvasHeight = 500;
const viewBox = `0 0 ${canvasWidth} ${canvasHeight}`;
const viewLabelX = 62;
const topViewY = 170;
const baseBottomY = 440;

export function ParametricDrawing({ format, values, activeKey, onSelectParameter }) {
  const type = format.drawingType;

  return (
    <div className="drawing-panel">
      <svg viewBox={viewBox} role="img" aria-label={`Vista cotada de ${format.name}`}>
        <defs>
          <pattern id="drawing-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 H 0 V 32" />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <pattern id="section-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M 0 0 V 8" />
          </pattern>
        </defs>
        <rect className="drawing-canvas-fill" width={canvasWidth} height={canvasHeight} />
        <path className="drawing-axis" d="M 82 440 H 652 M 132 44 V 472" />
        <circle className="drawing-node" cx="132" cy="440" r="4" />
        <circle className="drawing-node" cx="652" cy="440" r="4" />
        <circle className="drawing-node" cx="132" cy="44" r="4" />
        {type === "tube-round" && <TubeRound format={format} values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "tube-rect" && <TubeRect format={format} values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "tube-oblong" && <TubeOblong format={format} values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-round" && <BaseRound format={format} values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-oblong" && <BaseOblong format={format} values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-rect" && <BaseRect format={format} values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-u" && <BaseU values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
      </svg>
    </div>
  );
}

function TubeRound({ format, values, activeKey, onSelect }) {
  const baseDiameterValue = Number(values.diametroBase || 28);
  const baseHeightValue = Number(values.alturaBase || 6);
  const neckHeightValue = Number(values.alturaPescoco || 18);
  const wallValue = Number(values.paredeTubo || 1.5);
  const diameter = scaleRangeDimension(baseDiameterValue, {
    maxValue: parameterMax(format, "diametroBase", 150),
    maxSize: 230,
    minSize: 24,
    readableCurve: 40
  });
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckHeight = clamp(neckHeightValue * 2.35, 34, 90);
  const wall = clamp(wallValue * 10, 4, Math.max(4, diameter * 0.22));
  const neckDiameter = Math.max(10, diameter - wall * 2);
  const ribWidth = Math.min(7, Math.max(4, wall * 0.55));
  const tubeInnerRadius = Math.max(5, diameter / 2 - wall);
  const innerDetailRadius = Math.max(3, tubeInnerRadius - 12);
  const topCx = 360;
  const topCy = topViewY;
  const frontCx = 360;
  const baseTopY = baseBottomY - baseHeight;
  const neckTopY = baseTopY - neckHeight;
  const baseLeft = frontCx - diameter / 2;
  const baseRight = frontCx + diameter / 2;
  const neckLeft = frontCx - neckDiameter / 2;
  const neckRight = frontCx + neckDiameter / 2;
  const bottomRadius = Math.min(baseHeight, 14);
  const ribCount = neckHeightValue <= 20 ? 3 : 4;
  const ribGap = neckHeight / (ribCount + 1);
  const basePath = roundedBaseSection(baseLeft, baseRight, baseTopY, baseBottomY, bottomRadius);
  const topTitleY = topCy - 8;
  const frontTitleY = baseBottomY + 20;

  return (
    <>
      <ViewTitle x={viewLabelX} y={topTitleY} lines={["Vista", "superior"]} />
      <ViewTitle x={viewLabelX} y={frontTitleY} lines={["Vista", "frontal"]} />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topCy - diameter / 2 - 18} y2={topCy + diameter / 2 + 18} />
      <line className="technical-centerline" x1={topCx - diameter / 2 - 18} x2={topCx + diameter / 2 + 18} y1={topCy} y2={topCy} />
      <circle className="part" cx={topCx} cy={topCy} r={diameter / 2} />
      <circle className="part muted" cx={topCx} cy={topCy} r={tubeInnerRadius} />
      <circle className="void" cx={topCx} cy={topCy} r={innerDetailRadius} />
      <Dimension x1={topCx - diameter / 2} y1={topCy - diameter / 2 - 28} x2={topCx + diameter / 2} y2={topCy - diameter / 2 - 28} label={`${baseDiameterValue} mm`} paramKey="diametroBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topCx + diameter / 2 - wall} y1={topCy + 18} x2={topCx + diameter / 2} y2={topCy + 18} label={`${wallValue} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <line className="technical-datum" x1="132" x2="652" y1={baseBottomY} y2={baseBottomY} />
      <rect className="part" x={neckLeft} y={neckTopY} width={neckDiameter} height={neckHeight} rx="0" />
      <path className="section-hatch-fill" d={`M ${neckLeft + 5} ${neckTopY + 5} H ${neckRight - 5} V ${baseTopY - 5} H ${neckLeft + 5} Z`} />
      {Array.from({ length: ribCount }, (_, index) => {
        const ribY = neckTopY + ribGap * (index + 1);
        return (
          <rect
            className="part muted"
            key={ribY}
            x={neckLeft - ribWidth}
            y={ribY - 3}
            width={neckDiameter + ribWidth * 2}
            height="6"
            rx="3"
          />
        );
      })}
      <path className="part muted" d={basePath} />
      <line className="technical-outline-heavy" x1={baseLeft + bottomRadius} x2={baseRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />

      <Dimension x1={baseLeft} y1={baseBottomY + 28} x2={baseRight} y2={baseBottomY + 28} label={`${baseDiameterValue} mm`} paramKey="diametroBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseLeft - 48} y1={neckTopY} x2={baseLeft - 48} y2={baseTopY} label={`${neckHeightValue} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseLeft - 48} y1={baseTopY} x2={baseLeft - 48} y2={baseBottomY} label={`${baseHeightValue} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={neckRight} y1={neckTopY - 22} x2={neckRight + wall} y2={neckTopY - 22} label={`${wallValue} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function TubeRect({ format, values, activeKey, onSelect }) {
  const sizeXValue = Number(values.tamanhoBaseX || 30);
  const sizeYValue = Number(values.tamanhoBaseY || 30);
  const baseHeightValue = Number(values.alturaBase || 6);
  const neckHeightValue = Number(values.alturaPescoco || 20);
  const wallValue = Number(values.paredeTubo || 1.5);
  const { width: sizeX, height: sizeY, scale: sectionScale } = scalePlanDimensions(sizeXValue, sizeYValue, {
    maxWidth: 230,
    maxHeight: 230,
    maxWidthValue: parameterMax(format, "tamanhoBaseX", 150),
    maxHeightValue: parameterMax(format, "tamanhoBaseY", 150),
    preferredScale: 3.15,
    minReadableSize: 24,
    readableCurve: 40
  });
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckHeight = clamp(neckHeightValue * 2.35, 34, 90);
  const wall = clamp(wallValue * sectionScale, 4, Math.max(4, Math.min(sizeX, sizeY) * 0.22));
  const ribWidth = Math.min(7, Math.max(4, wall * 0.5));
  const topCx = 300;
  const topBottom = topViewY + sizeY / 2;
  const topTop = topBottom - sizeY;
  const topCy = topTop + sizeY / 2;
  const topLeft = topCx - sizeX / 2;
  const topRight = topCx + sizeX / 2;
  const innerLeft = topLeft + wall;
  const innerTop = topTop + wall;
  const innerWidth = Math.max(sizeX * 0.42, sizeX - wall * 2);
  const innerHeight = Math.max(sizeY * 0.42, sizeY - wall * 2);
  const coreInset = Math.min(12, innerWidth / 4, innerHeight / 4);
  const coreWidth = Math.max(4, innerWidth - coreInset * 2);
  const coreHeight = Math.max(4, innerHeight - coreInset * 2);
  const outerRadius = cornerRadius(sizeX, sizeY, { max: 10, ratio: 0.15 });
  const innerRadius = cornerRadius(innerWidth, innerHeight, { max: 7, ratio: 0.15 });
  const coreRadius = cornerRadius(coreWidth, coreHeight, { max: 4, ratio: 0.14 });
  const frontCx = 300;
  const sideCx = 585;
  const baseTopY = baseBottomY - baseHeight;
  const neckTopY = baseTopY - neckHeight;
  const frontLeft = frontCx - sizeX / 2;
  const frontRight = frontCx + sizeX / 2;
  const sideLeft = sideCx - sizeY / 2;
  const sideRight = sideCx + sizeY / 2;
  const frontNeckLeft = frontCx - innerWidth / 2;
  const frontNeckRight = frontCx + innerWidth / 2;
  const sideNeckLeft = sideCx - innerHeight / 2;
  const sideNeckRight = sideCx + innerHeight / 2;
  const frontBottomRadius = Math.min(baseHeight, sizeX / 2, 12);
  const sideBottomRadius = Math.min(baseHeight, sizeY / 2, 12);
  const ribCount = neckHeightValue <= 20 ? 3 : 4;
  const ribGap = neckHeight / (ribCount + 1);
  const frontPath = roundedBaseSection(frontLeft, frontRight, baseTopY, baseBottomY, frontBottomRadius);
  const sidePath = roundedBaseSection(sideLeft, sideRight, baseTopY, baseBottomY, sideBottomRadius);
  const topTitleY = topCy - 34;
  const frontTitleY = baseBottomY + 20;
  const sideTitleY = baseBottomY + 42;

  return (
    <>
      <ViewTitle x={viewLabelX} y={topTitleY} lines={["Vista", "superior"]} />
      <ViewTitle x={viewLabelX} y={frontTitleY} lines={["Vista", "frontal"]} />
      <ViewTitle x={sideCx} y={sideTitleY} lines={["Vista", "lateral"]} />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topTop - 18} y2={topBottom + 18} />
      <line className="technical-centerline" x1={topLeft - 18} x2={topRight + 18} y1={topCy} y2={topCy} />
      <rect className="part" x={topLeft} y={topTop} width={sizeX} height={sizeY} rx={outerRadius} />
      <rect className="part muted" x={innerLeft} y={innerTop} width={innerWidth} height={innerHeight} rx={innerRadius} />
      <rect className="void" x={innerLeft + coreInset} y={innerTop + coreInset} width={coreWidth} height={coreHeight} rx={coreRadius} />
      <Dimension x1={topLeft} y1={topTop - 28} x2={topRight} y2={topTop - 28} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topLeft - 42} y1={topTop} x2={topLeft - 42} y2={topBottom} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={innerLeft} y1={topBottom + 18} x2={topLeft} y2={topBottom + 18} label={`${wallValue} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <line className="technical-datum" x1="132" x2="652" y1={baseBottomY} y2={baseBottomY} />
      <rect className="part" x={frontNeckLeft} y={neckTopY} width={innerWidth} height={neckHeight} rx="0" />
      <path className="section-hatch-fill" d={`M ${frontNeckLeft + 5} ${neckTopY + 5} H ${frontNeckRight - 5} V ${baseTopY - 5} H ${frontNeckLeft + 5} Z`} />
      {Array.from({ length: ribCount }, (_, index) => {
        const ribY = neckTopY + ribGap * (index + 1);
        return <rect className="part muted" key={`front-${ribY}`} x={frontNeckLeft - ribWidth} y={ribY - 3} width={innerWidth + ribWidth * 2} height="6" rx="3" />;
      })}
      <path className="part muted" d={frontPath} />
      <line className="technical-outline-heavy" x1={frontLeft + frontBottomRadius} x2={frontRight - frontBottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={frontLeft} y1={baseBottomY + 28} x2={frontRight} y2={baseBottomY + 28} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={frontLeft - 48} y1={neckTopY} x2={frontLeft - 48} y2={baseTopY} label={`${neckHeightValue} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={frontLeft - 48} y1={baseTopY} x2={frontLeft - 48} y2={baseBottomY} label={`${baseHeightValue} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />
      <line className="technical-centerline" x1={sideCx} x2={sideCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <rect className="part" x={sideNeckLeft} y={neckTopY} width={innerHeight} height={neckHeight} rx="0" />
      <path className="section-hatch-fill" d={`M ${sideNeckLeft + 5} ${neckTopY + 5} H ${sideNeckRight - 5} V ${baseTopY - 5} H ${sideNeckLeft + 5} Z`} />
      {Array.from({ length: ribCount }, (_, index) => {
        const ribY = neckTopY + ribGap * (index + 1);
        return <rect className="part muted" key={`side-${ribY}`} x={sideNeckLeft - ribWidth} y={ribY - 3} width={innerHeight + ribWidth * 2} height="6" rx="3" />;
      })}
      <path className="part muted" d={sidePath} />
      <line className="technical-outline-heavy" x1={sideLeft + sideBottomRadius} x2={sideRight - sideBottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={sideLeft} y1={baseBottomY + 28} x2={sideRight} y2={baseBottomY + 28} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function TubeOblong({ format, values, activeKey, onSelect }) {
  const sizeXValue = Number(values.tamanhoBaseX || 36);
  const sizeYValue = Number(values.tamanhoBaseY || 18);
  const baseHeightValue = Number(values.alturaBase || 6);
  const neckHeightValue = Number(values.alturaPescoco || 18);
  const wallValue = Number(values.paredeTubo || 1.5);
  const { width: sizeX, height: sizeY, scale: sectionScale } = scalePlanDimensions(sizeXValue, sizeYValue, {
    maxWidth: 230,
    maxHeight: 230,
    maxWidthValue: parameterMax(format, "tamanhoBaseX", 150),
    maxHeightValue: parameterMax(format, "tamanhoBaseY", 150),
    preferredScale: 3.2,
    minReadableSize: 24,
    readableCurve: 40
  });
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckHeight = clamp(neckHeightValue * 2.35, 34, 90);
  const wall = clamp(wallValue * sectionScale, 4, Math.max(4, sizeY * 0.24));
  const ribWidth = Math.min(7, Math.max(4, wall * 0.5));
  const innerX = Math.max(sizeX * 0.42, sizeX - wall * 2);
  const innerY = Math.max(sizeY * 0.42, sizeY - wall * 2);
  const coreInset = Math.min(12, innerX / 4, innerY / 4);
  const topCx = 320;
  const topBottom = topViewY + sizeY / 2;
  const topTop = topBottom - sizeY;
  const topCy = topTop + sizeY / 2;
  const topLeft = topCx - sizeX / 2;
  const topRight = topCx + sizeX / 2;
  const frontCx = 320;
  const sideCx = 595;
  const baseTopY = baseBottomY - baseHeight;
  const neckTopY = baseTopY - neckHeight;
  const frontLeft = frontCx - sizeX / 2;
  const frontRight = frontCx + sizeX / 2;
  const sideLeft = sideCx - sizeY / 2;
  const sideRight = sideCx + sizeY / 2;
  const frontNeckLeft = frontCx - innerX / 2;
  const frontNeckRight = frontCx + innerX / 2;
  const sideNeckLeft = sideCx - innerY / 2;
  const sideNeckRight = sideCx + innerY / 2;
  const bottomRadius = Math.min(baseHeight, 12);
  const ribCount = neckHeightValue <= 20 ? 3 : 4;
  const ribGap = neckHeight / (ribCount + 1);
  const frontPath = roundedBaseSection(frontLeft, frontRight, baseTopY, baseBottomY, bottomRadius);
  const sidePath = roundedBaseSection(sideLeft, sideRight, baseTopY, baseBottomY, bottomRadius);
  const topTitleY = topCy - 34;
  const frontTitleY = baseBottomY + 20;
  const sideTitleY = baseBottomY + 42;

  return (
    <>
      <ViewTitle x={viewLabelX} y={topTitleY} lines={["Vista", "superior"]} />
      <ViewTitle x={viewLabelX} y={frontTitleY} lines={["Vista", "frontal"]} />
      <ViewTitle x={sideCx} y={sideTitleY} lines={["Vista", "lateral"]} />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topTop - 18} y2={topBottom + 18} />
      <line className="technical-centerline" x1={topLeft - 18} x2={topRight + 18} y1={topCy} y2={topCy} />
      <path className="part" d={capsulePath(topCx, topCy, sizeX, sizeY)} />
      <path className="part muted" d={capsulePath(topCx, topCy, innerX, innerY)} />
      <path className="void" d={capsulePath(topCx, topCy, Math.max(4, innerX - coreInset * 2), Math.max(4, innerY - coreInset * 2))} />
      <Dimension x1={topLeft} y1={topTop - 28} x2={topRight} y2={topTop - 28} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topLeft - 42} y1={topTop} x2={topLeft - 42} y2={topBottom} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topCx - innerX / 2} y1={topBottom + 18} x2={topLeft} y2={topBottom + 18} label={`${wallValue} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <line className="technical-datum" x1="132" x2="652" y1={baseBottomY} y2={baseBottomY} />
      <rect className="part" x={frontNeckLeft} y={neckTopY} width={innerX} height={neckHeight} rx="0" />
      <path className="section-hatch-fill" d={`M ${frontNeckLeft + 5} ${neckTopY + 5} H ${frontNeckRight - 5} V ${baseTopY - 5} H ${frontNeckLeft + 5} Z`} />
      {Array.from({ length: ribCount }, (_, index) => {
        const ribY = neckTopY + ribGap * (index + 1);
        return <rect className="part muted" key={`front-ob-${ribY}`} x={frontNeckLeft - ribWidth} y={ribY - 3} width={innerX + ribWidth * 2} height="6" rx="3" />;
      })}
      <path className="part muted" d={frontPath} />
      <line className="technical-outline-heavy" x1={frontLeft + bottomRadius} x2={frontRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={frontLeft} y1={baseBottomY + 28} x2={frontRight} y2={baseBottomY + 28} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={frontLeft - 48} y1={neckTopY} x2={frontLeft - 48} y2={baseTopY} label={`${neckHeightValue} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={frontLeft - 48} y1={baseTopY} x2={frontLeft - 48} y2={baseBottomY} label={`${baseHeightValue} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={sideCx} x2={sideCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <rect className="part" x={sideNeckLeft} y={neckTopY} width={innerY} height={neckHeight} rx="0" />
      <path className="section-hatch-fill" d={`M ${sideNeckLeft + 5} ${neckTopY + 5} H ${sideNeckRight - 5} V ${baseTopY - 5} H ${sideNeckLeft + 5} Z`} />
      {Array.from({ length: ribCount }, (_, index) => {
        const ribY = neckTopY + ribGap * (index + 1);
        return <rect className="part muted" key={`side-ob-${ribY}`} x={sideNeckLeft - ribWidth} y={ribY - 3} width={innerY + ribWidth * 2} height="6" rx="3" />;
      })}
      <path className="part muted" d={sidePath} />
      <line className="technical-outline-heavy" x1={sideLeft + bottomRadius} x2={sideRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={sideLeft} y1={baseBottomY + 28} x2={sideRight} y2={baseBottomY + 28} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function BaseRound({ format, values, activeKey, onSelect }) {
  const hasNeck = values.pescoco === true || values.pescoco === "true";
  const baseDiameterValue = Number(values.diametroBase ?? values.diametro ?? 28);
  const baseHeightValue = Number(values.alturaBase ?? values.altura ?? 6);
  const neckDiameterValue = Number(values.diametroPescoco ?? 8);
  const neckHeightValue = Number(values.alturaPescoco ?? 12);
  const diameterKey = values.diametroBase !== undefined ? "diametroBase" : "diametro";
  const diameter = scaleRangeDimension(baseDiameterValue, {
    maxValue: parameterMax(format, diameterKey, 150),
    maxSize: 230,
    minSize: 24,
    readableCurve: 40
  });
  const height = scaleBaseHeight(baseHeightValue, { scale: 6, max: 60 });
  const neckDiameter = clamp(neckDiameterValue * 4, 18, Math.max(20, diameter - 18));
  const neckHeight = clamp(neckHeightValue * 2.8, 24, 96);
  const topCx = 360;
  const topCy = topViewY;
  const frontCx = topCx;
  const baseTopY = baseBottomY - height;
  const sideLeft = frontCx - diameter / 2;
  const sideRight = frontCx + diameter / 2;
  const neckLeft = frontCx - neckDiameter / 2;
  const neckRight = frontCx + neckDiameter / 2;
  const neckTopY = baseTopY - neckHeight;
  const bottomRadius = Math.min(height, diameter / 2);
  const basePath = `
    M ${sideLeft} ${baseTopY}
    H ${sideRight}
    V ${baseBottomY - bottomRadius}
    Q ${sideRight} ${baseBottomY} ${sideRight - bottomRadius} ${baseBottomY}
    H ${sideLeft + bottomRadius}
    Q ${sideLeft} ${baseBottomY} ${sideLeft} ${baseBottomY - bottomRadius}
    Z`;
  const topTitleY = topCy - 8;
  const frontTitleY = baseBottomY + 20;

  return (
    <>
      <ViewTitle x={viewLabelX} y={topTitleY} lines={["Vista", "superior"]} />
      <ViewTitle x={viewLabelX} y={frontTitleY} lines={["Vista", "frontal"]} />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topCy - diameter / 2 - 20} y2={topCy + diameter / 2 + 20} />
      <line className="technical-centerline" x1={topCx - diameter / 2 - 20} x2={topCx + diameter / 2 + 20} y1={topCy} y2={topCy} />
      <circle className="part" cx={topCx} cy={topCy} r={diameter / 2} />
      {hasNeck && (
        <>
          <circle className="void" cx={topCx} cy={topCy} r={neckDiameter / 2} />
          <Dimension x1={topCx - neckDiameter / 2} y1={topCy + 16} x2={topCx + neckDiameter / 2} y2={topCy + 16} label={`${neckDiameterValue} mm`} paramKey="diametroPescoco" activeKey={activeKey} onSelect={onSelect} />
        </>
      )}
      <Dimension x1={topCx - diameter / 2} y1={topCy - diameter / 2 - 28} x2={topCx + diameter / 2} y2={topCy - diameter / 2 - 28} label={`${baseDiameterValue} mm`} paramKey={values.diametroBase !== undefined ? "diametroBase" : "diametro"} activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={hasNeck ? neckTopY - 24 : baseTopY - 30} y2={baseBottomY + 24} />
      {hasNeck && (
        <>
          <rect className="part" x={neckLeft} y={neckTopY} width={neckDiameter} height={neckHeight} rx="0" />
          <path
            className="section-hatch-fill"
            d={`M ${neckLeft + 5} ${neckTopY + 5}
                H ${neckRight - 5}
                V ${baseTopY - 5}
                H ${neckLeft + 5}
                Z`}
          />
          <Dimension x1={neckLeft} y1={neckTopY - 24} x2={neckRight} y2={neckTopY - 24} label={`${neckDiameterValue} mm`} paramKey="diametroPescoco" activeKey={activeKey} onSelect={onSelect} />
          <Dimension x1={sideLeft - 48} y1={neckTopY} x2={sideLeft - 48} y2={baseTopY} label={`${values.alturaPescoco} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
        </>
      )}

      <path className="part muted" d={basePath} />
      <line className="technical-outline-heavy" x1={sideLeft} x2={sideRight} y1={baseTopY} y2={baseTopY} />
      <line className="technical-outline-heavy" x1={sideLeft + bottomRadius} x2={sideRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={sideLeft - 48} y1={baseTopY} x2={sideLeft - 48} y2={baseBottomY} label={`${baseHeightValue} mm`} paramKey={values.alturaBase !== undefined ? "alturaBase" : "altura"} activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function BaseOblong({ format, values, activeKey, onSelect }) {
  const lengthValue = Number(values.comprimento || 50);
  const widthValue = Number(values.largura || 20);
  const { width: length, height: width } = scalePlanDimensions(lengthValue, widthValue, {
    maxWidth: 330,
    maxHeight: 150,
    maxWidthValue: parameterMax(format, "comprimento", 110),
    maxHeightValue: parameterMax(format, "largura", 42),
    preferredScale: 3.6,
    minWidth: 24,
    minHeight: 24
  });
  const height = clamp(Number(values.altura || 7) * 7, 28, 110);
  const holes = Number(values.distanciaFuros || 0);
  const left = 320 - length / 2;
  const right = 320 + length / 2;
  const top = 118;
  const sideTop = top + width;
  const bottom = sideTop + height;
  const holeOffset = clamp(holes * 1.5, 24, length / 2 - 24);

  return (
    <>
      <line className="technical-centerline" x1="320" x2="320" y1={top - 36} y2={bottom + 22} />
      <rect className="technical-section plug-section" x={left} y={top} width={length} height={width} rx={width / 2} />
      <rect className="technical-section base-section" x={left} y={sideTop} width={length} height={height} rx="18" />
      {holes > 0 && (
        <>
          <circle className="void" cx={320 - holeOffset} cy={top + width / 2} r="13" />
          <circle className="void" cx={320 + holeOffset} cy={top + width / 2} r="13" />
          <line className="technical-datum" x1={320 - holeOffset} x2={320 + holeOffset} y1={top + width / 2} y2={top + width / 2} />
        </>
      )}
      <Dimension x1={left} y1={top - 42} x2={right} y2={top - 42} label={`${values.comprimento} mm`} paramKey="comprimento" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={left - 42} y1={top} x2={left - 42} y2={sideTop} label={`${values.largura} mm`} paramKey="largura" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={right + 48} y1={sideTop} x2={right + 48} y2={bottom} label={`${values.altura} mm`} paramKey="altura" activeKey={activeKey} onSelect={onSelect} />
      {holes > 0 && <Dimension x1={320 - holeOffset} y1={bottom + 26} x2={320 + holeOffset} y2={bottom + 26} label={`${values.distanciaFuros} mm`} paramKey="distanciaFuros" activeKey={activeKey} onSelect={onSelect} />}
    </>
  );
}

function BaseRect({ format, values, activeKey, onSelect }) {
  const hasNeck = values.pescoco === true || values.pescoco === "true";
  const sizeXValue = Number(values.tamanhoBaseX || values.comprimento || 50);
  const sizeYValue = Number(values.tamanhoBaseY || values.largura || 50);
  const baseHeightValue = Number(values.alturaBase || values.altura || 7);
  const neckDiameterValue = Number(values.diametroPescoco || 8);
  const neckHeightValue = Number(values.alturaPescoco || 12);
  const sizeXKey = values.tamanhoBaseX !== undefined ? "tamanhoBaseX" : "comprimento";
  const sizeYKey = values.tamanhoBaseY !== undefined ? "tamanhoBaseY" : "largura";
  const { width: sizeX, height: sizeY } = scalePlanDimensions(sizeXValue, sizeYValue, {
    maxWidth: 230,
    maxHeight: 230,
    maxWidthValue: parameterMax(format, sizeXKey, 150),
    maxHeightValue: parameterMax(format, sizeYKey, 150),
    preferredScale: 3.1,
    minReadableSize: 24,
    readableCurve: 40
  });
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckDiameter = clamp(neckDiameterValue * 4, 18, Math.max(20, Math.min(sizeX, sizeY) - 16));
  const neckHeight = clamp(neckHeightValue * 2.4, 24, 90);
  const radius = cornerRadius(sizeX, sizeY, { max: 10, ratio: 0.15 });
  const guideX = 145;
  const topCx = 300;
  const frontCx = 300;
  const sideCx = 585;
  const baseTopY = baseBottomY - baseHeight;
  const frontLeft = frontCx - sizeX / 2;
  const frontRight = frontCx + sizeX / 2;
  const sideLeft = sideCx - sizeY / 2;
  const sideRight = sideCx + sizeY / 2;
  const frontNeckLeft = frontCx - neckDiameter / 2;
  const frontNeckRight = frontCx + neckDiameter / 2;
  const sideNeckLeft = sideCx - neckDiameter / 2;
  const sideNeckRight = sideCx + neckDiameter / 2;
  const neckTopY = baseTopY - neckHeight;
  const frontBottomRadius = Math.min(baseHeight, sizeX / 2, 14);
  const sideBottomRadius = Math.min(baseHeight, sizeY / 2, 14);
  const topBottom = topViewY + sizeY / 2;
  const topTop = topBottom - sizeY;
  const topCy = topTop + sizeY / 2;
  const topLeft = topCx - sizeX / 2;
  const topRight = topCx + sizeX / 2;
  const frontPath = roundedBaseSection(frontLeft, frontRight, baseTopY, baseBottomY, frontBottomRadius);
  const sidePath = roundedBaseSection(sideLeft, sideRight, baseTopY, baseBottomY, sideBottomRadius);
  const topTitleY = topCy - 34;
  const frontTitleY = baseBottomY + 20;
  const sideTitleY = baseBottomY + 42;

  return (
    <>
      <ViewTitle x={viewLabelX} y={topTitleY} lines={["Vista", "superior"]} />
      <ViewTitle x={viewLabelX} y={frontTitleY} lines={["Vista", "frontal"]} />
      <ViewTitle x={sideCx} y={sideTitleY} lines={["Vista", "lateral"]} />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topTop - 20} y2={topBottom + 20} />
      <line className="technical-centerline" x1={topLeft - 20} x2={topRight + 20} y1={topCy} y2={topCy} />
      <rect className="part" x={topLeft} y={topTop} width={sizeX} height={sizeY} rx={radius} />
      {hasNeck && (
        <>
          <circle className="void" cx={topCx} cy={topCy} r={neckDiameter / 2} />
          <Dimension x1={topCx - neckDiameter / 2} y1={topCy + 15} x2={topCx + neckDiameter / 2} y2={topCy + 15} label={`${neckDiameterValue} mm`} paramKey="diametroPescoco" activeKey={activeKey} onSelect={onSelect} />
        </>
      )}
      <Dimension x1={topLeft} y1={topTop - 30} x2={topRight} y2={topTop - 30} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={guideX} y1={topTop} x2={guideX} y2={topBottom} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={hasNeck ? neckTopY - 18 : baseTopY - 24} y2={baseBottomY + 20} />
      {hasNeck && (
        <>
          <rect className="part" x={frontNeckLeft} y={neckTopY} width={neckDiameter} height={neckHeight} rx="0" />
          <path className="section-hatch-fill" d={`M ${frontNeckLeft + 5} ${neckTopY + 5} H ${frontNeckRight - 5} V ${baseTopY - 5} H ${frontNeckLeft + 5} Z`} />
          <Dimension x1={frontNeckLeft} y1={neckTopY - 24} x2={frontNeckRight} y2={neckTopY - 24} label={`${neckDiameterValue} mm`} paramKey="diametroPescoco" activeKey={activeKey} onSelect={onSelect} />
          <Dimension x1={guideX} y1={neckTopY} x2={guideX} y2={baseTopY} label={`${neckHeightValue} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
        </>
      )}
      <path className="part muted" d={frontPath} />
      <line className="technical-outline-heavy" x1={frontLeft} x2={frontRight} y1={baseTopY} y2={baseTopY} />
      <line className="technical-outline-heavy" x1={frontLeft + frontBottomRadius} x2={frontRight - frontBottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={frontLeft} y1={baseBottomY + 28} x2={frontRight} y2={baseBottomY + 28} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={guideX} y1={baseTopY} x2={guideX} y2={baseBottomY} label={`${baseHeightValue} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={sideCx} x2={sideCx} y1={hasNeck ? neckTopY - 18 : baseTopY - 24} y2={baseBottomY + 20} />
      {hasNeck && (
        <>
          <rect className="part" x={sideNeckLeft} y={neckTopY} width={neckDiameter} height={neckHeight} rx="0" />
          <path className="section-hatch-fill" d={`M ${sideNeckLeft + 5} ${neckTopY + 5} H ${sideNeckRight - 5} V ${baseTopY - 5} H ${sideNeckLeft + 5} Z`} />
          <Dimension x1={sideNeckLeft} y1={neckTopY - 24} x2={sideNeckRight} y2={neckTopY - 24} label={`${neckDiameterValue} mm`} paramKey="diametroPescoco" activeKey={activeKey} onSelect={onSelect} />
        </>
      )}
      <path className="part muted" d={sidePath} />
      <line className="technical-outline-heavy" x1={sideLeft} x2={sideRight} y1={baseTopY} y2={baseTopY} />
      <line className="technical-outline-heavy" x1={sideLeft + sideBottomRadius} x2={sideRight - sideBottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={sideLeft} y1={baseBottomY + 28} x2={sideRight} y2={baseBottomY + 28} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function roundedBaseSection(left, right, top, bottom, bottomRadius) {
  return `
    M ${left} ${top}
    H ${right}
    V ${bottom - bottomRadius}
    Q ${right} ${bottom} ${right - bottomRadius} ${bottom}
    H ${left + bottomRadius}
    Q ${left} ${bottom} ${left} ${bottom - bottomRadius}
    Z`;
}

function capsulePath(cx, cy, width, height) {
  const safeWidth = Math.max(0.1, Number(width || 0.1));
  const safeHeight = Math.max(0.1, Number(height || 0.1));

  if (safeWidth >= safeHeight) {
    const radius = safeHeight / 2;
    const left = cx - safeWidth / 2;
    const right = cx + safeWidth / 2;
    const top = cy - radius;
    const bottom = cy + radius;

    return `
      M ${left + radius} ${top}
      H ${right - radius}
      A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}
      H ${left + radius}
      A ${radius} ${radius} 0 0 1 ${left + radius} ${top}
      Z`;
  }

  const radius = safeWidth / 2;
  const left = cx - radius;
  const right = cx + radius;
  const top = cy - safeHeight / 2;
  const bottom = cy + safeHeight / 2;

  return `
    M ${left} ${top + radius}
    A ${radius} ${radius} 0 0 1 ${right} ${top + radius}
    V ${bottom - radius}
    A ${radius} ${radius} 0 0 1 ${left} ${bottom - radius}
    Z`;
}

function scaleBaseHeight(value, { scale = 5.2, min = 8, max = 52 } = {}) {
  return clamp(Number(value || 0) * scale, min, max);
}

function scaleRangeDimension(value, { maxValue, maxSize, minSize = 0, readableCurve = 0 }) {
  const safeValue = Math.max(0.1, Number(value || 0.1));
  const safeMaxValue = Math.max(safeValue, Number(maxValue || safeValue));

  if (readableCurve > 0) {
    return scaleReadableAxis(safeValue, {
      maxValue: safeMaxValue,
      maxSize,
      minSize,
      curve: readableCurve
    });
  }

  const scale = maxSize / safeMaxValue;

  return clamp(safeValue * scale, Math.min(minSize, maxSize), maxSize);
}

function scalePlanDimensions(
  widthValue,
  heightValue,
  {
    maxWidth,
    maxHeight,
    maxWidthValue,
    maxHeightValue,
    preferredScale,
    minWidth = 0,
    minHeight = 0,
    minReadableSize = 0,
    readableCurve = 0
  }
) {
  const safeWidth = Math.max(0.1, Number(widthValue || 0.1));
  const safeHeight = Math.max(0.1, Number(heightValue || 0.1));
  const safeMaxWidthValue = Math.max(safeWidth, Number(maxWidthValue || safeWidth));
  const safeMaxHeightValue = Math.max(safeHeight, Number(maxHeightValue || safeHeight));

  if (readableCurve > 0) {
    const width = scaleReadableAxis(safeWidth, {
      maxValue: safeMaxWidthValue,
      maxSize: maxWidth,
      minSize: Math.max(minWidth, minReadableSize),
      curve: readableCurve
    });
    const height = scaleReadableAxis(safeHeight, {
      maxValue: safeMaxHeightValue,
      maxSize: maxHeight,
      minSize: Math.max(minHeight, minReadableSize),
      curve: readableCurve
    });

    return {
      width,
      height,
      scale: Math.min(width / safeWidth, height / safeHeight)
    };
  }

  const rangeScale = Math.min(
    preferredScale,
    maxWidth / safeMaxWidthValue,
    maxHeight / safeMaxHeightValue
  );

  return {
    width: clamp(safeWidth * rangeScale, Math.min(minWidth, maxWidth), maxWidth),
    height: clamp(safeHeight * rangeScale, Math.min(minHeight, maxHeight), maxHeight),
    scale: rangeScale
  };
}

function scaleReadableAxis(value, { maxValue, maxSize, minSize, curve }) {
  const safeValue = Math.max(0.1, Number(value || 0.1));
  const safeMaxValue = Math.max(safeValue, Number(maxValue || safeValue));
  const denominator = 1 - Math.exp(-safeMaxValue / curve);
  const scaledValue = denominator > 0
    ? maxSize * ((1 - Math.exp(-safeValue / curve)) / denominator)
    : safeValue;

  return clamp(scaledValue, Math.min(minSize, maxSize), maxSize);
}

function cornerRadius(width, height, { max, ratio }) {
  const shortestSide = Math.min(Number(width || 0), Number(height || 0));

  return Math.min(max, shortestSide / 2, shortestSide * ratio);
}

function parameterMax(format, key, fallback) {
  return format?.parameters?.find((parameter) => parameter.key === key)?.max ?? fallback;
}

function BaseU({ values, activeKey, onSelect }) {
  const channel = clamp(Number(values.espessuraChapa || 3) * 18, 26, 90);
  const depth = clamp(Number(values.profundidadeCanal || 16) * 5, 60, 170);
  const length = clamp(Number(values.comprimento || 48) * 3, 120, 310);
  const height = clamp(Number(values.alturaAparente || 8) * 7, 34, 120);
  const left = 320 - length / 2;
  const right = 320 + length / 2;
  const channelLeft = 320 - channel / 2;
  const channelRight = 320 + channel / 2;
  const top = 130;
  const bottom = top + Math.max(height, depth + 28);

  return (
    <>
      <line className="technical-centerline" x1="320" x2="320" y1={top - 48} y2={bottom + 22} />
      <path className="technical-section base-section" d={`M ${left} ${top} H ${right} V ${bottom} H ${channelRight + 6} V ${top + depth} H ${channelLeft - 6} V ${bottom} H ${left} Z`} />
      <rect className="void" x={channelLeft} y={top} width={channel} height={depth} rx="6" />
      <rect className="cut-line-fill" x={channelLeft + 6} y={top} width={Math.max(8, channel - 12)} height={depth + 28} />
      <line className="technical-datum" x1={left - 34} x2={right + 34} y1={top + height} y2={top + height} />
      <line className="technical-outline-heavy" x1={left} x2={right} y1={bottom} y2={bottom} />
      <Dimension x1={channelLeft} y1={top - 40} x2={channelRight} y2={top - 40} label={`${values.espessuraChapa} mm`} paramKey="espessuraChapa" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={right + 42} y1={top} x2={right + 42} y2={top + depth} label={`${values.profundidadeCanal} mm`} paramKey="profundidadeCanal" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={left} y1={bottom + 28} x2={right} y2={bottom + 28} label={`${values.comprimento} mm`} paramKey="comprimento" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={right + 88} y1={top} x2={right + 88} y2={top + height} label={`${values.alturaAparente} mm`} paramKey="alturaAparente" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function ViewTitle({ x, y, lines, anchor = "middle" }) {
  return (
    <text className="drawing-view-title" x={x} y={y} style={{ textAnchor: anchor }}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function Dimension({ x1, y1, x2, y2, label, paramKey, activeKey, onSelect }) {
  const active = activeKey === paramKey;
  const startX = Number(x1);
  const startY = Number(y1);
  const endX = Number(x2);
  const endY = Number(y2);
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const ux = length > 0 ? dx / length : 0;
  const uy = length > 0 ? dy / length : 0;
  const inset = Math.min(7, Math.max(0, length / 6));
  const lineX1 = startX + ux * inset;
  const lineY1 = startY + uy * inset;
  const lineX2 = endX - ux * inset;
  const lineY2 = endY - uy * inset;
  const vertical = Math.abs(dx) < Math.abs(dy);
  const labelX = vertical
    ? startX + (startX < 320 ? -16 : 16)
    : (startX + endX) / 2;
  const labelY = vertical
    ? (startY + endY) / 2 + 4
    : (startY + endY) / 2 - 8;
  const textAnchor = vertical ? (startX < 320 ? "end" : "start") : "middle";

  return (
    <g
      className={`dimension${active ? " is-active" : ""}`}
      role="button"
      tabIndex="0"
      onClick={() => onSelect(paramKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onSelect(paramKey);
        }
      }}
    >
      <line x1={lineX1} y1={lineY1} x2={lineX2} y2={lineY2} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={labelX} y={labelY} style={{ textAnchor }}>{label}</text>
    </g>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
