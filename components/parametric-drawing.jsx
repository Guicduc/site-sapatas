"use client";

const viewBox = "0 0 640 380";

export function ParametricDrawing({ format, values, activeKey, onSelectParameter }) {
  const type = format.drawingType;

  return (
    <div className="drawing-panel">
      <div className="drawing-toolbar">
        <div>
          <p className="eyebrow">Vista parametrica</p>
          <h2>{format.name}</h2>
        </div>
        <span>SVG placeholder para futura integração Grasshopper/3D</span>
      </div>
      <svg viewBox={viewBox} role="img" aria-label={`Vista cotada de ${format.name}`}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
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

  return (
    <>
      <rect className="part muted" x={320 - base / 2} y={260} width={base} height={support} rx="18" />
      <rect className="part" x={320 - diameter / 2} y={260 - insertion} width={diameter} height={insertion} rx="14" />
      <line className="cut-line" x1="190" x2="450" y1="260" y2="260" />
      <Dimension x1={320 - diameter / 2} y1={78} x2={320 + diameter / 2} y2={78} label={`${values.diametroInterno} mm`} paramKey="diametroInterno" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={320 - base / 2} y1={350} x2={320 + base / 2} y2={350} label={`${values.diametroBase} mm`} paramKey="diametroBase" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={460} y1={260 - insertion} x2={460} y2={260} label={`${values.profundidadeInsercao} mm`} paramKey="profundidadeInsercao" activeKey={activeKey} onSelect={onSelect} />
      <Dimension x1={510} y1={260} x2={510} y2={260 + support} label={`${values.alturaApoio} mm`} paramKey="alturaApoio" activeKey={activeKey} onSelect={onSelect} />
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
