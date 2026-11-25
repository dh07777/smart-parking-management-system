import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp, uid, money, fmt, H, D, occ, price } from './store.jsx'
import { Modal, Field, Empty, Stat, Bars, Donut } from './ui.jsx'

function Auth() {
  const { db, up, toast, notify } = useApp(), [m, setM] = useState('login'), [f, setF] = useState({ name: '', email: '', password: '' }), [er, setEr] = useState({})
  const s = k => e => setF({ ...f, [k]: e.target.value })
  const go = e => {
    e.preventDefault(); const x = {}; if (m === 'register' && f.name.trim().length < 2) x.name = 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email.'
    if (m !== 'forgot' && f.password.length < 6) x.password = 'Use at least 6 characters.'
    setEr(x); if (Object.keys(x).length) return
    if (m === 'forgot') return toast('Reset link sent (simulated) to ' + f.email)
    if (m === 'login') { const u = db.users.find(u => u.email === f.email && u.password === f.password); if (!u) return setEr({ password: 'Email or password is incorrect.' }); if (u.suspended) return setEr({ password: 'This account is suspended. Contact an admin.' }); up(d => ({ ...d, session: u.id }), `${u.name} signed in`) }
    else { if (db.users.some(u => u.email === f.email)) return setEr({ email: 'This email is already registered.' }); const u = { id: uid('U'), name: f.name, email: f.email, password: f.password, role: 'user', phone: '' }; up(d => ({ ...d, users: [...d.users, u], session: u.id }), `${u.name} registered`); notify('Account created. Welcome!') }
  }
  return <div className="auth"><div className="hero"><h1>ParkEase</h1><p>Find, reserve and pay for parking in seconds. Manage every slot in real time.</p></div>
    <form className="card authcard" onSubmit={go} noValidate><h2>{m === 'login' ? 'Sign in' : m === 'register' ? 'Create account' : 'Reset password'}</h2>
      {m === 'register' && <Field label="Full name" error={er.name}><input value={f.name} onChange={s('name')} /></Field>}
      <Field label="Email" error={er.email}><input value={f.email} onChange={s('email')} /></Field>
      {m !== 'forgot' && <Field label="Password" error={er.password}><input type="password" value={f.password} onChange={s('password')} /></Field>}
      <button className="btn full">{m === 'login' ? 'Sign in' : m === 'register' ? 'Create account' : 'Send reset link'}</button>
      {m === 'login' && <><div className="row"><button type="button" className="btn ghost sm" onClick={() => setF({ ...f, email: 'admin@parkease.com', password: 'admin123' })}>Demo admin</button><button type="button" className="btn ghost sm" onClick={() => setF({ ...f, email: 'user@parkease.com', password: 'user123' })}>Demo driver</button></div><a onClick={() => setM('forgot')}>Forgot password?</a></>}
      <a onClick={() => { setM(m === 'login' ? 'register' : 'login'); setEr({}) }}>{m === 'login' ? 'New here? Create an account' : 'Back to sign in'}</a></form></div>
}

