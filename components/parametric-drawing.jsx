"use client";

const viewBox = "0 0 640 380";
const viewLabelX = 84;

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
        <rect className="drawing-canvas-fill" width="640" height="380" />
        <path className="drawing-axis" d="M 76 304 H 574 M 132 58 V 328" />
        <circle className="drawing-node" cx="132" cy="304" r="4" />
        <circle className="drawing-node" cx="574" cy="304" r="4" />
        <circle className="drawing-node" cx="132" cy="58" r="4" />
        {type === "tube-round" && <TubeRound values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "tube-rect" && <TubeRect values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "tube-oblong" && <TubeOblong values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-round" && <BaseRound values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-oblong" && <BaseOblong values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-rect" && <BaseRect values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
        {type === "base-u" && <BaseU values={values} activeKey={activeKey} onSelect={onSelectParameter} />}
      </svg>
    </div>
  );
}

function TubeRound({ values, activeKey, onSelect }) {
  const baseDiameterValue = Number(values.diametroBase || 28);
  const baseHeightValue = Number(values.alturaBase || 6);
  const neckHeightValue = Number(values.alturaPescoco || 18);
  const wallValue = Number(values.paredeTubo || 1.5);
  const diameter = clamp(baseDiameterValue * 2.8, 62, 150);
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckHeight = clamp(neckHeightValue * 2.1, 34, 84);
  const wall = clamp(wallValue * 12, 10, Math.max(12, diameter * 0.22));
  const neckDiameter = Math.max(28, diameter - wall * 2);
  const ribWidth = Math.min(7, Math.max(4, wall * 0.55));
  const tubeInnerRadius = Math.max(12, diameter / 2 - wall);
  const innerDetailRadius = Math.max(8, tubeInnerRadius - 12);
  const topCx = 320;
  const topCy = clamp(108 - neckHeight * 0.22, 76, 96);
  const frontCx = 320;
  const baseBottomY = 304;
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

  return (
    <>
      <ViewTitle x="122" y="120" lines={["Vista", "superior"]} anchor="end" />
      <ViewTitle x="122" y={baseBottomY - 11} lines={["Vista", "frontal"]} anchor="end" />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topCy - diameter / 2 - 18} y2={topCy + diameter / 2 + 18} />
      <line className="technical-centerline" x1={topCx - diameter / 2 - 18} x2={topCx + diameter / 2 + 18} y1={topCy} y2={topCy} />
      <circle className="part" cx={topCx} cy={topCy} r={diameter / 2} />
      <circle className="part muted" cx={topCx} cy={topCy} r={tubeInnerRadius} />
      <circle className="void" cx={topCx} cy={topCy} r={innerDetailRadius} />
      <Dimension x1={topCx - diameter / 2} y1={topCy - diameter / 2 - 28} x2={topCx + diameter / 2} y2={topCy - diameter / 2 - 28} label={`${baseDiameterValue} mm`} paramKey="diametroBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topCx + diameter / 2 - wall} y1={topCy + 18} x2={topCx + diameter / 2} y2={topCy + 18} label={`${wallValue} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <line className="technical-datum" x1="132" x2="574" y1={baseBottomY} y2={baseBottomY} />
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

function TubeRect({ values, activeKey, onSelect }) {
  const sizeXValue = Number(values.tamanhoBaseX || 30);
  const sizeYValue = Number(values.tamanhoBaseY || 30);
  const baseHeightValue = Number(values.alturaBase || 6);
  const neckHeightValue = Number(values.alturaPescoco || 20);
  const wallValue = Number(values.paredeTubo || 1.5);
  const { width: sizeX, height: sizeY, scale: sectionScale } = scalePlanDimensions(sizeXValue, sizeYValue, {
    maxWidth: 168,
    maxHeight: 128,
    preferredScale: 3.15,
    minLargest: 72
  });
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckHeight = clamp(neckHeightValue * 2.05, 34, 84);
  const wall = clamp(wallValue * sectionScale, 4, Math.max(4, Math.min(sizeX, sizeY) * 0.22));
  const ribWidth = Math.min(7, Math.max(4, wall * 0.5));
  const topCx = 302;
  const topBottom = clamp(188 - neckHeight * 0.35, 150, 178);
  const topTop = topBottom - sizeY;
  const topCy = topTop + sizeY / 2;
  const topLeft = topCx - sizeX / 2;
  const topRight = topCx + sizeX / 2;
  const innerLeft = topLeft + wall;
  const innerTop = topTop + wall;
  const innerWidth = Math.max(sizeX * 0.42, sizeX - wall * 2);
  const innerHeight = Math.max(sizeY * 0.42, sizeY - wall * 2);
  const coreInset = Math.min(12, innerWidth / 4, innerHeight / 4);
  const frontCx = 302;
  const sideCx = 510;
  const baseBottomY = 304;
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
  const bottomRadius = Math.min(baseHeight, 12);
  const ribCount = neckHeightValue <= 20 ? 3 : 4;
  const ribGap = neckHeight / (ribCount + 1);
  const frontPath = roundedBaseSection(frontLeft, frontRight, baseTopY, baseBottomY, bottomRadius);
  const sidePath = roundedBaseSection(sideLeft, sideRight, baseTopY, baseBottomY, bottomRadius);

  return (
    <>
      <ViewTitle x="124" y={topBottom - 11} lines={["Vista", "superior"]} anchor="end" />
      <ViewTitle x="124" y={baseBottomY - 11} lines={["Vista", "frontal"]} anchor="end" />
      <ViewTitle x={sideLeft - 18} y={baseBottomY - 24} lines={["Vista", "lateral"]} anchor="end" />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topTop - 18} y2={topBottom + 18} />
      <line className="technical-centerline" x1={topLeft - 18} x2={topRight + 18} y1={topCy} y2={topCy} />
      <rect className="part" x={topLeft} y={topTop} width={sizeX} height={sizeY} rx="14" />
      <rect className="part muted" x={innerLeft} y={innerTop} width={innerWidth} height={innerHeight} rx="8" />
      <rect className="void" x={innerLeft + coreInset} y={innerTop + coreInset} width={Math.max(4, innerWidth - coreInset * 2)} height={Math.max(4, innerHeight - coreInset * 2)} rx="5" />
      <Dimension x1={topLeft} y1={topTop - 28} x2={topRight} y2={topTop - 28} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topLeft - 42} y1={topTop} x2={topLeft - 42} y2={topBottom} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={innerLeft} y1={topBottom + 18} x2={topLeft} y2={topBottom + 18} label={`${wallValue} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <line className="technical-datum" x1="132" x2="574" y1={baseBottomY} y2={baseBottomY} />
      <rect className="part" x={frontNeckLeft} y={neckTopY} width={innerWidth} height={neckHeight} rx="0" />
      <path className="section-hatch-fill" d={`M ${frontNeckLeft + 5} ${neckTopY + 5} H ${frontNeckRight - 5} V ${baseTopY - 5} H ${frontNeckLeft + 5} Z`} />
      {Array.from({ length: ribCount }, (_, index) => {
        const ribY = neckTopY + ribGap * (index + 1);
        return <rect className="part muted" key={`front-${ribY}`} x={frontNeckLeft - ribWidth} y={ribY - 3} width={innerWidth + ribWidth * 2} height="6" rx="3" />;
      })}
      <path className="part muted" d={frontPath} />
      <line className="technical-outline-heavy" x1={frontLeft + bottomRadius} x2={frontRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />
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
      <line className="technical-outline-heavy" x1={sideLeft + bottomRadius} x2={sideRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={sideLeft} y1={baseBottomY + 28} x2={sideRight} y2={baseBottomY + 28} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function TubeOblong({ values, activeKey, onSelect }) {
  const sizeXValue = Number(values.tamanhoBaseX || 36);
  const sizeYValue = Number(values.tamanhoBaseY || 18);
  const baseHeightValue = Number(values.alturaBase || 6);
  const neckHeightValue = Number(values.alturaPescoco || 18);
  const wallValue = Number(values.paredeTubo || 1.5);
  const { width: sizeX, height: sizeY, scale: sectionScale } = scalePlanDimensions(sizeXValue, sizeYValue, {
    maxWidth: 250,
    maxHeight: 118,
    preferredScale: 3.2,
    minLargest: 70
  });
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckHeight = clamp(neckHeightValue * 2.05, 34, 84);
  const wall = clamp(wallValue * sectionScale, 4, Math.max(4, sizeY * 0.24));
  const ribWidth = Math.min(7, Math.max(4, wall * 0.5));
  const innerX = Math.max(sizeX * 0.42, sizeX - wall * 2);
  const innerY = Math.max(sizeY * 0.42, sizeY - wall * 2);
  const coreInset = Math.min(12, innerX / 4, innerY / 4);
  const topCx = 330;
  const topBottom = clamp(188 - neckHeight * 0.35, 150, 178);
  const topTop = topBottom - sizeY;
  const topCy = topTop + sizeY / 2;
  const topLeft = topCx - sizeX / 2;
  const topRight = topCx + sizeX / 2;
  const frontCx = 330;
  const sideCx = 520;
  const baseBottomY = 304;
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

  return (
    <>
      <ViewTitle x="124" y={topBottom - 11} lines={["Vista", "superior"]} anchor="end" />
      <ViewTitle x="124" y={baseBottomY - 11} lines={["Vista", "frontal"]} anchor="end" />
      <ViewTitle x={sideLeft - 18} y={baseBottomY - 24} lines={["Vista", "lateral"]} anchor="end" />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topTop - 18} y2={topBottom + 18} />
      <line className="technical-centerline" x1={topLeft - 18} x2={topRight + 18} y1={topCy} y2={topCy} />
      <path className="part" d={capsulePath(topCx, topCy, sizeX, sizeY)} />
      <path className="part muted" d={capsulePath(topCx, topCy, innerX, innerY)} />
      <path className="void" d={capsulePath(topCx, topCy, Math.max(4, innerX - coreInset * 2), Math.max(4, innerY - coreInset * 2))} />
      <Dimension x1={topLeft} y1={topTop - 28} x2={topRight} y2={topTop - 28} label={`${sizeXValue} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topLeft - 42} y1={topTop} x2={topLeft - 42} y2={topBottom} label={`${sizeYValue} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={topCx - innerX / 2} y1={topBottom + 18} x2={topLeft} y2={topBottom + 18} label={`${wallValue} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />

      <line className="technical-centerline" x1={frontCx} x2={frontCx} y1={neckTopY - 18} y2={baseBottomY + 20} />
      <line className="technical-datum" x1="132" x2="574" y1={baseBottomY} y2={baseBottomY} />
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

function BaseRound({ values, activeKey, onSelect }) {
  const hasNeck = values.pescoco === true || values.pescoco === "true";
  const baseDiameterValue = Number(values.diametroBase ?? values.diametro ?? 28);
  const baseHeightValue = Number(values.alturaBase ?? values.altura ?? 6);
  const neckDiameterValue = Number(values.diametroPescoco ?? 8);
  const neckHeightValue = Number(values.alturaPescoco ?? 12);
  const diameter = clamp(baseDiameterValue * 2.5, 58, 130);
  const height = scaleBaseHeight(baseHeightValue, { scale: 6, max: 60 });
  const neckDiameter = clamp(neckDiameterValue * 4, 18, Math.max(20, diameter - 18));
  const neckHeight = clamp(neckHeightValue * 2.8, 24, 98);
  const topCx = 320;
  const topCy = 104;
  const frontCx = topCx;
  const baseBottomY = 304;
  const baseTopY = baseBottomY - height;
  const sideLeft = frontCx - diameter / 2;
  const sideRight = frontCx + diameter / 2;
  const neckLeft = frontCx - neckDiameter / 2;
  const neckRight = frontCx + neckDiameter / 2;
  const neckTopY = baseTopY - neckHeight;
  const bottomRadius = Math.min(height, diameter / 2);
  const diameterScaleLimited = baseDiameterValue * 2.5 !== diameter;
  const basePath = `
    M ${sideLeft} ${baseTopY}
    H ${sideRight}
    V ${baseBottomY - bottomRadius}
    Q ${sideRight} ${baseBottomY} ${sideRight - bottomRadius} ${baseBottomY}
    H ${sideLeft + bottomRadius}
    Q ${sideLeft} ${baseBottomY} ${sideLeft} ${baseBottomY - bottomRadius}
    Z`;

  return (
    <>
      <ViewTitle x={viewLabelX} y={topCy - 8} lines={["Vista", "superior"]} />
      <ViewTitle x={viewLabelX} y={baseBottomY - height / 2 - 8} lines={["Vista", "frontal"]} />

      <line className="technical-centerline" x1={topCx} x2={topCx} y1={topCy - diameter / 2 - 20} y2={topCy + diameter / 2 + 20} />
      <line className="technical-centerline" x1={topCx - diameter / 2 - 20} x2={topCx + diameter / 2 + 20} y1={topCy} y2={topCy} />
      <circle className="part" cx={topCx} cy={topCy} r={diameter / 2} />
      {diameterScaleLimited && <ScaleLimitMarks x1={topCx - diameter / 2} x2={topCx + diameter / 2} y={topCy} />}
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

function BaseOblong({ values, activeKey, onSelect }) {
  const lengthValue = Number(values.comprimento || 50);
  const widthValue = Number(values.largura || 20);
  const { width: length, height: width } = scalePlanDimensions(lengthValue, widthValue, {
    maxWidth: 330,
    maxHeight: 150,
    preferredScale: 3.6,
    minLargest: 86
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

function BaseRect({ values, activeKey, onSelect }) {
  const hasNeck = values.pescoco === true || values.pescoco === "true";
  const sizeXValue = Number(values.tamanhoBaseX || values.comprimento || 50);
  const sizeYValue = Number(values.tamanhoBaseY || values.largura || 50);
  const baseHeightValue = Number(values.alturaBase || values.altura || 7);
  const neckDiameterValue = Number(values.diametroPescoco || 8);
  const neckHeightValue = Number(values.alturaPescoco || 12);
  const { width: sizeX, height: sizeY } = scalePlanDimensions(sizeXValue, sizeYValue, {
    maxWidth: 168,
    maxHeight: 128,
    preferredScale: 3.1,
    minLargest: 72
  });
  const baseHeight = scaleBaseHeight(baseHeightValue);
  const neckDiameter = clamp(neckDiameterValue * 4, 18, Math.max(20, Math.min(sizeX, sizeY) - 16));
  const neckHeight = clamp(neckHeightValue * 2.4, 24, 84);
  const radius = 12;
  const guideX = 214;
  const topCx = 316;
  const frontCx = 316;
  const sideCx = 524;
  const baseBottomY = 304;
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
  const bottomRadius = Math.min(baseHeight, 14);
  const topBottom = 176;
  const topTop = topBottom - sizeY;
  const topCy = topTop + sizeY / 2;
  const topLeft = topCx - sizeX / 2;
  const topRight = topCx + sizeX / 2;
  const frontPath = roundedBaseSection(frontLeft, frontRight, baseTopY, baseBottomY, bottomRadius);
  const sidePath = roundedBaseSection(sideLeft, sideRight, baseTopY, baseBottomY, bottomRadius);

  return (
    <>
      <ViewTitle x="116" y={topBottom - 11} lines={["Vista", "superior"]} anchor="end" />
      <ViewTitle x="116" y={baseBottomY - 11} lines={["Vista", "frontal"]} anchor="end" />
      <ViewTitle x={sideLeft - 18} y={baseBottomY - 11} lines={["Vista", "lateral"]} anchor="end" />

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
      <line className="technical-outline-heavy" x1={frontLeft + bottomRadius} x2={frontRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />
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
      <line className="technical-outline-heavy" x1={sideLeft + bottomRadius} x2={sideRight - bottomRadius} y1={baseBottomY} y2={baseBottomY} />
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

function scalePlanDimensions(widthValue, heightValue, { maxWidth, maxHeight, preferredScale, minLargest = 0 }) {
  const safeWidth = Math.max(0.1, Number(widthValue || 0.1));
  const safeHeight = Math.max(0.1, Number(heightValue || 0.1));
  const largest = Math.max(safeWidth, safeHeight);
  const maxScale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
  const readableScale = minLargest > 0 ? minLargest / largest : 0;
  const scale = Math.min(maxScale, Math.max(preferredScale, readableScale));

  return {
    width: safeWidth * scale,
    height: safeHeight * scale,
    scale
  };
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

function ScaleLimitMarks({ x1, x2, y, vertical = false }) {
  const center = (Number(x1) + Number(x2)) / 2;

  if (vertical) {
    return (
      <g className="scale-limit-mark" aria-hidden="true">
        <path d={`M ${center - 12} ${y - 24} l 8 -8 M ${center + 4} ${y - 24} l 8 -8`} />
        <path d={`M ${center - 12} ${y + 24} l 8 8 M ${center + 4} ${y + 24} l 8 8`} />
      </g>
    );
  }

  return (
    <g className="scale-limit-mark" aria-hidden="true">
      <path d={`M ${x1 - 14} ${y - 12} l -8 8 M ${x1 - 4} ${y - 12} l -8 8`} />
      <path d={`M ${x2 + 14} ${y - 12} l 8 8 M ${x2 + 4} ${y - 12} l 8 8`} />
    </g>
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
