"use client";

const viewBox = "0 0 640 380";

export function ParametricDrawing({ format, values, activeKey, onSelectParameter }) {
  const type = format.drawingType;

  return (
    <div className="drawing-panel">
      <div className="drawing-toolbar">
        <div>
          <p className="eyebrow">Vista paramétrica</p>
          <h2>{format.name}</h2>
        </div>
        <span>Cotas editáveis para matriz Grasshopper/3D</span>
      </div>
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
  const diameter = clamp(Number(values.diametroInterno || 22) * 4, 54, 150);
  const base = clamp(Number(values.diametroBase || 28) * 4, diameter + 20, 190);
  const insertion = clamp(Number(values.profundidadeInsercao || 18) * 5, 54, 170);
  const support = clamp(Number(values.alturaApoio || 8) * 6, 28, 96);
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

      <Dimension x1={plugLeft} y1={plugTopY - 34} x2={plugRight} y2={plugTopY - 34} label={`${values.diametroInterno} mm`} paramKey="diametroInterno" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseLeft} y1={baseBottomY + 30} x2={baseRight} y2={baseBottomY + 30} label={`${values.diametroBase} mm`} paramKey="diametroBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseRight + 52} y1={plugTopY} x2={baseRight + 52} y2={baseTopY} label={`${values.profundidadeInsercao} mm`} paramKey="profundidadeInsercao" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={baseRight + 98} y1={baseTopY} x2={baseRight + 98} y2={baseBottomY} label={`${values.alturaApoio} mm`} paramKey="alturaApoio" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function TubeRect({ values, activeKey, onSelect }) {
  const width = clamp(Number(values.larguraInterna || 30) * 4, 92, 230);
  const height = clamp(Number(values.alturaInterna || 20) * 4, 58, 150);
  const insertion = clamp(Number(values.profundidadeInsercao || 20) * 5, 70, 170);
  const baseHeight = clamp(Number(values.alturaBase || 8) * 6, 30, 92);
  const wall = clamp(Number(values.parede || 1.5) * 14, 12, 42);

  return (
    <>
      <rect className="part muted" x={320 - width / 2 - wall} y={258} width={width + wall * 2} height={baseHeight} rx="12" />
      <rect className="part" x={320 - width / 2} y={258 - insertion} width={width} height={insertion} rx="8" />
      <rect className="void" x={320 - width / 2 + wall} y={258 - insertion + 20} width={width - wall * 2} height={Math.max(36, height)} rx="6" />
      <Dimension x1={320 - width / 2} y1={74} x2={320 + width / 2} y2={74} label={`${values.larguraInterna} mm`} paramKey="larguraInterna" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={176} y1={150} x2={176} y2={150 + height} label={`${values.alturaInterna} mm`} paramKey="alturaInterna" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={320 + width / 2} y1={106} x2={320 + width / 2 + wall} y2={106} label={`${values.parede} mm`} paramKey="parede" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={500} y1={258 - insertion} x2={500} y2={258} label={`${values.profundidadeInsercao} mm`} paramKey="profundidadeInsercao" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={548} y1={258} x2={548} y2={258 + baseHeight} label={`${values.alturaBase} mm`} paramKey="alturaBase" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function TubeOblong({ values, activeKey, onSelect }) {
  const width = clamp(Number(values.larguraInterna || 36) * 4, 100, 240);
  const height = clamp(Number(values.alturaInterna || 18) * 4, 60, 140);
  const radius = clamp(Number(values.raioCanto || 9) * 4, 18, 70);
  const insertion = clamp(Number(values.profundidadeInsercao || 18) * 5, 64, 160);

  return (
    <>
      <rect className="part muted" x={320 - width / 2 - 16} y="260" width={width + 32} height="54" rx="24" />
      <rect className="part" x={320 - width / 2} y={260 - insertion} width={width} height={insertion} rx={radius} />
      <ellipse className="void" cx="320" cy={210} rx={width / 2 - 22} ry={height / 2} />
      <Dimension x1={320 - width / 2} y1={78} x2={320 + width / 2} y2={78} label={`${values.larguraInterna} mm`} paramKey="larguraInterna" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="178" y1={210 - height / 2} x2="178" y2={210 + height / 2} label={`${values.alturaInterna} mm`} paramKey="alturaInterna" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="430" y1="150" x2={430 + radius} y2="150" label={`${values.raioCanto} mm`} paramKey="raioCanto" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="500" y1={260 - insertion} x2="500" y2="260" label={`${values.profundidadeInsercao} mm`} paramKey="profundidadeInsercao" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function BaseRound({ values, activeKey, onSelect }) {
  const diameter = clamp(Number(values.diametro || 28) * 4, 80, 240);
  const height = clamp(Number(values.altura || 6) * 8, 28, 120);

  return (
    <>
      <ellipse className="part" cx="320" cy="180" rx={diameter / 2} ry={diameter / 3.4} />
      <rect className="part muted" x={320 - diameter / 2} y="180" width={diameter} height={height} rx="22" />
      <Dimension x1={320 - diameter / 2} y1="94" x2={320 + diameter / 2} y2="94" label={`${values.diametro} mm`} paramKey="diametro" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="500" y1="180" x2="500" y2={180 + height} label={`${values.altura} mm`} paramKey="altura" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function BaseOblong({ values, activeKey, onSelect }) {
  const length = clamp(Number(values.comprimento || 50) * 3, 130, 330);
  const width = clamp(Number(values.largura || 20) * 4, 60, 170);
  const height = clamp(Number(values.altura || 7) * 7, 28, 110);
  const holes = Number(values.distanciaFuros || 0);

  return (
    <>
      <rect className="part" x={320 - length / 2} y="118" width={length} height={width} rx={width / 2} />
      <rect className="part muted" x={320 - length / 2} y={118 + width} width={length} height={height} rx="18" />
      {holes > 0 && (
        <>
          <circle className="void" cx={320 - clamp(holes * 1.5, 24, length / 2 - 24)} cy={118 + width / 2} r="13" />
          <circle className="void" cx={320 + clamp(holes * 1.5, 24, length / 2 - 24)} cy={118 + width / 2} r="13" />
        </>
      )}
      <Dimension x1={320 - length / 2} y1="76" x2={320 + length / 2} y2="76" label={`${values.comprimento} mm`} paramKey="comprimento" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="120" y1="118" x2="120" y2={118 + width} label={`${values.largura} mm`} paramKey="largura" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="520" y1={118 + width} x2="520" y2={118 + width + height} label={`${values.altura} mm`} paramKey="altura" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="230" y1="286" x2="410" y2="286" label={`${values.distanciaFuros} mm`} paramKey="distanciaFuros" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function BaseRect({ values, activeKey, onSelect }) {
  const length = clamp(Number(values.comprimento || 75) * 2.7, 130, 340);
  const width = clamp(Number(values.largura || 25) * 3.5, 68, 180);
  const height = clamp(Number(values.altura || 6) * 8, 28, 112);
  const radius = clamp(Number(values.raioCanto || 4) * 5, 6, 46);

  return (
    <>
      <rect className="part" x={320 - length / 2} y="112" width={length} height={width} rx={radius} />
      <rect className="part muted" x={320 - length / 2} y={112 + width} width={length} height={height} rx="12" />
      <Dimension x1={320 - length / 2} y1="72" x2={320 + length / 2} y2="72" label={`${values.comprimento} mm`} paramKey="comprimento" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="118" y1="112" x2="118" y2={112 + width} label={`${values.largura} mm`} paramKey="largura" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="520" y1={112 + width} x2="520" y2={112 + width + height} label={`${values.altura} mm`} paramKey="altura" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="410" y1="112" x2={410 + radius} y2="112" label={`${values.raioCanto} mm`} paramKey="raioCanto" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function BaseU({ values, activeKey, onSelect }) {
  const channel = clamp(Number(values.espessuraChapa || 3) * 18, 26, 90);
  const depth = clamp(Number(values.profundidadeCanal || 16) * 5, 60, 170);
  const length = clamp(Number(values.comprimento || 48) * 3, 120, 310);
  const height = clamp(Number(values.alturaAparente || 8) * 7, 34, 120);

  return (
    <>
      <path className="part" d={`M ${320 - length / 2} 130 h ${length} v ${height} h -${length} z`} />
      <rect className="void" x={320 - channel / 2} y="130" width={channel} height={depth} rx="6" />
      <rect className="cut-line-fill" x={320 - channel / 2 + 6} y="130" width={channel - 12} height={depth + 28} />
      <Dimension x1={320 - channel / 2} y1="90" x2={320 + channel / 2} y2="90" label={`${values.espessuraChapa} mm`} paramKey="espessuraChapa" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="454" y1="130" x2="454" y2={130 + depth} label={`${values.profundidadeCanal} mm`} paramKey="profundidadeCanal" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={320 - length / 2} y1="304" x2={320 + length / 2} y2="304" label={`${values.comprimento} mm`} paramKey="comprimento" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1="524" y1="130" x2="524" y2={130 + height} label={`${values.alturaAparente} mm`} paramKey="alturaAparente" activeKey={activeKey} onSelect={onSelect} />
    </>
  );
}

function Dimension({ x1, y1, x2, y2, label, paramKey, activeKey, onSelect }) {
  const active = activeKey === paramKey;
  const labelX = (Number(x1) + Number(x2)) / 2;
  const labelY = (Number(y1) + Number(y2)) / 2 - 8;

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
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={labelX} y={labelY}>{label}</text>
    </g>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
