import { useState, useMemo, useEffect, useRef } from "react";

const C = {
  red: "#E8001D", dark: "#f4f5f8", dark2: "#ffffff", dark3: "#ffffff", dark4: "#eceef3",
  border: "#e3e5ec", border2: "#d2d5e0", white: "#ffffff", text: "#16161d", gray: "#5c5c70", gray2: "#9a9ab0",
  green: "#00a884", orange: "#ef6c00", yellow: "#c8920a",
};

const ADMIN_PIN = "270913";
const VERSION = "v2026.06.27-H";
const VENDEDOR_PIN = "1234";
const ENTRADAS_PIN = "1122";
const INSCRIPCION_PIN = "3344";
const EMAIL_DESTINO = "Francisca@gp3chile.cl";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbxh0cN7SV9tZtR0bgvZH6ysGzxQgApFiKn7O4C9mN7HUV8h3hWpLbq2fqYbw5XV1Jk3/exec";

// --- FUNCIONES AUXILIARES GLOBALES ---
async function syncSheets(type, data) {
  try {
    await fetch(SHEETS_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...data })
    });
  } catch (e) { console.log("Sync error:", e); }
}

async function syncAllVentas(ventas) {
  try {
    await fetch(SHEETS_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reset_ventas", ventas })
    });
  } catch (e) { console.log("Sync error:", e); }
}

let _vipCache = { ts: 0, set: null, info: {} };
async function fetchVipCodes() {
  const now = Date.now();
  if (_vipCache.set && now - _vipCache.ts < 60000) return _vipCache;
  try {
    const r = await fetch(SHEETS_URL + "?tipo=vip_codes&t=" + now);
    const j = await r.json();
    if (j && j.ok && Array.isArray(j.codes)) {
      const set = new Set(); const info = {};
      j.codes.forEach(c => { const k = ("" + (c.code || "")).trim(); if (k) { set.add(k); info[k] = c; } });
      _vipCache = { ts: now, set, info };
    }
  } catch (e) { }
  return _vipCache;
}

const PRODUCTOS = [
  { id: "m110sc1", tipo: "Delantero", label: "Modelo 110 SC1", precios: { USD: 500, ARS: 700000 } },
  { id: "m140sc1", tipo: "Trasero", label: "Modelo 140 SC1", precios: { USD: 500, ARS: 700000 } },
  { id: "m120sc1", tipo: "Delantero", label: "Modelo 120 SC1", precios: { USD: 300, ARS: 415000 } },
  { id: "m180sc2", tipo: "Trasero", label: "Modelo 180 SC2", precios: { USD: 400, ARS: 555000 } },
  { id: "m200sc1", tipo: "Trasero", label: "Modelo 200 SC1", precios: { USD: 400, ARS: 555000 } },
  { id: "m200sc2", tipo: "Trasero", label: "Modelo 200 SC2", precios: { USD: 400, ARS: 555000 } },
  { id: "m200sc3", tipo: "Trasero", label: "Modelo 200 SC3", precios: { USD: 400, ARS: 555000 } },
  { id: "m120rain", tipo: "Delantero", label: "Modelo 120 RAIN", precios: { USD: 300, ARS: 415000 } },
  { id: "m200rain", tipo: "Trasero", label: "Modelo 200 RAIN", precios: { USD: 400, ARS: 555000 } },
];

const STOCK0 = {
  m110sc1: { bodega: 13, transito: 0, flotante: 0 },
  m140sc1: { bodega: 13, transito: 0, flotante: 0 },
  m120sc1: { bodega: 38, transito: 0, flotante: 0 },
  m180sc2: { bodega: 6, transito: 0, flotante: 0 },
  m200sc1: { bodega: 80, transito: 0, flotante: 0 },
  m200sc2: { bodega: 0, transito: 0, flotante: 0 },
  m200sc3: { bodega: 0, transito: 0, flotante: 0 },
  m120rain: { bodega: 0, transito: 0, flotante: 0 },
  m200rain: { bodega: 0, transito: 0, flotante: 0 },
};

