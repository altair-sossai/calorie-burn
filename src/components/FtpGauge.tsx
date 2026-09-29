import { gaugeFrac, gaugeGeometry, type Zone } from '../domain/zones';

const GEOMETRY = gaugeGeometry();

/** Velocímetro de %FTP: arco com as 5 zonas (a atual acesa), ponteiro e o % no centro. */
export function FtpGauge({ pct, zone }: { pct: number | null; zone: Zone | null }) {
  const deg = pct != null && zone != null ? gaugeFrac(pct, zone) * 180 : 0;
  return (
    <svg class="gauge" viewBox="-4 -8 208 114" role="img" aria-label="Percentual do FTP">
      <g id="gaugeBands">
        {GEOMETRY.bands.map((b) => <path key={b.zone} class={`band z${b.zone}${b.zone === zone ? ' on' : ''}`} d={b.d} />)}
        {GEOMETRY.labels.map((l) => <text key={l.text} class="lbl" x={l.x} y={l.y}>{l.text}</text>)}
      </g>
      <text class="num" x="100" y="100">
        <tspan id="ftpPct">{pct ?? '–'}</tspan>
        <tspan class="pc" dx="1">%</tspan>
      </text>
      <g class={pct == null ? 'ptr off' : 'ptr'} id="gaugePtr" style={{ transform: `rotate(${deg.toFixed(1)}deg)` }}>
        <polygon points="4,100 38,94 38,106" />
      </g>
    </svg>
  );
}
