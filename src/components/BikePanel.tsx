import { useRuntime } from '../app/context';
import { fmtClassTime } from '../domain/classTime';
import { ftpPercent, ftpZone } from '../domain/zones';
import { bikeName, isSim } from '../state/store';
import s from './BikePanel.module.css';
import { FtpGauge } from './FtpGauge';
import { Icon } from './Icon';

export function BikePanel() {
  const { store, scan } = useRuntime();
  const { chosen, ftp } = store.cfg;
  // rpm/watts/%FTP são instantâneos: só viram traço depois de HOLD_MS sem sinal (falhas curtas mantêm o último valor)
  const live = store.showBike();
  const pct = live ? ftpPercent(store.live.watts, ftp) : null;
  const zone = pct == null ? null : ftpZone(pct);
  const t = store.classMin();

  return (
    <div class={s.panel} id="bikepanel" data-zone={zone ?? undefined}>
      <div class={s.hd}>
        <span class={s.title}><Icon name="directions_bike" class="sm" /> <span class={s.name} id="bikeName">{chosen != null ? bikeName(chosen) : 'Sem bike'}</span></span>
        <span class={s.status} data-testid="panel-status">
          {t != null && <span class={s.ctime} id="classTime" title="Tempo da aula"><Icon name="schedule" class="sm" />{fmtClassTime(t)}</span>}
          {zone != null && <span class={s.zone} id="zone">Zona {zone}</span>}
          {!live && chosen != null && <span class={s.nosig} id="nosig"><Icon name="sensors_off" class="sm" /> sem sinal</span>}
        </span>
      </div>
      {/* em cima o que o instrutor pede (zona e giro, na ordem do telão); embaixo o resultado, com a kcal colada nos marcos */}
      <div class={ftp > 0 ? `${s.headline} ${s.wide}` : s.headline}>
        {ftp > 0 && (
          <div class={s.ftp} id="ftpBox">
            <FtpGauge pct={pct} zone={zone} />
            <div class={s.unit}>do FTP</div>
          </div>
        )}
        <div class={s.rpm} data-testid="rpm-box">
          <div class={s.value}><Icon name="autorenew" class={s.icon} /><span id="rpm">{live ? Math.round(store.live.rpm) : '–'}</span></div>
          <div class={s.unit}>rpm</div>
        </div>
      </div>
      <div class={s.stats}>
        <div class={`${s.stat} ${s.kcal}`}>
          <div class={s.value}><Icon name="local_fire_department" class={s.icon} /><span id="kcal">{Math.round(store.live.kcal)}</span></div>
          <div class={s.unit}>kcal agora</div>
        </div>
        <div class={`${s.stat} ${s.watts}`}>
          <div class={s.value}><Icon name="bolt" class={s.icon} /><span id="watts">{live ? Math.round(store.live.watts) : '–'}</span></div>
          <div class={s.unit}>watts</div>
        </div>
      </div>
      {!live && chosen != null && !isSim(chosen) && (
        <button class={`btn ghost ${s.reconnect}`} id="reconnect" onClick={scan}><Icon name="bluetooth_searching" /> Reconectar bike</button>
      )}
    </div>
  );
}