const CIRCUITOS_BASE = [
  { id: "f1", num: "1ª", nombre: "Termas de Río Hondo", inicio: "2026-04-03", fin: "2026-04-05" },
  { id: "f2", num: "2ª", nombre: "Toay", inicio: "2026-05-22", fin: "2026-05-24" },
  { id: "f3", num: "3ª", nombre: "San Nicolás", inicio: "2026-06-19", fin: "2026-06-21" },
  { id: "f4", num: "4ª", nombre: "Concordia", inicio: "2026-08-07", fin: "2026-08-09" },
  { id: "f5", num: "5ª", nombre: "San Juan Villicum", inicio: "2026-09-04", fin: "2026-09-06" },
  { id: "f6", num: "6ª", nombre: "Termas de Río Hondo 2", inicio: "2026-10-09", fin: "2026-10-11" },
  { id: "f7", num: "7ª", nombre: "San Juan Villicum — Final", inicio: "2026-11-13", fin: "2026-11-15" },
];

const COSTOS_DEFAULT = {
  m110sc1: { valor: 211769, moneda: "ARS" },
  m140sc1: { valor: 239338, moneda: "ARS" },
  m120sc1: { valor: 221891, moneda: "ARS" },
  m180sc2: { valor: 286408, moneda: "ARS" },
  m200sc1: { valor: 292350, moneda: "ARS" },
  m200sc2: { valor: 0, moneda: "ARS" },
  m200sc3: { valor: 0, moneda: "ARS" },
  m120rain: { valor: 0, moneda: "ARS" },
  m200rain: { valor: 0, moneda: "ARS" },
};

const ADMIN_DEFAULT = {
  iva: 21, tc: 1400,
  estructura: [
    { id: "e1", nombre: "Patricia", valor: 0, pctGP3: 60 },
    { id: "e2", nombre: "Francisca", valor: 0, pctGP3: 50 },
    { id: "e3", nombre: "Arriendo de local", valor: 0, pctGP3: 100 },
  ],
  fechas: {
    f1: { ivaMode: "neto", estPct: 30, insc: 21470000, track: 1837000, entr: 2970000, neuManual: { on: true, venta: 87925000, costo: 47300000 }, costos: [] },
    f2: { ivaMode: "neto", estPct: 25, insc: 13620000, track: 6760000, entr: 3955000, neuManual: { on: true, venta: 52000000, costo: 27500000 }, costos: [] },
    f3: { ivaMode: "neto", estPct: 15, insc: 0, track: 0, entr: 0, neuManual: { on: false, venta: 0, costo: 0 }, costos: [] },
    f4: { ivaMode: "neto", estPct: 10, insc: 0, track: 0, entr: 0, neuManual: { on: false, venta: 0, costo: 0 }, costos: [] },
    f5: { ivaMode: "neto", estPct: 10, insc: 0, track: 0, entr: 0, neuManual: { on: false, venta: 0, costo: 0 }, costos: [] },
    f6: { ivaMode: "neto", estPct: 5, insc: 0, track: 0, entr: 0, neuManual: { on: false, venta: 0, costo: 0 }, costos: [] },
    f7: { ivaMode: "neto", estPct: 5, insc: 0, track: 0, entr: 0, neuManual: { on: false, venta: 0, costo: 0 }, costos: [] },
  },
};

const HOY = new Date().toISOString().slice(0, 10);
function getCircuitosVendedor() { return CIRCUITOS_BASE.filter(c => c.fin >= HOY); }
function getCircuitoActivo() {
  const a = CIRCUITOS_BASE.find(c => HOY >= c.inicio && HOY <= c.fin);
  if (a) return a;
  const prox = CIRCUITOS_BASE.find(c => c.inicio > HOY);
  if (prox) return prox;
  return CIRCUITOS_BASE[CIRCUITOS_BASE.length - 1];
}

function decodeMetodo(metodoStr, monedaFallback, totalFallback) {
  const s = (metodoStr || "").toString();
  if (s.indexOf("split:") === 0) {
    const pagos = s.slice(6).split("|").map(tok => { const p = tok.split("~"); return p.length >= 3 ? { metodo: p[0], monto: Number(p[1]) || 0, moneda: p[2] } : null; }).filter(Boolean);
    if (pagos.length > 0) return { metodo: "mixto", pagos };
  }
  return { metodo: s || "otro", pagos: [{ metodo: s || "otro", moneda: monedaFallback || "ARS", monto: Number(totalFallback) || 0 }] };
}

