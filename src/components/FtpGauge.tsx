import { gaugeFrac, gaugeGeometry, type Zone } from '../domain/zones';
import s from './FtpGauge.module.css';

const GEOMETRY = gaugeGeometry();

/** Velocímetro de %FTP: arco com as 5 zonas (a atual acesa), ponteiro e o % no centro. */
export function FtpGauge({ pct, zone }: { pct: number | null; zone: Zone | null }) {
  const deg = pct != null && zone != null ? gaugeFrac(pct, zone) * 180 : 0;
  return (
    <svg class={s.gauge} viewBox="-4 -8 208 114" role="img" aria-label="Percentual do FTP" data-testid="gauge">
      <g id="gaugeBands">
        {GEOMETRY.bands.map((b) => (
          <path
            key={b.zone}
            class={`${s.band} ${s[`z${b.zone}`]}${b.zone === zone ? ` ${s.on}` : ''}`}
            d={b.d}
            data-testid="gauge-band"
            data-zone={b.zone}
            data-on={b.zone === zone ? 'true' : undefined}
          />
        ))}
        {GEOMETRY.labels.map((l) => <text key={l.text} class={s.label} x={l.x} y={l.y}>{l.text}</text>)}
      </g>
      <text class={s.pct} x="100" y="100">
        <tspan id="ftpPct">{pct ?? '–'}</tspan>
        <tspan class={s.pctSign} dx="1">%</tspan>
      </text>
      <g
        class={pct == null ? `${s.pointer} ${s.off}` : s.pointer}
        id="gaugePtr"
        data-visible={pct == null ? 'false' : 'true'}
        style={{ transform: `rotate(${deg.toFixed(1)}deg)` }}
      >
        <polygon points="4,100 38,94 38,106" />
      </g>
    </svg>
  );
}
