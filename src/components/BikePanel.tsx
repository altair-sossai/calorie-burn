import { useRuntime } from '../app/context';
import { fmtClassTime } from '../domain/classTime';
import { ftpPercent, ftpZone } from '../domain/zones';
import { bikeName, isSim } from '../state/store';
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
    <div class="bikepanel" id="bikepanel" data-zone={zone ?? undefined}>
      <div class="hd">
        <span class="t"><Icon name="directions_bike" class="sm" /> <span id="bikeName">{chosen != null ? bikeName(chosen) : 'Sem bike'}</span></span>
        <span class="r">
          {t != null && <span class="ctime" id="classTime" title="Tempo da aula"><Icon name="schedule" class="sm" />{fmtClassTime(t)}</span>}
          {zone != null && <span class="zone" id="zone">Zona {zone}</span>}
          {!live && chosen != null && <span class="nosig" id="nosig"><Icon name="sensors_off" class="sm" /> sem sinal</span>}
        </span>
      </div>
      {/* em cima o que o instrutor pede (zona e giro, na ordem do telão); embaixo o resultado, com a kcal colada nos marcos */}
      <div class={ftp > 0 ? 'headline wide' : 'headline'}>
        {ftp > 0 && (
          <div class="ftpnow" id="ftpBox">
            <FtpGauge pct={pct} zone={zone} />
            <div class="u">do FTP</div>
          </div>
        )}
        <div class="rpmnow">
          <div class="v"><Icon name="autorenew" class="vi" /><span id="rpm">{live ? Math.round(store.live.rpm) : '–'}</span></div>
          <div class="u">rpm</div>
        </div>
      </div>
      <div class="stats">
        <div class="stat kcal">
          <div class="v"><Icon name="local_fire_department" class="vi" /><span id="kcal">{Math.round(store.live.kcal)}</span></div>
          <div class="u">kcal agora</div>
        </div>
        <div class="stat watts">
          <div class="v"><Icon name="bolt" class="vi" /><span id="watts">{live ? Math.round(store.live.watts) : '–'}</span></div>
          <div class="u">watts</div>
        </div>
      </div>
      {!live && chosen != null && !isSim(chosen) && (
        <button class="btn ghost reconnect" id="reconnect" onClick={scan}><Icon name="bluetooth_searching" /> Reconectar bike</button>
      )}
    </div>
  );
}
