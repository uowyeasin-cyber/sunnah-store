// Questions and answers, open one at a time without script.
export default function Faq({ title, items }: { title: string; items: { q: string; a: React.ReactNode }[] }) {
  return <section className="faq"><h2>{title}</h2>{items.map((i, n) => <details key={n} name="faq"><summary>{i.q}</summary><div>{i.a}</div></details>)}</section>;
}
