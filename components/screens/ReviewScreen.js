export default function ReviewScreen() {
  return (
    <>
      <section className="card c6" id="review"><h2>Settimana che si chiude</h2>
        <b>Andato</b><ul><li>Contratto firmato</li><li>3 allenamenti su 3</li></ul>
        <b style={{ display: 'block', marginTop: 10 }}>Slittato</b><ul><li>Chiamata commercialista</li></ul></section>
      <section className="card c6" id="review-prossima"><h2>Le tre priorità della prossima</h2>
        <ol style={{ paddingLeft: 18, display: 'grid', gap: 4 }}><li>Chiudere preventivo Marco</li><li>Sistemare fatture</li><li>Lanciare PersonalOS</li></ol></section>
    </>
  );
}