function lsGet(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { } }
function normTxt(s) { return (s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

// --- COMPONENTES ATÓMICOS DE UI ---
function Logo({ size = "md" }) {
  const [err, setErr] = useState(false);
  const h = size === "sm" ? 26 : size === "lg" ? 46 : 34;
  if (!err) { return (<img src="/gp3-logo.png" alt="GP3 Sports Latam" style={{ height: h, objectFit: "contain", display: "block" }} onError={() => setErr(true)} />); }
  const s = size === "sm" ? { gp: 22, n3: 28, sub: 7, gap: 6 } : size === "lg" ? { gp: 32, n3: 40, sub: 9, gap: 8 } : { gp: 26, n3: 32, sub: 8, gap: 7 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ background: "#fff", borderRadius: "6px 0 0 6px", padding: "3px 8px", display: "flex", alignItems: "center" }}><span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: s.gp, fontWeight: 900, color: "#0a0a0f", letterSpacing: -1, lineHeight: 1 }}>GP</span></div>
        <div style={{ background: C.red, borderRadius: "0 6px 6px 0", padding: "0 8px", display: "flex", alignItems: "center", transform: "skewX(-6deg)", marginLeft: -2 }}><span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: s.n3, fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1, display: "inline-block", transform: "skewX(6deg)" }}> 3</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: s.sub + 2, fontWeight: 700, color: C.text, letterSpacing: 3, textTransform: "uppercase", lineHeight: 1 }}>SPORTS LATAM</span>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: s.sub, fontWeight: 600, color: C.red, letterSpacing: 2, textTransform: "uppercase", lineHeight: 1 }}>NEUMÁTICOS PIRELLI</span>
      </div>
    </div>
  );
}

