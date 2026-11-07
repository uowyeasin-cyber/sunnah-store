import Link from 'next/link';

// Shown for a missing product, collection or page.
export default function NotFound() {
  return <div className="wrap view nf">
    <div className="kicker">404</div><h1>This page has <em>moved on</em></h1>
    <p className="muted">The link may be old, or the piece is no longer in the collection.</p>
    <div className="nf-go"><Link className="btn" href="/shop">Browse the collection</Link><Link className="btn ghost" href="/">Back to home</Link><Link className="btn ghost" href="/track">Track an order</Link></div>
  </div>;
}