function Dashboard() {
  const { db, me } = useApp(), nav = useNavigate(), S = db.slots, c = k => S.filter(s => s.status === k).length
  const pct = Math.round((c('occupied') + c('reserved')) / S.length * 100), mine = me.role === 'admin' ? db.bookings : db.bookings.filter(b => b.user === me.id)
  const rev = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * D); return { label: d.toLocaleDateString([], { weekday: 'short' }), value: +mine.filter(b => b.status !== 'cancelled' && new Date(b.created).toDateString() === d.toDateString()).reduce((a, b) => a + b.amount, 0).toFixed(2) } })
  const near = S.filter(s => s.status === 'available').sort((a, b) => a.floor - b.floor || a.no.localeCompare(b.no))[0], ev = S.filter(s => s.kind === 'EV' && s.status === 'available').length
  const hr = new Date().getHours(), pred = hr >= 7 && hr <= 10 || hr >= 16 && hr <= 19 ? 'Peak hours: expect 85–95% occupancy.' : 'Off-peak: occupancy forecast to stay under 60%.'
  return <><h2>Hello, {me.name.split(' ')[0]} 👋</h2><div className="grid4">
    <Stat label="Total spaces" value={S.length} sub={db.locations.length + ' locations'} /><Stat label="Available" value={c('available')} sub={`${100 - pct}% free`} /><Stat label="Occupied" value={c('occupied')} sub="live" /><Stat label="Reserved" value={c('reserved')} sub="upcoming" /></div>{me.role === 'admin' && <div className="grid4"><Stat label="Total revenue" value={money(db.bookings.filter(b => b.status !== 'cancelled').reduce((a, b) => a + b.amount, 0))} sub="all time" /><Stat label="Customers" value={db.users.filter(u => u.role === 'user').length} sub="registered" /><Stat label="Active bookings" value={db.bookings.filter(b => b.status === 'active').length} sub="now" /><Stat label="Pending alerts" value={db.notifs.filter(n => !n.read).length} sub="unread" /></div>}
    <div className="grid2"><div className="card"><h3>Revenue – last 7 days</h3><Bars data={rev} fmtv={money} /><small>Total {money(rev.reduce((a, r) => a + r.value, 0))}</small></div>
      <div className="card"><h3>Occupancy {pct}%</h3><Donut parts={[{ n: 'Available', v: c('available'), c: '#2f7bff' }, { n: 'Occupied', v: c('occupied'), c: '#0a1a3a' }, { n: 'Reserved', v: c('reserved'), c: '#f5a524' }]} /></div></div>
    <div className="grid2"><div className="card"><h3>Smart insights</h3><p>🔮 {pred}</p><p>📍 Nearest free slot: <b>{near ? `${near.no} · ${db.locations.find(l => l.id === near.loc).name}` : 'none'}</b> {near && <button className="btn sm" onClick={() => nav('/book?slot=' + near.id)}>Book</button>}</p><p>🔌 EV charging free: <b>{ev}</b></p><p>💲 Dynamic pricing: {db.locations.map(l => `${l.name} ×${price(db, l.id, 1).surge}`).join(' · ')}</p></div>
      <div className="card"><h3>Live activity</h3><ul className="feed">{db.logs.filter(l => l.kind === 'live').slice(0, 6).map(l => <li key={l.id}><i className="pulse" />{l.text}<small>{new Date(l.t).toLocaleTimeString()}</small></li>)}{!db.logs.some(l => l.kind === 'live') && <Empty text="Waiting for live activity…" />}</ul></div></div></>
}

