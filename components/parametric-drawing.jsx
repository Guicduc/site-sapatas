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
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <pattern id="section-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M 0 0 V 8" />
          </pattern>
        </defs>
        <rect className="drawing-grid-fill" width="640" height="380" />
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
  const diameter = clamp(Number(values.diametroBase || 22) * 4, 54, 150);
  const base = clamp(Number(values.diametroBase || 28) * 4, diameter + 20, 190);
  const insertion = clamp(Number(values.alturaPescoco || 18) * 5, 54, 170);
  const support = clamp(Number(values.alturaBase || 8) * 6, 28, 96);
  const centerX = 320;
  const baseTopY = 260;
  const baseBottomY = baseTopY + support;
  const plugTopY = baseTopY - insertion;
  const plugLeft = centerX - diameter / 2;
  const plugRight = centerX + diameter / 2;
  const baseLeft = centerX - base / 2;
  const baseRight = centerX + base / 2;
  const chamfer = 10;
  const shoulder = 14;

  return (
    <>
      <line className="technical-centerline" x1={centerX} x2={centerX} y1={plugTopY - 28} y2={baseBottomY + 22} />
      <line className="technical-datum" x1={baseLeft - 72} x2={baseRight + 72} y1={baseTopY} y2={baseTopY} />
      <line className="technical-projection" x1={plugLeft} x2={plugLeft} y1={plugTopY - 18} y2={plugTopY} />
      <line className="technical-projection" x1={plugRight} x2={plugRight} y1={plugTopY - 18} y2={plugTopY} />
      <line className="technical-projection" x1={baseLeft} x2={baseLeft} y1={baseBottomY} y2={baseBottomY + 18} />
      <line className="technical-projection" x1={baseRight} x2={baseRight} y1={baseBottomY} y2={baseBottomY + 18} />
      <line className="technical-projection" x1={baseRight + 28} x2={baseRight + 52} y1={plugTopY} y2={plugTopY} />
      <line className="technical-projection" x1={baseRight + 28} x2={baseRight + 52} y1={baseTopY} y2={baseTopY} />
      <line className="technical-projection" x1={baseRight + 74} x2={baseRight + 98} y1={baseTopY} y2={baseTopY} />
      <line className="technical-projection" x1={baseRight + 74} x2={baseRight + 98} y1={baseBottomY} y2={baseBottomY} />

      <path
        className="technical-section base-section"
        d={`M ${baseLeft + chamfer} ${baseBottomY}
            H ${baseRight - chamfer}
            Q ${baseRight} ${baseBottomY} ${baseRight} ${baseBottomY - chamfer}
            V ${baseTopY + shoulder}
            Q ${baseRight} ${baseTopY} ${baseRight - shoulder} ${baseTopY}
            H ${baseLeft + shoulder}
            Q ${baseLeft} ${baseTopY} ${baseLeft} ${baseTopY + shoulder}
            V ${baseBottomY - chamfer}
            Q ${baseLeft} ${baseBottomY} ${baseLeft + chamfer} ${baseBottomY}
            Z`}
      />
      <path
        className="technical-section plug-section"
        d={`M ${plugLeft + 8} ${baseTopY}
            H ${plugRight - 8}
            Q ${plugRight} ${baseTopY} ${plugRight} ${baseTopY - 8}
            V ${plugTopY + 10}
            L ${plugRight - 10} ${plugTopY}
            H ${plugLeft + 10}
            L ${plugLeft} ${plugTopY + 10}
            V ${baseTopY - 8}
            Q ${plugLeft} ${baseTopY} ${plugLeft + 8} ${baseTopY}
            Z`}
      />
      <path
        className="section-hatch-fill"
        d={`M ${plugLeft + 12} ${baseTopY - 6}
            H ${plugRight - 12}
            V ${plugTopY + 14}
            H ${plugLeft + 12}
            Z`}
      />
      <line className="technical-outline-heavy" x1={baseLeft + 16} x2={baseRight - 16} y1={baseBottomY} y2={baseBottomY} />

      <Dimension x1={plugLeft} y1={plugTopY - 34} x2={plugRight} y2={plugTopY - 34} label={`${values.diametroBase} mm`} paramKey="diametroBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseLeft} y1={baseBottomY + 30} x2={baseRight} y2={baseBottomY + 30} label={`${values.diametroBase} mm`} paramKey="diametroBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseRight + 52} y1={plugTopY} x2={baseRight + 52} y2={baseTopY} label={`${values.alturaPescoco} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseRight + 98} y1={baseTopY} x2={baseRight + 98} y2={baseBottomY} label={`${values.alturaBase} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function TubeRect({ values, activeKey, onSelect }) {
  const width = clamp(Number(values.tamanhoBaseX || 30) * 4, 92, 230);
  const height = clamp(Number(values.tamanhoBaseY || 20) * 4, 58, 150);
  const insertion = clamp(Number(values.alturaPescoco || 20) * 5, 70, 170);
  const baseHeight = clamp(Number(values.alturaBase || 8) * 6, 30, 92);
  const wall = clamp(Number(values.paredeTubo || 1.5) * 14, 12, 42);
  const centerX = 320;
  const baseTopY = 258;
  const baseBottomY = baseTopY + baseHeight;
  const plugTopY = baseTopY - insertion;
  const plugLeft = centerX - width / 2;
  const plugRight = centerX + width / 2;
  const baseLeft = plugLeft - wall;
  const baseRight = plugRight + wall;
  const voidHeight = Math.max(36, height);
  const voidTop = plugTopY + 22;
  const voidLeft = centerX - width / 2 + wall;
  const voidWidth = Math.max(18, width - wall * 2);

  return (
    <>
      <line className="technical-centerline" x1={centerX} x2={centerX} y1={plugTopY - 28} y2={baseBottomY + 22} />
      <line className="technical-datum" x1={baseLeft - 58} x2={baseRight + 58} y1={baseTopY} y2={baseTopY} />
      <line className="technical-projection" x1={plugLeft} x2={plugLeft} y1={plugTopY - 20} y2={plugTopY} />
      <line className="technical-projection" x1={plugRight} x2={plugRight} y1={plugTopY - 20} y2={plugTopY} />
      <line className="technical-projection" x1={voidLeft} x2={voidLeft} y1={voidTop} y2={voidTop + voidHeight} />
      <line className="technical-projection" x1={voidLeft + voidWidth} x2={voidLeft + voidWidth} y1={voidTop} y2={voidTop + voidHeight} />
      <rect className="technical-section base-section" x={baseLeft} y={baseTopY} width={width + wall * 2} height={baseHeight} rx="12" />
      <rect className="technical-section plug-section" x={plugLeft} y={plugTopY} width={width} height={insertion} rx="8" />
      <rect className="void" x={voidLeft} y={voidTop} width={voidWidth} height={voidHeight} rx="6" />
      <path className="section-hatch-fill" d={`M ${plugLeft + 10} ${baseTopY - 8} H ${plugRight - 10} V ${plugTopY + 16} H ${plugLeft + 10} Z`} />
      <line className="technical-outline-heavy" x1={baseLeft + 14} x2={baseRight - 14} y1={baseBottomY} y2={baseBottomY} />
      <Dimension x1={plugLeft} y1={plugTopY - 34} x2={plugRight} y2={plugTopY - 34} label={`${values.tamanhoBaseX} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={voidLeft - 34} y1={voidTop} x2={voidLeft - 34} y2={voidTop + voidHeight} label={`${values.tamanhoBaseY} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={plugRight} y1={plugTopY + 24} x2={baseRight} y2={plugTopY + 24} label={`${values.paredeTubo} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseRight + 46} y1={plugTopY} x2={baseRight + 46} y2={baseTopY} label={`${values.alturaPescoco} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseRight + 92} y1={baseTopY} x2={baseRight + 92} y2={baseBottomY} label={`${values.alturaBase} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function TubeOblong({ values, activeKey, onSelect }) {
  const width = clamp(Number(values.tamanhoBaseX || 36) * 4, 100, 240);
  const height = clamp(Number(values.tamanhoBaseY || 18) * 4, 60, 140);
  const radius = clamp(Math.min(Number(values.tamanhoBaseX || 36), Number(values.tamanhoBaseY || 18)) * 2, 18, 70);
  const insertion = clamp(Number(values.alturaPescoco || 18) * 5, 64, 160);

  return (
    <>
      <rect className="part muted" x={320 - width / 2 - 16} y="260" width={width + 32} height="54" rx="24" />
      <rect className="part" x={320 - width / 2} y={260 - insertion} width={width} height={insertion} rx={radius} />
      <ellipse className="void" cx="320" cy={210} rx={width / 2 - 22} ry={height / 2} />
      <Dimension x1={320 - width / 2} y1={78} x2={320 + width / 2} y2={78} label={`${values.tamanhoBaseX} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="178" y1={210 - height / 2} x2="178" y2={210 + height / 2} label={`${values.tamanhoBaseY} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="430" y1="150" x2={430 + radius} y2="150" label={`${values.paredeTubo} mm`} paramKey="paredeTubo" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="500" y1={260 - insertion} x2="500" y2="260" label={`${values.alturaPescoco} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
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
  const height = clamp(baseHeightValue * 6, 16, 60);
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
          <Dimension x1={sideLeft - 40} y1={neckTopY} x2={sideLeft - 40} y2={baseTopY} label={`${values.alturaPescoco} mm`} paramKey="alturaPescoco" activeKey={activeKey} onSelect={onSelect} />
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
  const length = clamp(Number(values.comprimento || 50) * 3, 130, 330);
  const width = clamp(Number(values.largura || 20) * 4, 60, 170);
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
  const length = clamp(Number(values.tamanhoBaseX || 75) * 2.7, 130, 340);
  const width = clamp(Number(values.tamanhoBaseY || 25) * 3.5, 68, 180);
  const height = clamp(Number(values.alturaBase || 6) * 8, 28, 112);
  const radius = 10;
  const left = 320 - length / 2;
  const right = 320 + length / 2;
  const top = 112;
  const sideTop = top + width;
  const bottom = sideTop + height;

  return (
    <>
      <line className="technical-centerline" x1="320" x2="320" y1={top - 32} y2={bottom + 22} />
      <rect className="technical-section plug-section" x={left} y={top} width={length} height={width} rx={radius} />
      <rect className="technical-section base-section" x={left} y={sideTop} width={length} height={height} rx="12" />
      <path className="section-hatch-fill" d={`M ${left + 14} ${sideTop + 8} H ${right - 14} V ${bottom - 8} H ${left + 14} Z`} />
      <line className="technical-outline-heavy" x1={left + 12} x2={right - 12} y1={bottom} y2={bottom} />
      <Dimension x1={left} y1={top - 40} x2={right} y2={top - 40} label={`${values.tamanhoBaseX} mm`} paramKey="tamanhoBaseX" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={left - 42} y1={top} x2={left - 42} y2={sideTop} label={`${values.tamanhoBaseY} mm`} paramKey="tamanhoBaseY" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={right + 48} y1={sideTop} x2={right + 48} y2={bottom} label={`${values.alturaBase} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
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

function ViewTitle({ x, y, lines }) {
  return (
    <text className="drawing-view-title" x={x} y={y}>
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