function Badge({ children, color = C.red, small }) { return (<span style={{ display: "inline-flex", alignItems: "center", padding: small ? "2px 6px" : "3px 8px", borderRadius: 3, background: color + "22", border: `1px solid ${color}44`, color, fontSize: small ? 9 : 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Barlow Condensed',sans-serif", whiteSpace: "nowrap" }}>{children}</span>); }
function Pill({ children, active, color = C.red, onClick }) { return (<button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1, border: `1px solid ${active ? color : C.border2}`, background: active ? color + "22" : "transparent", color: active ? C.text : C.gray, transition: "all .2s", whiteSpace: "nowrap" }}>{children}</button>); }
function Card({ children, style }) { return (<div style={{ background: C.dark3, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", ...style }}>{children}</div>); }
function CardHeader({ children }) { return (<div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 3, height: 16, background: C.red, borderRadius: 2, flexShrink: 0 }}/><span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.text }}>{children}</span></div>); }
function StatBox({ label, value, color = C.text, sub }) { return (<div style={{ background: C.dark4, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", flex: 1, minWidth: 80, borderTop: `2px solid ${color}` }}><div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color, lineHeight: 1, letterSpacing: -1 }}>{value}</div>{sub && <div style={{ fontSize: 10, color, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginTop: 1 }}>{sub}</div>}<div style={{ fontSize: 10, color: C.gray, textTransform: "uppercase", letterSpacing: 1, marginTop: 3, fontFamily: "'Barlow Condensed',sans-serif" }}>{label}</div></div>); }
function Input({ style, ...props }) { return (<input style={{ background: C.dark4, border: `1px solid ${C.border2}`, color: C.text, borderRadius: 8, padding: "11px 14px", fontSize: 15, outline: "none", width: "100%", transition: "border .2s", fontFamily: "'Barlow',sans-serif", ...style }} {...props} onFocus={e => e.target.style.borderColor = C.red} onBlur={e => e.target.style.borderColor = C.border2} />); }
function Select({ children, style, ...props }) { return (<select style={{ background: C.dark4, border: `1px solid ${C.border2}`, color: C.text, borderRadius: 8, padding: "11px 14px", fontSize: 15, outline: "none", width: "100%", appearance: "none", fontFamily: "'Barlow',sans-serif", ...style }} {...props}>{children}</select>); }
function Btn({ children, onClick, color = C.red, outline, full, small, disabled, style }) { return (<button onClick={onClick} disabled={disabled} style={{ display: "flex", alignItems: "center", justifyYContent: "center", gap: 6, padding: small ? "8px 14px" : "12px 20px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: small ? 13 : 15, fontWeight: 700, letterSpacing: 1, width: full ? "100%" : undefined, border: `2px solid ${outline ? color : "transparent"}`, background: outline ? "transparent" : disabled ? C.dark4 : color, color: outline ? color : disabled ? C.gray : "#fff", transition: "all .2s", opacity: disabled ? .5 : 1, textTransform: "uppercase", ...style }}>{children}</button>); }
function Toast({ msg, err }) { return (<div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "12px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#fff", background: err ? "#cc1133" : "#00a878", boxShadow: "0 8px 32px rgba(0,0,0,.6)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, whiteSpace: "nowrap", maxWidth: "90vw", textAlign: "center", animation: "slideUp .2s ease" }}>{msg}</div>); }
function Label({ children }) { return <div style={{ fontSize: 10, color: C.gray, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 6, fontWeight: 600 }}>{children}</div>; }
function Field({ label, children }) { return <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}><Label>{label}</Label>{children}</div>; }
function NumInput({ value, onChange, color, align = "right", width }) { return <input value={(value || 0).toLocaleString("es-AR")} onChange={e => { const r = e.target.value.replace(/[^\d]/g, ""); onChange(r === "" ? 0 : parseInt(r, 10)); }} style={{ background: C.dark4, border: `1px solid ${C.border2}`, color: color || C.yellow, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", width: width || "100%", textAlign: align, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }} />; }

function CavLogo() {
  const CAV = "#1f93bf";
  return (<span style={{ display: "inline-flex", alignItems: "center" }}><span style={{ background: "#fff", color: "#0a0a0f", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 22, padding: "2px 8px", borderRadius: "6px 0 0 6px", lineHeight: 1 }}>GP</span><span style={{ background: CAV, color: "#0a0a0f", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 27, padding: "0 8px", borderRadius: "0 6px 6px 0", transform: "skewX(-6deg)", marginLeft: -3, lineHeight: 1 }}>3</span></span>);
}

// --- OTROS COMPONENTES DEL PANEL ---
function GestionPiloto({ pilotos, setPilotos, cats, boom }) {
  const [n, setN] = useState({ num: "", nombre: "", cat: cats[0] || "" });
  const add = () => { if (!n.nombre.trim() || !n.num.trim()) { boom("Completá número y nombre", true); return; } setPilotos([...pilotos, { num: n.num.trim(), nombre: n.nombre.trim(), cat: n.cat }]); boom("✓ Piloto agregado"); setN({ num: "", nombre: "", cat: cats[0] || "" }); };
  return (
    <div style={{ padding: 12, display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: 8, alignItems: "end" }}>
      <div><Label>N°</Label><Input value={n.num} onChange={e => setN({ ...n, num: e.target.value })} /></div>
      <div><Label>Nombre</Label><Input value={n.nombre} onChange={e => setN({ ...n, nombre: e.target.value })} /></div>
      <div><Label>Categoría</Label><Select value={n.cat} onChange={e => setN({ ...n, cat: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</Select></div>
      <Btn small color={C.green} onClick={add}>+ Agregar</Btn>
    </div>
  );
}

function InscripcionesPanel({ eventoActivo, aranceles, tcApp, onPagar, inscPagadas }) {
  const CAV = "#1f93bf";
  const CATS = ["GP3 Amateur", "GP3 Experto", "GP3 Promocional", "SBK Pro", "SBK Experto", "SBK Senior", "SBK Promocional", "SBK Amateur", "Sportbike", "600 SSP"];
  const selSt = { background: C.dark4, border: `1px solid ${C.border2}`, color: C.text, borderRadius: 8, padding: "11px 14px", fontSize: 15, outline: "none", width: "100%", fontFamily: "'Barlow',sans-serif" };
  const lblIn = { fontSize: 9, color: C.gray, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, marginBottom: 3, display: "block" };
  const [data, setData] = useState([]);
  const [estado, setEstado] = useState("cargando");
  const [ts, setTs] = useState(null);
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState(null);
  const [ed, setEd] = useState({});
  const [fFecha, setFFecha] = useState(eventoActivo || "todas");

  useEffect(() => { if (eventoActivo) setFFecha(eventoActivo); }, [eventoActivo]);
  const ARA = aranceles || {}; const PAG = inscPagadas || {};
  const normNom = s => ("" + (s || "")).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const ventaDe = p => { const nom = normNom((p.nombre || "") + " " + (p.apellido || "")); return PAG[nom + "|" + (p.circ_id || "")] || PAG[nom] || null; };

  const [pagar, setPagar] = useState(null);
  const [pMetodo, setPMetodo] = useState("efectivo_ars");
  const [pMoneda, setPMoneda] = useState("ARS");
  const [pMonto, setPMonto] = useState(0);

  const abrirPago = p => { const a = ARA[p.categoria] || { valor: 0, moneda: "ARS" }; setPagar(p); setPMoneda(a.moneda || "ARS"); setPMonto(a.valor || 0); setPMetodo((a.moneda === "USD") ? "efectivo_usd" : "efectivo_ars"); };
  const confirmarPago = () => { if (!pagar || !onPagar) return; const monto = Number(pMonto) || 0; onPagar(pagar, [{ metodo: pMetodo, monto, moneda: pMoneda }], monto, pMoneda); setPagar(null); };
  const fmtMon2 = (n, m) => (m === "USD" ? "USD " : "$ ") + Math.round(n || 0).toLocaleString("es-AR");

  const cargar = async () => {
    try {
      const res = await fetch(SHEETS_URL + "?tipo=inscripciones&t=" + Date.now());
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json.inscripciones || json.data || []);
      setData(arr); setTs(new Date()); setEstado(arr.length ? "ok" : "vacio");
    } catch (e) { setEstado(prev => prev === "ok" ? "ok" : "error"); }
  };

  useEffect(() => { cargar(); const id = setInterval(cargar, 30000); return () => clearInterval(id); }, []);

  const norm = r => ({
    id: r.id || "", fecha_registro: r.fecha_registro || r["Fecha Registro"] || "",
    nombre: r.nombre || "", apellido: r.apellido || "", dni: r.dni || r.doc || r.documento || "", nacimiento: r.nacimiento || "",
    provincia: r.provincia || "", localidad: r.localidad || "", domicilio: r.domicilio || "",
    telefono: r.telefono || r.whatsapp || "", telefono_acomp: r.telefono_acomp || r.emergencia || "", email: r.email || "",
    categoria: r.categoria || "", numero: r.numero || "", marca: r.marca || "", modelo: r.modelo || "",
    equipo: r.equipo || "", sponsor: r.sponsor || "", jefe_equipo: r.jefe_equipo || "", carpa: r.carpa || "",
    circ_id: r.circ_id || "", circuito: r.circuito || "", jueves: r.jueves || "",
  });

  const filasTodas = data.map(norm);
  const circSel = CIRCUITOS_BASE.find(c => c.id === fFecha);
  const filas = fFecha === "todas" ? filasTodas : filasTodas.filter(p => p.circ_id === fFecha || (circSel && p.circuito === circSel.nombre));
  const fil = q.trim().length > 1 ? filas.filter(p => (p.nombre + " " + p.apellido).toLowerCase().includes(q.toLowerCase())) : filas;
  const porCat = {}; filas.forEach(p => { if (p.categoria) porCat[p.categoria] = (porCat[p.categoria] || 0) + 1; });
  const catOrden = Object.entries(porCat).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <CavLogo />
        <div><strong>Preinscripciones CAV 2026</strong></div>
      </div>
      <Card><CardHeader>Lista de Pilotos Preinscritos ({fil.length})</CardHeader>
        <div style={{ padding: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Moto</th>
                <th style={{ padding: 8 }}>Piloto</th>
                <th style={{ padding: 8 }}>Categoría</th>
                <th style={{ padding: 8 }}>Estado Pago</th>
              </tr>
            </thead>
            <tbody>
              {fil.map((p, i) => {
                const v = ventaDe(p);
                return (
                  <tr key={p.id || i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 8, fontWeight: "bold" }}>#{p.numero || "—"}</td>
                    <td style={{ padding: 8 }}>{p.nombre} {p.apellido}</td>
                    <td style={{ padding: 8 }}><Badge color={CAV}>{p.categoria}</Badge></td>
                    <td style={{ padding: 8 }}>
                      {v ? (
                        <span style={{ color: C.green, fontWeight: "bold" }}>✓ Pagado ({fmtMon2(v.total_monto, v.moneda)})</span>
                      ) : (
                        <Btn small color={C.green} onClick={() => abrirPago(p)}>💵 Cobrar</Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {pagar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, width: 400 }}>
            <h3>Cobrar a {pagar.nombre}</h3>
            <div style={{ margin: "15px 0" }}>
              <label style={lblIn}>Monto a cobrar</label>
              <NumInput value={pMonto} onChange={setPMonto} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn full color={C.green} onClick={confirmarPago}>Confirmar</Btn>
              <Btn outline full color={C.gray} onClick={() => setPagar(null)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- EXPORTACIÓN CENTRAL PRINCIPAL APP ---
export default function App() {
  const [modo, setModo] = useState(null);
  const [pinVendedor, setPinVendedor] = useState("");
  const [pinErrorVendedor, setPinErrorVendedor] = useState(false);
  const [pinAdmin, setPinAdmin] = useState("");
  const [pinErrorAdmin, setPinErrorAdmin] = useState(false);
  const [tab, setTab] = useState("venta");
  const [toast, setToast] = useState(null);

  const [ventas, setVentas] = useState([]);
  const [stock, setStock] = useState(STOCK0);

  const boom = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  const handlesLogin = (mode, pin, correctPin, errSetter) => {
    if (pin === correctPin) {
      setModo(mode);
      setPinVendedor(""); setPinAdmin("");
    } else {
      errSetter(true);
    }
  };

  if (!modo) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f4f5f8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", gap: 20, padding: 40 }}>
          <Card style={{ padding: 20, textAlign: "center", width: 260 }}>
            <h3>MODO VENTA</h3>
            <Input type="password" placeholder="PIN Vendedor" value={pinVendedor} onChange={e => { setPinVendedor(e.target.value); setPinErrorVendedor(false); }} />
            {pinErrorVendedor && <p style={{ color: "red", fontSize: 12 }}>Incorrecto</p>}
            <Btn full style={{ marginTop: 10 }} onClick={() => handlesLogin("vendedor", pinVendedor, VENDEDOR_PIN, setPinErrorVendedor)}>Ingresar</Btn>
          </Card>
          <Card style={{ padding: 20, textAlign: "center", width: 260 }}>
            <h3>MODO ADMIN</h3>
            <Input type="password" placeholder="PIN Admin" value={pinAdmin} onChange={e => { setPinAdmin(e.target.value); setPinErrorAdmin(false); }} />
            {pinErrorAdmin && <p style={{ color: "red", fontSize: 12 }}>Incorrecto</p>}
            <Btn full color={C.red} style={{ marginTop: 10 }} onClick={() => handlesLogin("admin", pinAdmin, ADMIN_PIN, setPinErrorAdmin)}>Ingresar</Btn>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
      <header style={{ padding: "10px 20px", background: "#fff", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between" }}>
        <Logo size="sm" />
        <Btn small outline color={C.gray} onClick={() => setModo(null)}>Cerrar Sesión</Btn>
      </header>
      <main style={{ flex: 1, padding: 20 }}>
        <h2>Panel de Control — {modo.toUpperCase()}</h2>
        <InscripcionesPanel eventoActivo="f1" aranceles={{}} tcApp={1400} onPagar={() => boom("Pago procesado")} inscPagadas={{}} />
      </main>
      {toast && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}
