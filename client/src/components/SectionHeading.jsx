export default function SectionHeading({ eyebrow, title, action }) {
  return <div className="section-heading"><div>{eyebrow && <span className="section-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action && <a href={action.href}>{action.label}</a>}</div>
}
