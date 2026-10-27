export default function FinanzeScreen() {
  return (
    <>
      <section className="card c4" id="finanze-patrimonio"><h2>Patrimonio netto</h2>
        <div className="big num" style={{ textAlign: 'left' }}>€ 48.230</div><div className="muted">agg. 08:05 · EUR</div></section>
      <section className="card c8" id="finanze-categorie"><h2>Categorie</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr><td>Conto corrente</td><td className="muted">liquidità</td><td className="num">€ 12.400</td></tr>
          <tr><td>ETF</td><td className="muted">investito</td><td className="num">€ 36.800</td></tr>
          <tr><td>Carta di credito</td><td className="muted">debito</td><td className="num bad">− € 970</td></tr>
        </tbody></table></section>
      <section className="card c12" id="finanze-storico"><h2>Storico mensile</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr className="muted"><td>Mese</td><td className="num">Patrimonio</td><td className="num">Δ</td></tr>
          <tr><td>Ottobre</td><td className="num">€ 48.230</td><td className="num good">+ 1.240</td></tr>
          <tr><td>Settembre</td><td className="num">€ 46.990</td><td className="num bad">− 310</td></tr>
        </tbody></table></section>
    </>
  );
}
