import Abitudini from '../cards/Abitudini';
import Calendario from '../cards/Calendario';
import Operator from '../cards/Operator';
import Session from '../cards/Session';

export default function HomeScreen() {
  return (
    <>
      <Operator />
      <Session />
      <Calendario />
      <Abitudini />

      <section className="card c3" id="blocchi">
        <h2>Blocchi</h2>
        <ul>
          <li><span>Contratto · Marco</span><span className="num bad">9 g</span></li>
          <li><span>Fattura · Studio B</span><span className="num warn">4 g</span></li>
        </ul>
      </section>

      <section className="card c4" id="polso-finanziario">
        <h2>Polso finanziario</h2>
        <div className="big num" style={{ textAlign: 'left' }}>€ 48.230</div>
        <div className="good num" style={{ textAlign: 'left' }}>+ € 1.240 vs mese scorso</div>
        <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline fill="none" stroke="var(--good)" strokeWidth="1.6" points="0,24 15,22 30,20 45,21 60,15 75,12 100,6" />
        </svg>
      </section>

      <section className="card c4" id="nutrizione">
        <h2>Nutrizione</h2>
        <div className="row between"><span className="big num">1.420</span><span className="muted num">/ 2.200 kcal</span></div>
        <div className="bar"><i style={{ width: '64%' }} /></div>
        {[['Proteine', 70, '96 g'], ['Carbo', 55, '150 g'], ['Grassi', 48, '42 g']].map(([n, w, v]) => (
          <div className="macro" key={n}><span>{n}</span><div className="bar"><i style={{ width: `${w}%` }} /></div><span className="num">{v}</span></div>
        ))}
      </section>

      <section className="card c4" id="salute">
        <h2>Salute · 30 giorni</h2>
        <div className="trend">
          {[60, 75, 50, 80, 65, 70, 55, 90, 72, 68, 78, 62].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>media su <span className="num">22</span> giorni registrati: <span className="num">2.080</span> kcal</div>
      </section>

      <section className="card c6" id="obiettivi-settimana">
        <h2>Obiettivi · questa settimana</h2>
        <ul style={{ padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          <li>☑ Firmare contratto <span className="pill">fatto</span></li>
          <li>☐ 3 allenamenti <span className="num muted">2 di 3</span></li>
          <li>☐ Chiudere preventivo Marco</li>
        </ul>
      </section>

      <section className="card c6" id="obiettivi-mese">
        <h2>Obiettivi · questo mese</h2>
        <ul style={{ padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          <li>☐ Lanciare PersonalOS</li>
          <li>☐ Perdere 2 kg <span className="num muted">1,2 di 2</span></li>
        </ul>
      </section>
    </>
  );
}
