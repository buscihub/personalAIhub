import Polso from '../cards/Polso';
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
      <Polso />
      <Nutrizione />
      <Salute />
      <Obiettivi />
    </>
  );
}
