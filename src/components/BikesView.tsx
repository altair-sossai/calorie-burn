import { useRuntime } from '../app/context';
import { SIM_ID } from '../ble/simulator';
import { bikeName, isSim, type Notice as NoticeData } from '../state/store';
import { Icon } from './Icon';
import { StartButton } from './SetupView';

export function BikesView() {
  const { store, ble, scan } = useRuntime();
  const conn = store.connStatus();
  const detected = store.detectedNew();
  const mine = [...store.bikes].sort((a, b) => a - b);

  return (
    <div class="col" id="bikes">
      <div class="conn">
        <div class="hd">
          <span class="t"><Icon name="bluetooth" class="sm" /> Buscar</span>
          <span class={conn.on ? 'pill on' : 'pill'} id="connPill">{conn.text}</span>
        </div>
        {ble.scanMode === 'all' ? (
          <button class="btn ghost" id="scan" disabled><Icon name="bluetooth_searching" /> Ouvindo…</button>
        ) : ble.scanMode === 'device' ? (
          <button class="btn ghost" id="scan" onClick={scan}><Icon name="add" /> Adicionar outra</button>
        ) : (
          <button class="btn ghost" id="scan" onClick={scan}><Icon name="bluetooth_searching" /> Buscar bike</button>
        )}
        {detected.length ? (
          <div class="biklist" id="detectedList">
            {detected.map((d) => (
              <div class="bik" key={d.id}>
                <div class="l">
                  <Icon name="directions_bike" />
                  <span class="name">Bike {d.id}<small>{Math.round(d.rpm)} rpm</small></span>
                </div>
                <button class="iconbtn" data-act="add" aria-label={`Adicionar Bike ${d.id}`} onClick={() => store.addBike(d.id)}>
                  <Icon name="add_circle" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div class="emptyscan" id="scanHint">
            Selecione M3 na janela Bluetooth e continue pedalando. As bikes detectadas aparecem aqui; toque em + pra adicionar.
          </div>
        )}
      </div>

      {store.notice && <Notice notice={store.notice} />}

      {!store.bikes.length && (
        <p class="emptyscan" id="bikeEmpty">Nenhuma bike sua cadastrada ainda — toque em "Buscar bike" e depois em + pra adicionar.</p>
      )}
      <div class="biklist" id="bikeList">
        {mine.map((id) => <BikeRow key={id} id={id} deletable />)}
        <BikeRow id={SIM_ID} />
      </div>

      <StartButton id="startBtnBikes" />
    </div>
  );
}

function BikeRow({ id, deletable }: { id: number; deletable?: boolean }) {
  const { store } = useRuntime();
  const sel = store.cfg.chosen === id;
  return (
    <div class={sel ? 'bik sel' : 'bik'}>
      <div class="l" onClick={() => store.selectBike(id)}>
        <Icon name={isSim(id) ? 'science' : 'directions_bike'} />
        <span class="name">{bikeName(id)}</span>
      </div>
      {deletable && (
        <button class="iconbtn" data-act="del" aria-label={`Excluir ${bikeName(id)}`} onClick={(e) => { e.stopPropagation(); store.deleteBike(id); }}>
          <Icon name="delete" class="sm" />
        </button>
      )}
      {sel && <Icon name="check_circle" class="selic" />}
    </div>
  );
}

const NO_BLE = (
  <>
    Este navegador não tem <b>Web Bluetooth</b>. No <b>iPhone</b>, abra este app no navegador <b>Bluefy</b> (grátis na App Store) — Safari e
    Chrome do iOS não suportam. No <b>Android/PC</b>, use o <b>Chrome</b>. A página precisa estar em <b>HTTPS</b>.
  </>
);

function Notice({ notice }: { notice: NoticeData }) {
  if (notice.kind === 'noBle') return <div class="notice" id="notice">{NO_BLE}</div>;
  return (
    <div class="notice" id="notice">
      <b>Erro Bluetooth ({notice.name})</b>
      <br />
      {notice.message}
      <br />
      <br />
      {notice.hasBle ? (
        <>
          O Web Bluetooth está ativo, mas a busca falhou. No iPhone, confirme que a página foi aberta dentro do <b>Bluefy</b>, que o Bluetooth
          está ligado e que a bike está sendo pedalada.
        </>
      ) : (
        NO_BLE
      )}
    </div>
  );
}
