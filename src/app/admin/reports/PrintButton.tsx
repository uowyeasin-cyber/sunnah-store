'use client';
// Prints the whole report with every part opened.
export default function PrintButton() {
  return <button className="btn ghost sm" onClick={() => {
    const shut = [...document.querySelectorAll<HTMLDetailsElement>('details.rsec:not([open])')];
    shut.forEach(d => (d.open = true));
    const done = () => { shut.forEach(d => (d.open = false)); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done); window.print();
  }}>Print or save PDF (all)</button>;
}