function Slots() {
  const { db } = useApp(), nav = useNavigate(), [sp] = useSearchParams(), [loc, setLoc] = useState('L1'), [fl, setFl] = useState(1), [kind, setKind] = useState('All'), [q, setQ] = useState(sp.get('q') || '')
  const list = db.slots.filter(s => (q ? s.no.toLowerCase().includes(q.toLowerCase()) : s.loc === loc && s.floor === fl) && (kind === 'All' || s.kind === kind))
  return <><h2>Parking layout</h2><div className="card row wrap"><select value={loc} onChange={e => setLoc(e.target.value)}>{db.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
    <select value={fl} onChange={e => setFl(+e.target.value)}>{[1, 2, 3].map(f => <option key={f} value={f}>Floor {f}</option>)}</select>
    <select value={kind} onChange={e => setKind(e.target.value)}>{['All', 'Regular', 'EV', 'Disabled'].map(k => <option key={k}>{k}</option>)}</select>
    <input placeholder="Search slot e.g. F1-03" value={q} onChange={e => setQ(e.target.value)} /></div>
    <div className="legend"><span className="s available">Available</span><span className="s occupied">Occupied</span><span className="s reserved">Reserved</span><span>⚡ EV  ♿ Disabled</span></div>
    {list.length ? <div className="slots">{list.map(s => <button key={s.id} className={'slot ' + s.status} disabled={s.status !== 'available'} onClick={() => nav('/book?slot=' + s.id)}>{s.kind === 'EV' ? '⚡' : s.kind === 'Disabled' ? '♿' : '🚗'}<b>{s.no}</b><small>{s.status}</small></button>)}</div> : <Empty text="No slots match your filters." />}</>
}

function Receipt({ b, onClose }) {
  const { db } = useApp(), l = db.locations.find(x => x.id === b.loc), s = db.slots.find(x => x.id === b.slot)
  return <Modal title={'Receipt ' + b.id} onClose={onClose}><div className="receipt"><p><b>Location:</b> {l?.name}</p><p><b>Slot:</b> {s?.no}</p><p><b>Vehicle:</b> {b.vehicle}</p><p><b>From:</b> {fmt(b.start)}</p><p><b>To:</b> {fmt(b.end)}</p><p><b>Paid via:</b> {b.method}{b.coupon && ` · coupon ${b.coupon}`}</p><h3>{money(b.amount)}</h3></div><button className="btn" onClick={() => window.print()}>Print receipt</button></Modal>
}

function Book() {
  const { db, me, book, cancel, extend, confirm, toast } = useApp(), [sp] = useSearchParams(), pre = db.slots.find(s => s.id === sp.get('slot'))
  const veh = db.vehicles.filter(v => v.user === me.id), loc0 = pre?.loc || 'L1'
  const [f, setF] = useState({ loc: loc0, floor: pre?.floor || 1, slot: pre?.id || '', vehicle: veh[0]?.reg || '', start: new Date(Date.now() + 36e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16), hours: 2, code: '', method: 'Card' })
  const [done, setDone] = useState(null), [rc, setRc] = useState(null), [er, setEr] = useState(''), set = k => e => setF({ ...f, [k]: e.target.value })
  const avail = db.slots.filter(s => s.loc === f.loc && s.floor === +f.floor && s.status !== 'occupied' || s.id === f.slot && s.loc === f.loc), p = price(db, f.loc, +f.hours || 1, f.code)
  const submit = e => {
    e.preventDefault(); if (!veh.length) return setEr('Add a vehicle first (Vehicles page).'); const h = +f.hours; if (!f.slot) return setEr('Choose a slot.'); if (!(h >= 1 && h <= 72)) return setEr('Duration must be 1–72 hours.')
    const r = book({ slot: f.slot, vehicle: f.vehicle, start: new Date(f.start).getTime(), hours: h, code: f.code, method: f.method }); if (typeof r === 'string') return setEr(r); setEr(''); setDone(r); toast('Booking confirmed')
  }
  const mine = db.bookings.filter(b => b.user === me.id)
  return <><h2>Reserve parking</h2><div className="grid2"><form className="card" onSubmit={submit}>
    <Field label="Location"><select value={f.loc} onChange={e => setF({ ...f, loc: e.target.value, slot: '' })}>{db.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
    <Field label="Floor"><select value={f.floor} onChange={e => setF({ ...f, floor: e.target.value, slot: '' })}>{[1, 2, 3].map(x => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Slot"><select value={f.slot} onChange={set('slot')}><option value="">Select…</option>{avail.map(s => <option key={s.id} value={s.id}>{s.no} · {s.kind} · {s.status}</option>)}</select></Field>
    <Field label="Vehicle"><select value={f.vehicle} onChange={set('vehicle')}>{veh.map(v => <option key={v.id} value={v.reg}>{v.reg} – {v.model}</option>)}</select></Field>
    <div className="row"><Field label="Start"><input type="datetime-local" value={f.start} onChange={set('start')} /></Field><Field label="Hours"><input type="number" value={f.hours} onChange={set('hours')} /></Field></div>
    <div className="row"><Field label="Coupon"><input value={f.code} onChange={set('code')} placeholder="SAVE10" /></Field><Field label="Payment"><select value={f.method} onChange={set('method')}>{['Card', 'UPI', 'Wallet', 'Cash at gate'].map(m => <option key={m}>{m}</option>)}</select></Field></div>
    {er && <p className="err">{er}</p>}<p className="est">Estimated: <b>{money(p.total)}</b> {p.surge !== 1 && <small>(dynamic ×{p.surge})</small>} {p.coupon && <small>–{p.coupon.pct}% coupon</small>}</p><button className="btn full">Confirm booking</button></form>
    <div className="card"><h3>My bookings</h3>{mine.length ? <div className="list">{mine.map(b => <div key={b.id} className="item"><div><b>{b.id}</b> <span className={'tag ' + b.status}>{b.status}</span><br /><small>{db.slots.find(s => s.id === b.slot)?.no} · {fmt(b.start)} → {fmt(b.end)}</small></div><div className="row"><button className="btn ghost sm" onClick={() => setRc(b)}>Receipt</button>{b.status === 'active' && <><button className="btn ghost sm" onClick={() => extend(b.id, 1)}>+1h</button><button className="btn danger sm" onClick={() => confirm('Cancel booking ' + b.id + '?', () => cancel(b.id))}>Cancel</button></>}</div></div>)}</div> : <Empty text="No bookings yet. Reserve your first slot." />}</div></div>
    {done && <Modal title="Booking confirmed 🎉" onClose={() => setDone(null)}><p>Your booking ID is <b>{done.id}</b>.</p><button className="btn" onClick={() => { setRc(done); setDone(null) }}>View receipt</button></Modal>}{rc && <Receipt b={rc} onClose={() => setRc(null)} />}</>
}

function Vehicles() {
  const { db, me, up, confirm, toast } = useApp(), [ed, setEd] = useState(null), [er, setEr] = useState({}), list = db.vehicles.filter(v => v.user === me.id)
  const save = e => {
    e.preventDefault(); const x = {}; if (!/^[A-Z0-9-]{4,10}$/i.test(ed.reg)) x.reg = 'Use 4–10 letters, numbers or dashes.'; if (ed.model.trim().length < 2) x.model = 'Enter the model.'
    if (db.vehicles.some(v => v.reg.toLowerCase() === ed.reg.toLowerCase() && v.id !== ed.id)) x.reg = 'This registration already exists.'; setEr(x); if (Object.keys(x).length) return
    up(d => ({ ...d, vehicles: ed.id ? d.vehicles.map(v => v.id === ed.id ? ed : v) : [...d.vehicles, { ...ed, id: uid('V'), user: me.id, reg: ed.reg.toUpperCase() }] }), 'Saved vehicle ' + ed.reg); toast('Vehicle saved'); setEd(null)
  }
  return <><div className="row between"><h2>My vehicles</h2><button className="btn" onClick={() => { setEr({}); setEd({ reg: '', type: 'Car', model: '' }) }}>Add vehicle</button></div>
    {list.length ? <div className="grid3">{list.map(v => <div key={v.id} className="card"><h3>{v.reg}</h3><p>{v.model} · {v.type}</p><div className="row"><button className="btn ghost sm" onClick={() => { setEr({}); setEd(v) }}>Edit</button><button className="btn danger sm" onClick={() => confirm('Delete ' + v.reg + '?', () => up(d => ({ ...d, vehicles: d.vehicles.filter(x => x.id !== v.id) }), 'Deleted vehicle ' + v.reg))}>Delete</button></div></div>)}</div> : <Empty text="No vehicles yet. Add one to start booking." />}
    {ed && <Modal title={ed.id ? 'Edit vehicle' : 'Add vehicle'} onClose={() => setEd(null)}><form onSubmit={save}><Field label="Registration number" error={er.reg}><input value={ed.reg} onChange={e => setEd({ ...ed, reg: e.target.value })} /></Field><Field label="Type"><select value={ed.type} onChange={e => setEd({ ...ed, type: e.target.value })}>{['Car', 'Bike', 'SUV', 'EV'].map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Make & model" error={er.model}><input value={ed.model} onChange={e => setEd({ ...ed, model: e.target.value })} /></Field><button className="btn full">Save vehicle</button></form></Modal>}</>
}

function Payments() {
  const { db, me } = useApp(), [rc, setRc] = useState(null), list = db.bookings.filter(b => (me.role === 'admin' || b.user === me.id) && b.status !== 'cancelled')
  return <><h2>Payments</h2><div className="card"><h3>Pricing</h3><div className="row wrap">{db.locations.map(l => <span key={l.id} className="tag">{l.name}: {money(l.rate)}/h · {money(l.day)}/day</span>)}</div></div>
    <div className="card"><h3>Transactions</h3>{list.length ? <div className="scroll"><table><thead><tr><th>ID</th><th>Date</th><th>Method</th><th>Amount</th><th /></tr></thead><tbody>{list.slice(0, 40).map(b => <tr key={b.id}><td>{b.id}</td><td>{fmt(b.created)}</td><td>{b.method}</td><td>{money(b.amount)}</td><td><button className="btn ghost sm" onClick={() => setRc(b)}>Receipt</button></td></tr>)}</tbody></table></div> : <Empty text="No transactions yet." />}</div>{rc && <Receipt b={rc} onClose={() => setRc(null)} />}</>
}

function Reports() {
  const { db } = useApp(), [per, setPer] = useState('daily'), B = db.bookings.filter(b => b.status !== 'cancelled')
  const n = { daily: 7, weekly: 4, monthly: 6 }[per], step = { daily: D, weekly: 7 * D, monthly: 30 * D }[per]
  const data = Array.from({ length: n }, (_, i) => { const e = Date.now() - (n - 1 - i) * step, s = e - step; return { label: per === 'daily' ? new Date(e).toLocaleDateString([], { weekday: 'short' }) : `${per === 'weekly' ? 'W' : 'M'}${i + 1}`, value: +B.filter(b => b.created > s && b.created <= e).reduce((a, b) => a + b.amount, 0).toFixed(2), count: B.filter(b => b.created > s && b.created <= e).length } })
  const csv = () => { const rows = [['ID', 'User', 'Slot', 'Start', 'End', 'Status', 'Amount'], ...db.bookings.map(b => [b.id, b.user, b.slot, new Date(b.start).toISOString(), new Date(b.end).toISOString(), b.status, b.amount])]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })); a.download = 'parkease-report.csv'; a.click() }
  return <><div className="row between wrap"><h2>Reports</h2><div className="row"><select value={per} onChange={e => setPer(e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><button className="btn" onClick={csv}>Download CSV</button><button className="btn ghost" onClick={() => window.print()}>Print</button></div></div>
    <div className="grid2"><div className="card"><h3>Revenue ({per})</h3><Bars data={data} fmtv={money} /></div><div className="card"><h3>Bookings ({per})</h3><Bars data={data.map(d => ({ label: d.label, value: d.count }))} /></div></div>
    <div className="card"><h3>Occupancy by location</h3>{db.locations.map(l => <div key={l.id} className="meter"><span>{l.name}</span><div><i style={{ width: Math.round(occ(db, l.id) * 100) + '%' }} /></div><b>{Math.round(occ(db, l.id) * 100)}%</b></div>)}</div></>
}

function Admin() {
  const { db, up, confirm, toast, cancel } = useApp(), [tab, setTab] = useState('locations'), [c, setC] = useState({ code: '', pct: 10 }), [l, setL] = useState({ name: '', rate: 3, day: 20 }), [sl, setSl] = useState({ loc: 'L1', floor: 1, no: '', kind: 'Regular' }), [sf, setSf] = useState('L1')
  const addL = e => {
    e.preventDefault(); if (l.name.trim().length < 3 || +l.rate <= 0 || +l.day <= 0) return toast('Enter a name and positive prices.', 'err')
    const id = uid('L'); up(d => ({ ...d, locations: [...d.locations, { id, name: l.name, rate: +l.rate, day: +l.day }], slots: [...d.slots, ...Array.from({ length: 8 }, (_, i) => ({ id: `${id}-F1-${i + 1}`, loc: id, floor: 1, no: `F1-0${i + 1}`, kind: i < 1 ? 'EV' : 'Regular', status: 'available' }))] }), 'Added location ' + l.name); setL({ name: '', rate: 3, day: 20 })
  }
  const addS = e => {
    e.preventDefault(); const no = sl.no.trim().toUpperCase(); if (!/^F\d-\d{2}$/.test(no)) return toast('Slot number format: F1-13', 'err'); if (+no[1] !== +sl.floor) return toast('Slot number must start with F' + sl.floor, 'err')
    if (db.slots.some(s => s.loc === sl.loc && s.no === no)) return toast('That slot number already exists here.', 'err')
    up(d => ({ ...d, slots: [...d.slots, { id: `${sl.loc}-${no}-${uid('')}`, loc: sl.loc, floor: +sl.floor, no, kind: sl.kind, status: 'available' }] }), 'Added slot ' + no); setSl({ ...sl, no: '' }); toast('Slot added')
  }
  const delS = s => db.bookings.some(b => b.slot === s.id && b.status === 'active') ? toast('Cancel its active bookings first.', 'err') : confirm('Delete slot ' + s.no + '?', () => up(d => ({ ...d, slots: d.slots.filter(x => x.id !== s.id) }), 'Deleted slot ' + s.no))
  const delU = u => db.bookings.some(b => b.user === u.id && b.status === 'active') ? toast('Cancel this customer\'s active bookings first.', 'err') : confirm('Delete ' + u.name + ' and their vehicles?', () => up(d => ({ ...d, users: d.users.filter(x => x.id !== u.id), vehicles: d.vehicles.filter(v => v.user !== u.id) }), 'Deleted customer ' + u.name))
  const addC = e => { e.preventDefault(); if (!/^[A-Z0-9]{4,12}$/i.test(c.code) || c.pct < 1 || c.pct > 90) return toast('Code: 4–12 letters/numbers; discount 1–90%.', 'err'); up(d => ({ ...d, coupons: [...d.coupons, { code: c.code.toUpperCase(), pct: +c.pct, active: true }] }), 'Added coupon ' + c.code); setC({ code: '', pct: 10 }) }
  return <><h2>Admin</h2><div className="row wrap">{['locations', 'slots', 'reservations', 'customers', 'pricing', 'discounts'].map(t => <button key={t} className={'btn sm ' + (tab === t ? '' : 'ghost')} onClick={() => setTab(t)}>{t}</button>)}</div><div className="card">
    {tab === 'locations' && <><form className="row wrap" onSubmit={addL}><input placeholder="New location name" value={l.name} onChange={e => setL({ ...l, name: e.target.value })} /><button className="btn">Add location</button></form>{db.locations.map(x => <div key={x.id} className="item"><input style={{ flex: 1 }} value={x.name} onChange={e => up(d => ({ ...d, locations: d.locations.map(y => y.id === x.id ? { ...y, name: e.target.value } : y) }))} /><button className="btn danger sm" onClick={() => confirm('Delete ' + x.name + ' and its slots?', () => up(d => ({ ...d, locations: d.locations.filter(y => y.id !== x.id), slots: d.slots.filter(s => s.loc !== x.id), bookings: d.bookings.map(b => b.loc === x.id && b.status === 'active' ? { ...b, status: 'cancelled' } : b) }), 'Deleted location ' + x.name))}>Delete</button></div>)}</>}
    {tab === 'slots' && <><form className="row wrap" onSubmit={addS}><select value={sl.loc} onChange={e => setSl({ ...sl, loc: e.target.value })}>{db.locations.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={sl.floor} onChange={e => setSl({ ...sl, floor: e.target.value })}>{[1, 2, 3].map(f => <option key={f}>{f}</option>)}</select><input placeholder="F1-13" value={sl.no} onChange={e => setSl({ ...sl, no: e.target.value })} /><select value={sl.kind} onChange={e => setSl({ ...sl, kind: e.target.value })}>{['Regular', 'EV', 'Disabled'].map(k => <option key={k}>{k}</option>)}</select><button className="btn">Add slot</button></form>
      <select value={sf} onChange={e => setSf(e.target.value)}>{db.locations.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><div className="scroll"><table><tbody>{db.slots.filter(s => s.loc === sf).map(s => <tr key={s.id}><td>{s.no}</td><td><select value={s.kind} onChange={e => up(d => ({ ...d, slots: d.slots.map(x => x.id === s.id ? { ...x, kind: e.target.value } : x) }), `Changed ${s.no} to ${e.target.value}`)}>{['Regular', 'EV', 'Disabled'].map(k => <option key={k}>{k}</option>)}</select></td><td><span className={'tag ' + s.status}>{s.status}</span></td><td><div className="row"><button className="btn ghost sm" disabled={s.status === 'reserved'} onClick={() => up(d => ({ ...d, slots: d.slots.map(x => x.id === s.id ? { ...x, status: x.status === 'available' ? 'occupied' : 'available' } : x) }), 'Toggled ' + s.no)}>Toggle</button><button className="btn danger sm" onClick={() => delS(s)}>Delete</button></div></td></tr>)}</tbody></table></div></>}
    {tab === 'reservations' && (db.bookings.filter(b => b.status === 'active').length ? db.bookings.filter(b => b.status === 'active').map(b => <div key={b.id} className="item"><span>{b.id} · {db.slots.find(s => s.id === b.slot)?.no} · {fmt(b.start)}</span><button className="btn danger sm" onClick={() => confirm('Cancel ' + b.id + '?', () => cancel(b.id))}>Cancel</button></div>) : <Empty text="No active reservations." />)}
    {tab === 'customers' && db.users.map(u => <div key={u.id} className="item"><span><b>{u.name}</b> · {u.email}<br /><small>{db.bookings.filter(b => b.user === u.id).length} bookings · {money(db.bookings.filter(b => b.user === u.id && b.status !== 'cancelled').reduce((a, b) => a + b.amount, 0))} spent</small></span><span className="row"><span className="tag">{u.role}{u.suspended ? ' · suspended' : ''}</span>{u.role !== 'admin' && <><button className="btn ghost sm" onClick={() => up(d => ({ ...d, users: d.users.map(x => x.id === u.id ? { ...x, suspended: !x.suspended } : x) }), (u.suspended ? 'Activated ' : 'Suspended ') + u.name)}>{u.suspended ? 'Activate' : 'Suspend'}</button><button className="btn danger sm" onClick={() => delU(u)}>Delete</button></>}</span></div>)}
    {tab === 'pricing' && db.locations.map(x => <div key={x.id} className="row wrap item"><b>{x.name}</b><span>Hourly $<input className="num" type="number" value={x.rate} onChange={e => up(d => ({ ...d, locations: d.locations.map(y => y.id === x.id ? { ...y, rate: Math.max(0, +e.target.value) } : y) }))} /></span><span>Daily $<input className="num" type="number" value={x.day} onChange={e => up(d => ({ ...d, locations: d.locations.map(y => y.id === x.id ? { ...y, day: Math.max(0, +e.target.value) } : y) }))} /></span></div>)}
    {tab === 'discounts' && <><form className="row wrap" onSubmit={addC}><input placeholder="CODE" value={c.code} onChange={e => setC({ ...c, code: e.target.value })} /><input className="num" type="number" value={c.pct} onChange={e => setC({ ...c, pct: e.target.value })} /><button className="btn">Add coupon</button></form>{db.coupons.map(x => <div key={x.code} className="item"><span><b>{x.code}</b> {x.pct}%</span><button className="btn ghost sm" onClick={() => up(d => ({ ...d, coupons: d.coupons.map(y => y.code === x.code ? { ...y, active: !y.active } : y) }))}>{x.active ? 'Disable' : 'Enable'}</button></div>)}</>}</div></>
}

function Profile() {
  const { db, me, up, toast } = useApp(), [f, setF] = useState({ name: me.name, phone: me.phone || '', password: '' }), [er, setEr] = useState({})
  const save = e => {
    e.preventDefault(); const x = {}; if (f.name.trim().length < 2) x.name = 'Enter your name.'; if (f.phone && !/^[\d\s+-]{7,15}$/.test(f.phone)) x.phone = 'Enter a valid phone.'; if (f.password && f.password.length < 6) x.password = 'Min 6 characters.'; setEr(x); if (Object.keys(x).length) return
    up(d => ({ ...d, users: d.users.map(u => u.id === me.id ? { ...u, name: f.name, phone: f.phone, password: f.password || u.password } : u) }), 'Profile updated'); toast('Profile saved')
  }
  return <><h2>Profile & settings</h2><form className="card narrow" onSubmit={save}><Field label="Name" error={er.name}><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field><Field label="Phone" error={er.phone}><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field><Field label="New password" error={er.password}><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field><button className="btn">Save changes</button><button type="button" className="btn ghost" onClick={() => up(d => ({ ...d, theme: d.theme === 'dark' ? 'light' : 'dark' }))}>Switch to {db.theme === 'dark' ? 'light' : 'dark'} mode</button></form></>
}
function Search() {
  const { db, me } = useApp(), [sp] = useSearchParams(), q = (sp.get('q') || '').toLowerCase(), adm = me.role === 'admin'
  const sl = db.slots.filter(s => (s.no + s.kind + s.status).toLowerCase().includes(q)).slice(0, 12), bk = db.bookings.filter(b => (adm || b.user === me.id) && (b.id + b.vehicle).toLowerCase().includes(q)).slice(0, 8)
  const vh = db.vehicles.filter(v => (adm || v.user === me.id) && (v.reg + v.model).toLowerCase().includes(q)), lc = db.locations.filter(l => l.name.toLowerCase().includes(q))
  const Sec = ({ t, n, children }) => n ? <div className="card"><h3>{t} ({n})</h3>{children}</div> : null
  return <><h2>Results for “{q}”</h2><Sec t="Parking slots" n={sl.length}><div className="row wrap">{sl.map(s => <span key={s.id} className={'tag ' + s.status}>{s.no} · {s.kind} · {s.status}</span>)}</div></Sec>
    <Sec t="Bookings" n={bk.length}>{bk.map(b => <div key={b.id} className="item"><span>{b.id} · {b.vehicle}</span><span className={'tag ' + b.status}>{b.status}</span></div>)}</Sec>
    <Sec t="Vehicles" n={vh.length}>{vh.map(v => <div key={v.id} className="item">{v.reg} · {v.model}</div>)}</Sec><Sec t="Locations" n={lc.length}>{lc.map(l => <div key={l.id} className="item">{l.name} · {money(l.rate)}/h</div>)}</Sec>
    {!sl.length && !bk.length && !vh.length && !lc.length && <Empty text="Nothing matched. Try a slot number, booking ID or plate." />}</>
}
function Notifs() {
  const { db, up } = useApp()
  return <><div className="row between"><h2>Notifications</h2><button className="btn ghost" onClick={() => up(d => ({ ...d, notifs: d.notifs.map(n => ({ ...n, read: true })) }))}>Mark all read</button></div><div className="card">{db.notifs.length ? db.notifs.map(n => <div key={n.id} className={'item ' + (n.read ? '' : 'unread')}><span>{n.text}</span><small>{fmt(n.t)}</small></div>) : <Empty text="You're all caught up." />}</div></>
}
function Logs() { const { db } = useApp(); return <><h2>Activity logs</h2><div className="card">{db.logs.filter(l => l.kind === 'user').length ? db.logs.filter(l => l.kind === 'user').map(l => <div key={l.id} className="item"><span>{l.text}</span><small>{fmt(l.t)}</small></div>) : <Empty text="No activity recorded yet." />}</div></> }
function Help() {
  const [o, setO] = useState(0), F = [['How do I book a slot?', 'Open Reserve, pick location, floor and slot, choose a time and confirm.'], ['How is pricing calculated?', 'Hourly rate, capped by the daily rate, with dynamic pricing based on occupancy.'], ['Can I cancel?', 'Yes — active bookings can be cancelled or extended from Reserve.'], ['Demo accounts?', 'admin@parkease.com / admin123 and user@parkease.com / user123.']]
  return <><h2>Help center</h2>{F.map((f, i) => <div key={i} className="card faq" onClick={() => setO(o === i ? -1 : i)}><b>{f[0]}</b>{o === i && <p>{f[1]}</p>}</div>)}</>
}

export default function App() {
  const { db, up, me } = useApp(), loc = useLocation(), nav = useNavigate(), [open, setOpen] = useState(false), [load, setLoad] = useState(true), [q, setQ] = useState('')
  useEffect(() => { setLoad(true); setOpen(false); const t = setTimeout(() => setLoad(false), 450); return () => clearTimeout(t) }, [loc.pathname])
  if (!me) return <Auth />
  const links = [['/', 'Dashboard'], ['/slots', 'Parking'], ['/book', 'Reserve'], ['/vehicles', 'Vehicles'], ['/payments', 'Payments'], ['/reports', 'Reports'], ...(me.role === 'admin' ? [['/admin', 'Admin']] : []), ['/notifications', 'Notifications'], ['/logs', 'Activity'], ['/help', 'Help'], ['/profile', 'Profile']]
  const unread = db.notifs.filter(n => !n.read).length
  return <div className="shell"><aside className={open ? 'open' : ''}><h1>ParkEase</h1>{links.map(([to, t]) => <NavLink key={to} to={to} end={to === '/'}>{t}{t === 'Notifications' && unread > 0 && <em>{unread}</em>}</NavLink>)}<button className="btn ghost" onClick={() => up(d => ({ ...d, session: null }), me.name + ' signed out')}>Sign out</button></aside>
    <div className="main"><header><button className="btn ghost sm burger" onClick={() => setOpen(!open)}>☰</button><form onSubmit={e => { e.preventDefault(); if (q.trim()) nav('/search?q=' + encodeURIComponent(q)); }}><input placeholder="Search slots, bookings, vehicles…" value={q} onChange={e => setQ(e.target.value)} /></form><button className="btn ghost sm" onClick={() => up(d => ({ ...d, theme: d.theme === 'dark' ? 'light' : 'dark' }))}>{db.theme === 'dark' ? '☀️' : '🌙'}</button><span className="avatar" title={me.role}>{me.name[0]}</span></header>
      <main>{load ? <div className="skel"><i /><i /><i /></div> : <Routes><Route path="/" element={<Dashboard />} /><Route path="/slots" element={<Slots key={loc.search} />} /><Route path="/book" element={<Book key={loc.search} />} /><Route path="/search" element={<Search key={loc.search} />} /><Route path="/vehicles" element={<Vehicles />} /><Route path="/payments" element={<Payments />} /><Route path="/reports" element={<Reports />} /><Route path="/admin" element={me.role === 'admin' ? <Admin /> : <Navigate to="/" />} /><Route path="/notifications" element={<Notifs />} /><Route path="/logs" element={<Logs />} /><Route path="/help" element={<Help />} /><Route path="/profile" element={<Profile />} /><Route path="*" element={<Navigate to="/" />} /></Routes>}</main></div></div>
}
