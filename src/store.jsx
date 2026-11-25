import { createContext, useContext, useEffect, useRef, useState } from 'react'
const K = 'parkease_v1', Ctx = createContext()
export const useApp = () => useContext(Ctx)
export const uid = p => p + Math.random().toString(36).slice(2, 8).toUpperCase()
export const money = n => '$' + Number(n).toFixed(2)
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('parkease', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
export const idbSet = async (k, v) => { try { const d = await idb(); d.transaction('kv', 'readwrite').objectStore('kv').put(v, k) } catch { } }
export const idbGet = async k => { try { const d = await idb(); return await new Promise(r => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(null) }) } catch { return null } }
export const H = 36e5, D = 24 * H
export const fmt = t => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
function seed() {
  const locations = [{ id: 'L1', name: 'Downtown Plaza', rate: 4, day: 30 }, { id: 'L2', name: 'Airport Terminal', rate: 6, day: 45 }, { id: 'L3', name: 'City Mall', rate: 3, day: 22 }]
  const slots = []; let k = 0
  locations.forEach(l => [1, 2, 3].forEach(f => {
    for (let n = 1; n <= 12; n++) {
      k++; const r = (k * 37 % 100) / 100
      slots.push({ id: `${l.id}-F${f}-${n}`, loc: l.id, floor: f, no: `F${f}-${String(n).padStart(2, '0')}`, kind: n <= 2 ? 'EV' : n === 12 ? 'Disabled' : 'Regular', status: r < .35 ? 'occupied' : r < .45 ? 'reserved' : 'available' })
    }
  }))
  const users = [{ id: 'U1', name: 'Admin User', email: 'admin@parkease.com', password: 'admin123', role: 'admin', phone: '555-0100' }, { id: 'U2', name: 'Demo Driver', email: 'user@parkease.com', password: 'user123', role: 'user', phone: '555-0101' }, { id: 'U3', name: 'Priya Nair', email: 'priya@mail.com', password: 'pass1234', role: 'user', phone: '555-0102' }, { id: 'U4', name: 'Liam Carter', email: 'liam@mail.com', password: 'pass1234', role: 'user', phone: '555-0103' }]
  const bookings = []
  for (let d = 14; d >= 1; d--)for (let i = 0; i < 4 + (d * 3) % 5; i++) {
    const s = slots[(d * 7 + i * 5) % slots.length], st = Date.now() - d * D + i * 2 * H, hrs = 1 + (i + d) % 4
    bookings.push({ id: 'BK' + (1000 + bookings.length), user: 'U' + (2 + (i % 3)), slot: s.id, loc: s.loc, vehicle: 'Sample vehicle', start: st, end: st + hrs * H, status: 'completed', amount: +(hrs * locations.find(l => l.id === s.loc).rate).toFixed(2), method: ['Card', 'UPI', 'Wallet'][i % 3], created: st })
  }
  return {
    users, locations, slots, bookings, vehicles: [{ id: 'V1', user: 'U2', reg: 'ABC-1234', type: 'Car', model: 'Toyota Corolla' }, { id: 'V2', user: 'U2', reg: 'EV-9087', type: 'EV', model: 'Tesla Model 3' }],
    coupons: [{ code: 'SAVE10', pct: 10, active: true }, { code: 'WELCOME20', pct: 20, active: true }],
    notifs: [{ id: 'N1', t: Date.now() - H, text: 'Welcome to ParkEase! Use WELCOME20 for 20% off.', read: false }], logs: [], session: null, theme: 'light'
  }
}
export const occ = (db, loc) => { const s = db.slots.filter(x => x.loc === loc); return s.length ? s.filter(x => x.status !== 'available').length / s.length : 0 }
export function price(db, loc, hours, code) {
  const l = db.locations.find(x => x.id === loc); if (!l) return { sub: 0, disc: 0, total: 0, surge: 1 }
  let base = Math.floor(hours / 24) * l.day + Math.min((hours % 24) * l.rate, l.day)
  const o = occ(db, loc), surge = o > .7 ? 1.2 : o < .3 ? .9 : 1, sub = base * surge
  const c = db.coupons.find(x => x.code === (code || '').toUpperCase() && x.active), disc = c ? sub * c.pct / 100 : 0
  return { sub, disc, total: sub - disc, surge, coupon: c }
}
export function Provider({ children }) {
  const [db, setDb] = useState(() => { try { return JSON.parse(localStorage.getItem(K)) || seed() } catch { return seed() } })
  const [toasts, setToasts] = useState([]), [dlg, setDlg] = useState(null)
  const ready = useRef(false)
  useEffect(() => { (localStorage.getItem(K) ? Promise.resolve(null) : idbGet(K)).then(v => { if (v) setDb(JSON.parse(v)); else idbSet(K, localStorage.getItem(K)); ready.current = true }) }, [])
  useEffect(() => { const j = JSON.stringify(db); localStorage.setItem(K, j); if (ready.current) idbSet(K, j); document.documentElement.dataset.theme = db.theme }, [db])
  useEffect(() => {
    const i = setInterval(() => setDb(d => {
      const c = d.slots.filter(s => s.status !== 'reserved'); const s = c[Math.floor(Math.random() * c.length)]; if (!s) return d
      const st = s.status === 'occupied' ? 'available' : 'occupied'
      return { ...d, slots: d.slots.map(x => x === s ? { ...x, status: st } : x), logs: [{ id: uid('L'), t: Date.now(), kind: 'live', text: `Slot ${s.no} is now ${st}` }, ...d.logs].slice(0, 200) }
    }), 6000); return () => clearInterval(i)
  }, [])
  const up = (fn, msg) => setDb(d => { const n = fn(d); return msg ? { ...n, logs: [{ id: uid('L'), t: Date.now(), kind: 'user', text: msg }, ...n.logs].slice(0, 200) } : n })
  const toast = (text, type = 'ok') => { const id = uid('T'); setToasts(t => [...t, { id, text, type }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200) }
  const notify = text => up(d => ({ ...d, notifs: [{ id: uid('N'), t: Date.now(), text, read: false }, ...d.notifs] }))
  const confirm = (msg, fn) => setDlg({ msg, fn })
  const me = db.users.find(u => u.id === db.session)
  const clash = (slot, start, end, ignore) => db.bookings.some(b => b.slot === slot && b.id !== ignore && b.status === 'active' && start < b.end && end > b.start)
  const book = ({ slot, vehicle, start, hours, code, method }) => {
    const s = db.slots.find(x => x.id === slot), end = start + hours * H
    if (!s) return 'Select a slot.'
    if (clash(slot, start, end)) return 'This slot is already booked for that time.'
    if (start < Date.now() - 6e4) return 'Start time must be in the future.'
    if (s.status === 'occupied' && start < Date.now() + H) return 'Slot is occupied right now; choose a later start.'
    const p = price(db, s.loc, hours, code), b = { id: 'BK' + Math.floor(Math.random() * 9e5 + 1e5), user: me.id, slot, loc: s.loc, vehicle, start, end, status: 'active', amount: +p.total.toFixed(2), coupon: p.coupon?.code, method, created: Date.now() }
    up(d => ({ ...d, bookings: [b, ...d.bookings], slots: d.slots.map(x => x.id === slot ? { ...x, status: 'reserved' } : x) }), `Booked ${s.no} (${b.id})`); notify(`Booking ${b.id} confirmed for slot ${s.no}.`); return b
  }
  const cancel = id => up(d => { const b = d.bookings.find(x => x.id === id); return { ...d, bookings: d.bookings.map(x => x.id === id ? { ...x, status: 'cancelled' } : x), slots: d.slots.map(x => x.id === b.slot && !d.bookings.some(o => o.id !== id && o.slot === b.slot && o.status === 'active') ? { ...x, status: 'available' } : x) } }, `Cancelled ${id}`)
  const extend = (id, h) => {
    const b = db.bookings.find(x => x.id === id); if (clash(b.slot, b.end, b.end + h * H, id)) return toast('Next time window is already booked.', 'err')
    up(d => ({ ...d, bookings: d.bookings.map(x => x.id === id ? { ...x, end: x.end + h * H, amount: +(x.amount + price(d, x.loc, h).total).toFixed(2) } : x) }), `Extended ${id} by ${h}h`); toast(`Extended by ${h}h`)
  }
  return <Ctx.Provider value={{ db, up, me, toast, notify, confirm, book, cancel, extend, clash }}>{children}
    <div className="toasts">{toasts.map(t => <div key={t.id} className={'toast ' + t.type}>{t.text}</div>)}</div>
    {dlg && <div className="overlay" onClick={() => setDlg(null)}><div className="modal" onClick={e => e.stopPropagation()}><h3>Please confirm</h3><p>{dlg.msg}</p><div className="row end"><button className="btn ghost" onClick={() => setDlg(null)}>Keep</button><button className="btn danger" onClick={() => { dlg.fn(); setDlg(null) }}>Confirm</button></div></div></div>}
  </Ctx.Provider>
}
