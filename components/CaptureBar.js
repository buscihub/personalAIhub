'use client';

export default function CaptureBar() {
  return (
    <div id="capturebar">
      <div className="box">
        <button className="mic" aria-label="Microfono">🎤</button>
        <input placeholder="Dì o scrivi qualcosa… (a riposo)" />
        <button>Invia</button>
      </div>
    </div>
  );
}
