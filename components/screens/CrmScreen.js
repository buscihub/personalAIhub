export default function CrmScreen() {
  return (
    <section className="kanban" id="crm">
      <div className="col" id="crm-in-ritardo"><h2>In ritardo <span className="num">1</span></h2>
        <div className="item hot"><b>Richiamare commercialista</b><div className="muted">Studio Rossi</div><span className="pill hot">caldo</span></div></div>
      <div className="col" id="crm-oggi"><h2>Oggi <span className="num">2</span></h2>
        <div className="item warm"><b>Inviare preventivo</b><div className="muted">Marco</div><span className="pill warm">tiepido</span></div>
        <div className="item"><b>Prenotare dentista</b><div className="muted">—</div></div></div>
      <div className="col" id="crm-settimana"><h2>Questa settimana <span className="num">1</span></h2>
        <div className="item"><b>Regalo compleanno</b><div className="muted">Anna</div></div></div>
      <div className="col" id="crm-avanti"><h2>Più avanti <span className="num">1</span></h2>
        <div className="item"><b>Idea: corso di fotografia</b><div className="muted">—</div></div></div>
    </section>
  );
}
