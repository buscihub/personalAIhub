import Obiettivi from '../cards/Obiettivi';
import Salute from '../cards/Salute';
import Nutrizione from '../cards/Nutrizione';
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
      <Nutrizione />
      <Salute />
      <Obiettivi />
    </>
  );
}
