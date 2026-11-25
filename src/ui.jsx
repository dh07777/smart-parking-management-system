import { useState } from 'react'
export const Modal = ({ title, onClose, children }) => <div className="overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><div className="row between"><h3>{title}</h3><button className="btn ghost sm" onClick={onClose}>✕</button></div>{children}</div></div>
export const Field = ({ label, error, children }) => <label className="field"><span>{label}</span>{children}{error && <em>{error}</em>}</label>
export const Empty = ({ text }) => <div className="empty">🅿️<p>{text}</p></div>
export const Stat = ({ label, value, sub }) => <div className="card stat"><small>{label}</small><b>{value}</b><span>{sub}</span></div>
export function Bars({ data, fmtv = v => v }) {
  const [h, setH] = useState(null), max = Math.max(1, ...data.map(d => d.value)), w = 400 / Math.max(1, data.length)
  return <div className="chart"><svg viewBox="0 0 400 170">{data.map((d, i) => {
    const bh = d.value / max * 125; return <g key={i} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)}>
      <rect x={i * w + w * .15} y={135 - bh} width={w * .7} height={bh} rx="4" className={h === i ? 'bar on' : 'bar'} />
      <text x={i * w + w / 2} y="155" textAnchor="middle" className="ax">{d.label}</text></g>
  })}
    {h !== null && <text x="200" y="14" textAnchor="middle" className="tip">{data[h].label}: {fmtv(data[h].value)}</text>}</svg></div>
}
export function Donut({ parts }) {
  const [h, setH] = useState(null), tot = parts.reduce((a, p) => a + p.v, 0) || 1; let off = 0
  return <div className="donut"><svg viewBox="0 0 42 42">{parts.map((p, i) => { const len = p.v / tot * 100, el = <circle key={i} r="15.9" cx="21" cy="21" fill="none" stroke={p.c} strokeWidth={h === i ? 6 : 4.5} strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={25 - off} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)} />; off += len; return el })}
    <text x="21" y="22.5" textAnchor="middle" className="dn">{h !== null ? parts[h].v : tot}</text></svg>
    <ul>{parts.map((p, i) => <li key={i}><i style={{ background: p.c }} />{p.n} <b>{p.v}</b></li>)}</ul></div>
}
