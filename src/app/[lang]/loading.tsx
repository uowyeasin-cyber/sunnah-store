// Shown while a storefront page loads: the page's shape in soft grey, no spinner.
export default function Loading() {
  return <div className="wrap view skel" aria-busy="true" aria-label="Loading">
    <div className="sk sk-title" /><div className="sk sk-line" />
    <div className="grid">{Array.from({ length: 4 }, (_, i) => <div key={i}><div className="sk sk-card" /><div className="sk sk-line" /></div>)}</div>
  </div>;
}
