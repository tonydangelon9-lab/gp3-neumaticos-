import { useState, useMemo } from "react";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const R   = "#a855f7";
const CEL = "#FFFFFF";
const BK  = "#1a0a2e";
const BK2 = "#22103a";
const BK3 = "#2d1650";
const BK4 = "#3d2060";
const GR2 = "#b8a8d0";
const GR3 = "#7a6a9a";

const ADMIN_PIN     = "GP3admin";
const EMAIL_DESTINO = "Francisca@gp3chile.cl";

// ─── PRECIOS FIJOS POR MONEDA ─────────────────────────────────────────────────
// USD y ARS son fijos.
const PRODUCTOS = [
  { id:"m110sc1", tipo:"Delantero", label:"Modelo 110 SC1", precios:{ USD:500, ARS:700000 } },
  { id:"m140sc1", tipo:"Trasero",   label:"Modelo 140 SC1", precios:{ USD:500, ARS:700000 } },
  { id:"m120sc1", tipo:"Delantero", label:"Modelo 120 SC1", precios:{ USD:300, ARS:415000 } },
  { id:"m180sc2", tipo:"Trasero",   label:"Modelo 180 SC2", precios:{ USD:400, ARS:555000 } },
  { id:"m200sc1", tipo:"Trasero",   label:"Modelo 200 SC1", precios:{ USD:400, ARS:555000 } },
];

const CIRCUITOS = [
  { id:"f1", num:"1ª", nombre:"Termas de Río Hondo",      fecha:"3–5 Abril 2026",    dateISO:"2026-04-03" },
  { id:"f2", num:"2ª", nombre:"Toay",                     fecha:"22–24 Mayo 2026",   dateISO:"2026-05-22" },
  { id:"f3", num:"3ª", nombre:"San Nicolás",               fecha:"19–21 Junio 2026",  dateISO:"2026-06-19" },
  { id:"f4", num:"4ª", nombre:"Concordia",                 fecha:"7–9 Agosto 2026",   dateISO:"2026-08-07" },
  { id:"f5", num:"5ª", nombre:"San Juan Villicum",         fecha:"4–6 Sept 2026",     dateISO:"2026-09-04" },
  { id:"f6", num:"6ª", nombre:"Termas de Río Hondo 2",    fecha:"9–11 Oct 2026",     dateISO:"2026-10-09" },
  { id:"f7", num:"7ª", nombre:"San Juan Villicum — Final", fecha:"13–15 Nov 2026",    dateISO:"2026-11-13" },
];

const PILOTOS_DB = [
  { num:"111", nombre:"Augusto Caviglia",        cat:"GP3 Amateur" },
  { num:"87",  nombre:"Javier Alvarez",           cat:"GP3 Amateur" },
  { num:"99",  nombre:"Lucas Brizuela",           cat:"GP3 Amateur" },
  { num:"69",  nombre:"Jose Ignacio Sartor",      cat:"GP3 Amateur" },
  { num:"11",  nombre:"Santiago Zinno",           cat:"GP3 Amateur" },
  { num:"73",  nombre:"Agustin Gagliardo",        cat:"GP3 Amateur" },
  { num:"24",  nombre:"Fabricio Avalos",          cat:"GP3 Amateur" },
  { num:"96",  nombre:"Nicolas Gomez Pontecorvo", cat:"GP3 Amateur" },
  { num:"49",  nombre:"Federico Marquez",         cat:"GP3 Experto" },
  { num:"29",  nombre:"Mariano Villalobos",       cat:"GP3 Experto" },
  { num:"86",  nombre:"Jose Maria Plaja Maidana", cat:"GP3 Experto" },
  { num:"22",  nombre:"Santiago Gossa",           cat:"GP3 Experto" },
  { num:"13",  nombre:"Ariel Gavarini",           cat:"GP3 Experto" },
  { num:"47",  nombre:"Virginia Guidetti",        cat:"GP3 Experto" },
  { num:"64",  nombre:"Facundo Romero",           cat:"GP3 Promocional" },
  { num:"23",  nombre:"Pablo Tarantino",          cat:"GP3 Promocional" },
  { num:"37",  nombre:"Manuel Barrionuevo",       cat:"GP3 Promocional" },
  { num:"16",  nombre:"Mauro Finco",              cat:"SBK Promocional" },
  { num:"22",  nombre:"Sebastian Pablo",          cat:"SBK Promocional" },
  { num:"24",  nombre:"Tomas Calvan",             cat:"SBK Promocional" },
  { num:"94",  nombre:"Miguel Rubiolo",           cat:"SBK Promocional" },
  { num:"17",  nombre:"Francisco Velez",          cat:"SBK Experto" },
  { num:"22",  nombre:"Felipe Gini",              cat:"SBK Experto" },
  { num:"21",  nombre:"Gaston Rosato",            cat:"SBK Experto" },
  { num:"85",  nombre:"Alejandro Dalbon",         cat:"SBK Experto" },
  { num:"9",   nombre:"Javier De Buono",          cat:"SBK Experto" },
  { num:"80",  nombre:"Valentin Romero",          cat:"SBK Experto" },
  { num:"7",   nombre:"Ariel Quse",               cat:"SBK Experto" },
  { num:"82",  nombre:"Leonardo Villegas",        cat:"SBK Experto" },
  { num:"128", nombre:"Cristian Albinana",        cat:"SBK Experto" },
  { num:"169", nombre:"Mauricio Hidalgo",         cat:"SBK Experto" },
  { num:"87",  nombre:"Mariano Kassardjian",      cat:"SBK Experto" },
  { num:"13",  nombre:"Jorge Gauna",              cat:"SBK Senior" },
  { num:"53",  nombre:"Gerardo Crisafulli",       cat:"SBK Senior" },
  { num:"12",  nombre:"Alexis Varlan",            cat:"SBK Senior" },
  { num:"27",  nombre:"Pablo Gamberini",          cat:"SBK Senior" },
  { num:"21",  nombre:"Walter Paez",              cat:"SBK Senior" },
  { num:"19",  nombre:"Pedro Arrebola",           cat:"SBK Senior" },
  { num:"28",  nombre:"Elgar Eliot",              cat:"SBK Senior" },
  { num:"45",  nombre:"Luis Martinez",            cat:"SBK Senior" },
  { num:"56",  nombre:"Rodrigo Fontecilla",       cat:"SBK Senior" },
  { num:"65",  nombre:"Miguel Solorza",           cat:"SBK Senior" },
  { num:"98",  nombre:"Alejandro Bonello",        cat:"SBK Senior" },
  { num:"2",   nombre:"Walter Rebolledo",         cat:"SBK Senior" },
  { num:"43",  nombre:"Sergio Cocha",             cat:"SBK Amateur" },
  { num:"22",  nombre:"Gabriel Juan",             cat:"SBK Amateur" },
  { num:"121", nombre:"Gaston Martinez",          cat:"Sportbike" },
  { num:"34",  nombre:"Ignacio Lemos",            cat:"Sportbike" },
  { num:"32",  nombre:"Valentin Valor",           cat:"Sportbike" },
  { num:"28",  nombre:"Mateo Bongiovanni",        cat:"SBK Pro" },
  { num:"11",  nombre:"Claudio Lopez",            cat:"SBK Pro" },
  { num:"73",  nombre:"Tomas Cassano",            cat:"SBK Pro" },
  { num:"52",  nombre:"Juan Solorza",             cat:"SBK Pro" },
  { num:"123", nombre:"Maximiliano Rocha",        cat:"SBK Pro" },
  { num:"33",  nombre:"Alberto Auad Cavallotti",  cat:"SBK Pro" },
  { num:"26",  nombre:"Maximiliano Fontecilla",   cat:"SBK Pro" },
  { num:"21",  nombre:"Guillermo Chamorro",       cat:"SBK Pro" },
  { num:"36",  nombre:"Hernan Buezas",            cat:"SBK Pro" },
];

const CATEGORIAS = [...new Set(PILOTOS_DB.map(p => p.cat))];

const STOCK0 = {
  m110sc1: { bodega:13, flotante:0 },
  m140sc1: { bodega:13, flotante:0 },
  m120sc1: { bodega:38, flotante:0 },
  m180sc2: { bodega:6,  flotante:0 },
  m200sc1: { bodega:80, flotante:0 },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getPrecio(prod, moneda) {
  if (!prod) return 0;
  if (moneda === "ARS") return prod.precios.ARS;
  return prod.precios.USD;
}

function fmt(val, moneda) {
  const n = Number(val).toLocaleString("es-AR");
  if (moneda === "ARS") return "$ " + n + " ARS";
  return "USD " + n;
}

function simbolo(moneda) {
  if (moneda === "ARS") return "🇦🇷 Pesos ARS";
  return "💵 Dólares USD";
  return moneda;
}

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────
function exportCSV(ventas, stock) {
  const S = ";"; const BOM = "\uFEFF";
  const cols = ["Fecha","Circuito","N°","Piloto","Categoria","Neumatico","Cant","Moneda","Precio unit","Total","Metodo","Email","Factura","CUIT","Empresa"];
  const row = v => {
    const p = PRODUCTOS.find(x => x.id === v.prod_id);
    const c = CIRCUITOS.find(x => x.id === v.circ_id);
    return [v.fecha, c?.nombre, v.num_piloto, v.piloto, v.categoria,
            p?.label, v.cantidad, v.moneda, v.precio_unit, v.total_monto,
            v.metodo, v.email_cliente, v.tipo_factura === "FAC" ? "Factura" : "Cons.Final",
            v.cuit || "", v.empresa || ""].join(S);
  };
  const cf  = ventas.filter(v => v.tipo_factura === "CF");
  const fac = ventas.filter(v => v.tipo_factura === "FAC");
  const stockRows = PRODUCTOS.map(p =>
    [p.label, stock[p.id]?.bodega ?? 0, stock[p.id]?.flotante ?? 0,
     (stock[p.id]?.bodega ?? 0) + (stock[p.id]?.flotante ?? 0)].join(S)
  );
  const csv = BOM + [
    "TODAS LAS VENTAS", cols.join(S), ...ventas.map(row),
    "", "CONSUMIDOR FINAL", cols.join(S), ...cf.map(row),
    "", "FACTURAS EMPRESA", cols.join(S), ...fac.map(row),
    "", "STOCK ACTUAL", ["Producto","Bodega Pirelli","Stock Flotante","Total"].join(S), ...stockRows,
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8;" }));
  a.download = "GP3_Neumaticos_" + new Date().toISOString().slice(0,10) + ".csv";
  a.click();
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function LogoGP3() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0 }}>
      <div style={{ background:"white", borderRadius:"10px 0 0 10px", padding:"4px 12px 4px 10px", display:"flex", alignItems:"center" }}>
        <span style={{ fontFamily:"'Arial Black',Impact,Arial,sans-serif", fontSize:40, fontWeight:900, color:"#0a0a0a", letterSpacing:-3, lineHeight:1 }}>GP</span>
      </div>
      <div style={{ background:R, borderRadius:"0 8px 8px 0", padding:"0 10px 0 8px", display:"flex", alignItems:"center", transform:"skewX(-8deg)", height:50, marginLeft:-4 }}>
        <span style={{ fontFamily:"'Arial Black',Impact,Arial,sans-serif", fontSize:48, fontWeight:900, color:"white", letterSpacing:-4, lineHeight:1, display:"inline-block", transform:"skewX(8deg)" }}>3</span>
      </div>
      <div style={{ marginLeft:10, display:"flex", flexDirection:"column", gap:2 }}>
        <span style={{ fontSize:9, letterSpacing:3, color:GR2, textTransform:"uppercase" }}>SPORTS LATAM</span>
        <span style={{ fontSize:9, letterSpacing:2, color:R, textTransform:"uppercase", fontWeight:700 }}>NEUMATICOS PIRELLI</span>
      </div>
    </div>
  );
}

// ─── FORM DEFAULT ─────────────────────────────────────────────────────────────
const FORM0 = {
  circ_id:    CIRCUITOS[0].id,
  fecha:      CIRCUITOS[0].dateISO,
  piloto:     "",
  num_piloto: "",
  categoria:  CATEGORIAS[0],
  moneda:     "USD",
  metodo:     "efectivo",
  email_cliente: "",
  tipo_factura:  "CF",
  cuit:       "",
  empresa:    "",
};

// ═══════════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [modo,     setModo]     = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Persistencia con localStorage
  const [ventas, setVentas] = useState(() => {
    try {
      const saved = localStorage.getItem('gp3_ventas');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [stock, setStock] = useState(() => {
    try {
      const saved = localStorage.getItem('gp3_stock');
      return saved ? JSON.parse(saved) : STOCK0;
    } catch { return STOCK0; }
  });

  const [pilotosExtra, setPilotosExtra] = useState(() => {
    try {
      const saved = localStorage.getItem('gp3_pilotos');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [categoriasExtra, setCategoriasExtra] = useState(() => {
    try {
      const saved = localStorage.getItem('gp3_categorias');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [preciosEdit, setPreciosEdit] = useState(() => {
    try {
      const saved = localStorage.getItem('gp3_precios');
      return saved ? JSON.parse(saved) : Object.fromEntries(PRODUCTOS.map(p=>([p.id, {...p.precios}])));
    } catch { return Object.fromEntries(PRODUCTOS.map(p=>([p.id, {...p.precios}]))); }
  });
  const [tab,      setTab]      = useState("venta");
  const [filtro,   setFiltro]   = useState("todos");
  const [toast,    setToast]    = useState(null);

  // Form de venta
  const [form,     setForm]     = useState(FORM0);
  const [pilotoQ,  setPilotoQ]  = useState("");
  const [showSug,  setShowSug]  = useState(false);

  // Carrito: array de { prod_id, cantidad }
  // Los precios se calculan siempre en tiempo real desde form.moneda
  const [carrito, setCarrito] = useState([]);

  // Cantidades del selector por producto
  const [cantSel, setCantSel] = useState(
    Object.fromEntries(PRODUCTOS.map(p => [p.id, 1]))
  );

  const boom = (msg, err=false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  // Helpers para guardar en localStorage
  const saveStock = (newStock) => {
    try { localStorage.setItem('gp3_stock', JSON.stringify(newStock)); } catch {}
    setStock(newStock);
  };
  const savePilotos = (arr) => {
    try { localStorage.setItem('gp3_pilotos', JSON.stringify(arr)); } catch {}
    setPilotosExtra(arr);
  };
  const saveCategorias = (arr) => {
    try { localStorage.setItem('gp3_categorias', JSON.stringify(arr)); } catch {}
    setCategoriasExtra(arr);
  };
  const savePrecios = (obj) => {
    try { localStorage.setItem('gp3_precios', JSON.stringify(obj)); } catch {}
    setPreciosEdit(obj);
  };
  const clearAllData = () => {
    if (!window.confirm('¿Seguro que querés borrar TODAS las ventas del historial?')) return;
    localStorage.removeItem('gp3_ventas');
    setVentas([]);
    boom('Historial de ventas borrado');
  };

  // ── Sugerencias piloto ──────────────────────────────────────────────────────
  // Combinar pilotos base + extras agregados desde admin
  const todosLosPilotos = useMemo(() => [...PILOTOS_DB, ...pilotosExtra], [pilotosExtra]);
  const todasLasCategorias = useMemo(() => [...new Set([...CATEGORIAS, ...categoriasExtra])], [categoriasExtra]);

  const sugerencias = useMemo(() => {
    if (pilotoQ.length < 2) return [];
    const q = pilotoQ.toLowerCase();
    return todosLosPilotos.filter(p =>
      p.nombre.toLowerCase().includes(q) || p.num.includes(q)
    ).slice(0, 8);
  }, [pilotoQ, todosLosPilotos]);

  const selPiloto = p => {
    setForm(f => ({ ...f, piloto:p.nombre, num_piloto:p.num, categoria:p.cat }));
    setPilotoQ(p.nombre);
    setShowSug(false);
  };

  // ── Carrito helpers ─────────────────────────────────────────────────────────
  const agregarProducto = prodId => {
    const cant = cantSel[prodId] ?? 1;
    const enCar = carrito.find(i => i.prod_id === prodId)?.cantidad ?? 0;
    const dispStock = (stock[prodId]?.bodega ?? 0) + (stock[prodId]?.flotante ?? 0);
    if (cant + enCar > dispStock) {
      const p = PRODUCTOS.find(x => x.id === prodId);
      boom("Stock insuficiente para " + p?.label, true);
      return;
    }
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.prod_id === prodId);
      if (idx >= 0) {
        const u = [...prev];
        u[idx] = { ...u[idx], cantidad: u[idx].cantidad + cant };
        return u;
      }
      return [...prev, { prod_id:prodId, cantidad:cant }];
    });
    const p = PRODUCTOS.find(x => x.id === prodId);
    boom(p?.label + " ×" + cant + " agregado");
    setCantSel(c => ({ ...c, [prodId]:1 }));
  };

  const quitarItem = idx => setCarrito(prev => prev.filter((_,i) => i !== idx));

  // Precios del carrito calculados SIEMPRE en la moneda actual
  const carritoConPrecios = carrito.map(item => {
    const p    = PRODUCTOS.find(x => x.id === item.prod_id);
    const pu   = getPrecio(p, form.moneda);
    return { ...item, prod:p, precio_unit:pu, total:pu * item.cantidad };
  });

  const carritoTotal  = carritoConPrecios.reduce((s, i) => s + i.total, 0);
  const carritoUnits  = carrito.reduce((s, i) => s + i.cantidad, 0);

  // ── Registrar venta ─────────────────────────────────────────────────────────
  const registrar = () => {
    if (!form.piloto.trim())           { boom("Ingresa el nombre del piloto", true); return; }
    if (!form.email_cliente.trim())    { boom("Ingresa el email del cliente", true); return; }
    if (form.tipo_factura === "FAC" && !form.cuit.trim()) { boom("Ingresa el CUIT para factura", true); return; }
    if (carrito.length === 0)          { boom("Agrega al menos un neumático al carrito", true); return; }

    const nuevasVentas = carritoConPrecios.map(item => ({
      id:            Date.now() + Math.random(),
      circ_id:       form.circ_id,
      fecha:         form.fecha,
      piloto:        form.piloto,
      num_piloto:    form.num_piloto,
      categoria:     form.categoria,
      email_cliente: form.email_cliente,
      tipo_factura:  form.tipo_factura,
      cuit:          form.cuit,
      empresa:       form.empresa,
      metodo:        form.metodo,
      prod_id:       item.prod_id,
      cantidad:      item.cantidad,
      moneda:        form.moneda,
      precio_unit:   item.precio_unit,
      total_monto:   item.total,
    }));

    const ventasActualizadas = [...nuevasVentas, ...ventas];
    setVentas(prev => {
      const updated = [...nuevasVentas, ...prev];
      try { localStorage.setItem('gp3_ventas', JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Descontar stock inmediato: primero flotante, luego bodega
    setStock(prev => {
      let s = { ...prev };
      carrito.forEach(item => {
        s = { ...s, [item.prod_id]: { ...s[item.prod_id] } };
        let r = item.cantidad;
        const df = Math.min(r, s[item.prod_id].flotante ?? 0);
        s[item.prod_id].flotante = (s[item.prod_id].flotante ?? 0) - df;
        r -= df;
        s[item.prod_id].bodega = Math.max(0, (s[item.prod_id].bodega ?? 0) - r);
      });
      try { localStorage.setItem('gp3_stock', JSON.stringify(s)); } catch {}
      return s;
    });

    boom("✓ Venta confirmada — " + carritoUnits + " neumático" + (carritoUnits !== 1 ? "s" : "") + " — " + fmt(carritoTotal, form.moneda));

    // Reset para siguiente cliente
    setCarrito([]);
    setForm({ ...FORM0 });
    setPilotoQ("");
    setShowSug(false);
    setCantSel(Object.fromEntries(PRODUCTOS.map(p => [p.id, 1])));
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const vF = filtro === "todos" ? ventas : ventas.filter(v => v.circ_id === filtro);
  const totales = {};
  ventas.forEach(v => { totales[v.moneda] = (totales[v.moneda] || 0) + v.total_monto; });
  const totUni = vF.reduce((s, v) => s + v.cantidad, 0);

  // ── Agrupación por piloto para el panel derecho ────────────────────────────
  const porPiloto = useMemo(() => {
    const grupos = [];
    ventas.forEach(v => {
      const key = v.piloto + "_" + v.num_piloto;
      const g = grupos.find(x => x.key === key);
      if (g) {
        g.items.push(v);
      } else {
        grupos.push({
          key, piloto:v.piloto, num_piloto:v.num_piloto,
          categoria:v.categoria, email:v.email_cliente,
          tipo_factura:v.tipo_factura, cuit:v.cuit,
          circ_id:v.circ_id, items:[v]
        });
      }
    });
    return grupos;
  }, [ventas]);

  // ════════════════════════════════════════════
  // PANTALLA LOGIN
  // ════════════════════════════════════════════
  if (!modo) return (
    <div style={{ minHeight:"100vh", background:"#1a0a2e", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:32, fontFamily:"'Barlow Condensed','Arial Narrow',Arial,sans-serif" }}>
      <LogoGP3 />
      <div style={{ fontSize:11, letterSpacing:4, color:CEL, textTransform:"uppercase" }}>CAV — Campeonato Argentino de Velocidad 2026</div>
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center" }}>

        <div style={loginCard}>
          <div style={{ fontSize:36, marginBottom:10 }}>🛒</div>
          <div style={{ fontSize:18, fontWeight:900, color:"white", letterSpacing:2, marginBottom:6 }}>MODO VENTA</div>
          <div style={{ fontSize:12, color:GR2, marginBottom:20 }}>Registrar ventas de neumáticos</div>
          <button onClick={() => { setModo("vendedor"); setTab("venta"); }}
            style={{ ...btnBase, background:R, color:"white", width:"100%" }}>
            INGRESAR
          </button>
        </div>

        <div style={loginCard}>
          <div style={{ fontSize:36, marginBottom:10 }}>📊</div>
          <div style={{ fontSize:18, fontWeight:900, color:"white", letterSpacing:2, marginBottom:6 }}>MODO ADMIN</div>
          <div style={{ fontSize:12, color:GR2, marginBottom:12 }}>Estadísticas, stock y cierre de día</div>
          <input type="password" placeholder="PIN de acceso" value={pinInput}
            onChange={e => { setPinInput(e.target.value); setPinError(false); }}
            onKeyDown={e => e.key === "Enter" && (() => {
              if (pinInput === ADMIN_PIN) { setModo("admin"); } else { setPinError(true); }
            })()}
            style={{ ...inpStyle, marginBottom:8 }} />
          {pinError && <div style={{ fontSize:11, color:R, marginBottom:8 }}>PIN incorrecto</div>}
          <button onClick={() => {
            if (pinInput === ADMIN_PIN) { setModo("admin"); } else { setPinError(true); }
          }} style={{ ...btnBase, background:CEL, color:BK, width:"100%" }}>
            INGRESAR
          </button>
        </div>
      </div>
    </div>
  );

  const isAdmin = modo === "admin";

  // ════════════════════════════════════════════
  // APP PRINCIPAL
  // ════════════════════════════════════════════
  return (
    <div style={{ minHeight:"100vh", background:BK, color:"#f0f0f0", fontFamily:"'Barlow Condensed','Arial Narrow',Arial,sans-serif" }}>

      {/* HEADER */}
      <header style={{ background:"linear-gradient(180deg,#1a1a1a,#2a0000)", borderBottom:"3px solid " + R, padding:"12px 24px", display:"flex", flexWrap:"wrap", gap:16, alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <LogoGP3 />
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:16, fontWeight:900, color:CEL, letterSpacing:4 }}>CAV</span>
            <span style={{ fontSize:10, color:GR2, letterSpacing:2, textTransform:"uppercase" }}>Campeonato Argentino de Velocidad 2026</span>
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4,
              color: isAdmin ? CEL : R,
              background: isAdmin ? "rgba(255,255,255,0.08)" : "rgba(232,0,29,0.1)",
              border: "1px solid " + (isAdmin ? CEL : R) }}>
              {isAdmin ? "ADMIN" : "VENDEDOR"}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          {isAdmin && ["USD","ARS"].map(m => totales[m] ? (
            <KPI key={m} label={simbolo(m)} val={fmt(totales[m], m)} c={m==="ARS"?CEL:"#4caf50"} />
          ) : null)}
          <KPI label="Ventas" val={ventas.length} c="white" />
          <button onClick={() => { setModo(null); setPinInput(""); }}
            style={{ background:"transparent", border:"1px solid "+GR3, color:GR2, padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:12 }}>
            Salir
          </button>
        </div>
      </header>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:9999, padding:"12px 24px", borderRadius:8, fontWeight:800, fontSize:14, color:"white", background: toast.err ? R : "#0a6e0a", boxShadow:"0 8px 32px rgba(0,0,0,.6)" }}>
          {toast.msg}
        </div>
      )}

      {/* NAV */}
      <nav style={{ background:BK2, borderBottom:"1px solid "+BK4, padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[["venta","🛒 Venta"], ...(isAdmin ? [["stock","📦 Stock"],["estadisticas","📊 Estadísticas"],["cierre","🗂 Cierre del Día"],["pilotos","⚙️ Gestión"]] : [])].map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ background: tab===id ? R : "transparent", border:"1px solid "+(tab===id ? R : GR3), color: tab===id ? "white" : GR2, padding:"9px 20px", borderRadius:6, cursor:"pointer", fontSize:14, fontWeight:700 }}>
              {lbl}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button onClick={() => exportCSV(ventas, stock)}
            style={{ background:"transparent", border:"1px solid "+CEL, color:CEL, padding:"9px 18px", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Exportar Excel
          </button>
        )}
      </nav>

      <main style={{ padding:"24px", maxWidth:1440, margin:"0 auto" }}>

        {/* ══════════ VENTA ══════════ */}
        {tab === "venta" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

            {/* ── Columna izquierda: formulario ── */}
            <div style={cardStyle}>
              <ST>Nueva Venta</ST>

              {/* Circuito */}
              <Fld label="Fecha del Campeonato">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:6 }}>
                  {CIRCUITOS.map(c => (
                    <button key={c.id} onClick={() => setForm(f => ({ ...f, circ_id:c.id, fecha:c.dateISO }))}
                      style={{ display:"flex", flexDirection:"column", gap:2, padding:"9px 12px", borderRadius:8, cursor:"pointer", textAlign:"left", border:"1px solid "+(form.circ_id===c.id ? R : BK4), background: form.circ_id===c.id ? "rgba(168,85,247,0.15)" : BK3 }}>
                      <span style={{ fontSize:10, color: form.circ_id===c.id ? R : GR2, fontWeight:900 }}>{c.num}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"white", lineHeight:1.2 }}>{c.nombre}</span>
                      <span style={{ fontSize:10, color:GR2 }}>{c.fecha}</span>
                    </button>
                  ))}
                </div>
              </Fld>

              {/* Piloto */}
              <Fld label="Piloto — nombre o número">
                <div style={{ position:"relative" }}>
                  <input style={inpStyle} type="text" placeholder="Ej: Romero o 64..."
                    value={pilotoQ}
                    onChange={e => { setPilotoQ(e.target.value); setShowSug(true); setForm(f => ({ ...f, piloto:e.target.value, num_piloto:"" })); }}
                    onFocus={() => setShowSug(true)} />
                  {showSug && sugerencias.length > 0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, background:BK2, border:"1px solid "+CEL, borderRadius:"0 0 8px 8px", zIndex:100, maxHeight:220, overflowY:"auto" }}>
                      {sugerencias.map((p, i) => (
                        <div key={i} onMouseDown={() => selPiloto(p)}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid "+BK4, fontSize:13 }}>
                          <span style={{ color:CEL, fontWeight:900, minWidth:34, fontFamily:"monospace" }}>{"#"+p.num}</span>
                          <span style={{ fontWeight:700 }}>{p.nombre}</span>
                          <span style={{ marginLeft:"auto", fontSize:11, color:GR2 }}>{p.cat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {form.piloto && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, background:BK3, border:"1px solid "+CEL, borderRadius:8, padding:"8px 12px", marginTop:6, flexWrap:"wrap" }}>
                    <span style={{ color:CEL, fontFamily:"monospace", fontWeight:900 }}>{"#"+(form.num_piloto||"—")}</span>
                    <span style={{ fontWeight:800 }}>{form.piloto}</span>
                    <Chip c={R}>{form.categoria}</Chip>
                    <button onClick={() => { setForm(f => ({ ...f, piloto:"", num_piloto:"" })); setPilotoQ(""); }}
                      style={{ marginLeft:"auto", background:"transparent", border:"none", color:GR3, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
                  </div>
                )}
              </Fld>

              <Fld label="Categoría">
                <select style={inpStyle} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria:e.target.value }))}>
                  {todasLasCategorias.map(c => <option key={c}>{c}</option>)}
                </select>
              </Fld>

              {/* MONEDA — elige PRIMERO la moneda, los precios se actualizan solos */}
              <Fld label="① Elegí la moneda — los precios cambian automáticamente">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[["USD","💵","Dólares","#4caf50"],["ARS","🇦🇷","Pesos ARS",CEL]].map(([m,ico,lbl,c]) => {
                    const activa = form.moneda === m;
                    return (
                      <button key={m} onClick={() => setForm(f => ({ ...f, moneda:m }))}
                        style={{ padding:"16px 0", borderRadius:8, cursor:"pointer", fontWeight:900, fontSize:16, border:"3px solid "+(activa ? c : BK4), background: activa ? c+"33" : BK3, color: activa ? "white" : GR2, transition:"all .15s" }}>
                        <div style={{ fontSize:24 }}>{ico}</div>
                        <div style={{ fontSize:14, marginTop:4, fontWeight:900 }}>{m}</div>
                        <div style={{ fontSize:11, color: activa ? c : GR2, marginTop:2 }}>{lbl}</div>
                        {activa && <div style={{ fontSize:10, color:c, marginTop:2, fontWeight:700 }}>✓ ACTIVA</div>}
                      </button>
                    );
                  })}
                </div>
              </Fld>

              {/* PRODUCTOS — precios en la moneda seleccionada arriba */}
              {/* Indicador de moneda activa */}
              <div style={{ background: form.moneda==="ARS"?"rgba(255,255,255,0.08)":"rgba(76,175,80,0.1)", border:"1px solid "+(form.moneda==="ARS"?CEL:"#4caf50"), borderRadius:8, padding:"10px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22 }}>{form.moneda==="ARS"?"🇦🇷":"💵"}</span>
                <div>
                  <div style={{ fontWeight:900, color:"white", fontSize:15 }}>Precios en {form.moneda==="ARS"?"Pesos Argentinos (ARS)":"Dólares (USD)"}</div>
                  <div style={{ fontSize:11, color:GR2 }}>Seleccioná la moneda antes de agregar al carrito</div>
                </div>
              </div>

              {/* PRODUCTOS con cantidades inline */}
              <Fld label="Neumáticos — seleccioná cantidad y agregá al carrito">
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {PRODUCTOS.map(p => {
                    // precio SIEMPRE calculado con la moneda actual
                    const precio    = getPrecio(p, form.moneda);
                    const enCarrito = carrito.find(i => i.prod_id === p.id)?.cantidad ?? 0;
                    const dispStock = (stock[p.id]?.bodega ?? 0) + (stock[p.id]?.flotante ?? 0);
                    const cant      = cantSel[p.id] ?? 1;
                    return (
                      <div key={p.id} style={{ background:BK3, border:"1px solid "+(enCarrito>0 ? "#4caf50" : BK4), borderRadius:8, padding:"10px 12px" }}>
                        {/* Nombre + precio */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <Chip c={p.tipo==="Trasero" ? CEL : R}>{p.tipo}</Chip>
                            <span style={{ fontWeight:700, color:"white", fontSize:14 }}>{p.label}</span>
                            {enCarrito > 0 && <span style={{ fontSize:11, color:"#4caf50", fontWeight:700 }}>{"✓ "+enCarrito+" en carrito"}</span>}
                          </div>
                          {/* Precio reactivo a moneda */}
                          <span style={{ fontFamily:"monospace", fontWeight:900, color:CEL, fontSize:16 }}>{fmt(precio, form.moneda)}</span>
                        </div>
                        {/* Stock + controles */}
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:11, color: dispStock<=5?"#FF4400":"#4caf50" }}>{"Stock: "+dispStock}</span>
                          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:4 }}>
                            <button onClick={() => setCantSel(c => ({ ...c, [p.id]:Math.max(1,(c[p.id]??1)-1) }))}
                              style={cantBtn}>−</button>
                            <span style={{ minWidth:28, textAlign:"center", fontWeight:900, fontSize:16, color:"white" }}>{cant}</span>
                            <button onClick={() => setCantSel(c => ({ ...c, [p.id]:(c[p.id]??1)+1 }))}
                              style={cantBtn}>+</button>
                            <button onClick={() => agregarProducto(p.id)}
                              style={{ background:R, border:"none", color:"white", borderRadius:6, padding:"7px 14px", cursor:"pointer", fontWeight:900, fontSize:13 }}>
                              + Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Fld>

              {/* Método de pago */}
              <Fld label="Método de Pago">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[["efectivo","💵 Efectivo"],["transferencia","🏦 Transferencia"],["debito","💳 Débito"],["credito","💳 Crédito"]].map(([id,lbl]) => (
                    <button key={id} onClick={() => setForm(f => ({ ...f, metodo:id }))}
                      style={{ padding:"10px 0", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13, border:"1px solid "+(form.metodo===id ? R : BK4), background: form.metodo===id ? "rgba(168,85,247,0.15)" : BK3, color: form.metodo===id ? "white" : GR2 }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Fld>

              {/* Email */}
              <Fld label="Email del Cliente">
                <input type="email" style={inpStyle} placeholder="cliente@correo.com"
                  value={form.email_cliente} onChange={e => setForm(f => ({ ...f, email_cliente:e.target.value }))} />
              </Fld>

              {/* Tipo facturación */}
              <Fld label="Tipo de Facturación">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <button onClick={() => setForm(f => ({ ...f, tipo_factura:"CF", cuit:"", empresa:"" }))}
                    style={{ padding:"12px 0", borderRadius:8, cursor:"pointer", fontWeight:900, fontSize:13, border:"2px solid "+(form.tipo_factura==="CF" ? "#4caf50" : BK4), background: form.tipo_factura==="CF" ? "rgba(76,175,80,0.1)" : BK3, color: form.tipo_factura==="CF" ? "white" : GR2 }}>
                    👤 Consumidor Final
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, tipo_factura:"FAC" }))}
                    style={{ padding:"12px 0", borderRadius:8, cursor:"pointer", fontWeight:900, fontSize:13, border:"2px solid "+(form.tipo_factura==="FAC" ? CEL : BK4), background: form.tipo_factura==="FAC" ? "rgba(255,255,255,0.08)" : BK3, color: form.tipo_factura==="FAC" ? "white" : GR2 }}>
                    🏢 Factura Empresa
                  </button>
                </div>
              </Fld>

              {form.tipo_factura === "FAC" && (
                <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid "+CEL, borderRadius:10, padding:14, marginBottom:14 }}>
                  <div style={{ fontSize:10, color:CEL, letterSpacing:2, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>Datos de Facturación</div>
                  <Fld label="CUIT">
                    <input type="text" style={inpStyle} placeholder="20-12345678-9"
                      value={form.cuit} onChange={e => setForm(f => ({ ...f, cuit:e.target.value }))} />
                  </Fld>
                  <Fld label="Razón Social / Empresa">
                    <input type="text" style={inpStyle} placeholder="Nombre de la empresa"
                      value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa:e.target.value }))} />
                  </Fld>
                </div>
              )}

              {/* CARRITO */}
              {carrito.length > 0 && (
                <div style={{ background:"rgba(255,255,255,0.05)", border:"2px solid "+CEL, borderRadius:10, padding:14, marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:900, color:CEL, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
                    {"Carrito — " + carritoUnits + " neumático" + (carritoUnits!==1?"s":"")}
                  </div>
                  {carritoConPrecios.map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid "+BK4 }}>
                      <div>
                        <span style={{ fontWeight:700, color:"white" }}>{item.prod?.label}</span>
                        <span style={{ marginLeft:8, fontSize:12, color:GR2 }}>{"×"+item.cantidad}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontWeight:900, color:CEL, fontFamily:"monospace" }}>{fmt(item.total, form.moneda)}</span>
                        <button onClick={() => quitarItem(i)}
                          style={{ background:"transparent", border:"1px solid "+GR3, color:GR3, borderRadius:4, padding:"2px 7px", cursor:"pointer", fontSize:13 }}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
                    <span style={{ fontWeight:900, color:"white", fontSize:15 }}>TOTAL</span>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900, color:R, fontSize:28, fontFamily:"monospace" }}>{fmt(carritoTotal, form.moneda)}</div>
                      <div style={{ fontSize:11, color:GR2 }}>{simbolo(form.moneda)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* BOTÓN CONFIRMAR */}
              <button onClick={registrar}
                style={{ width:"100%", padding:16, background: carrito.length>0 ? R : GR3, color:"white", border:"none", borderRadius:8, fontSize:16, fontWeight:900, letterSpacing:2, cursor: carrito.length>0 ? "pointer" : "not-allowed", textTransform:"uppercase" }}>
                {carrito.length > 0
                  ? "CONFIRMAR VENTA — " + carritoUnits + " NEUMÁTICO" + (carritoUnits!==1?"S":"") + " — " + fmt(carritoTotal, form.moneda)
                  : "AGREGA NEUMÁTICOS AL CARRITO"}
              </button>
            </div>

            {/* ── Columna derecha: compras del día agrupadas por piloto ── */}
            <div style={cardStyle}>
              <ST>{"Compras del Día — " + ventas.length + " registros"}</ST>
              {porPiloto.length === 0
                ? <Empty>Sin ventas registradas</Empty>
                : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:900, overflowY:"auto", paddingRight:4 }}>
                    {porPiloto.map(g => {
                      const totPorMoneda = {};
                      g.items.forEach(v => { totPorMoneda[v.moneda] = (totPorMoneda[v.moneda]||0) + v.total_monto; });
                      const circ = CIRCUITOS.find(x => x.id === g.circ_id);
                      const unidades = g.items.reduce((s,v) => s+v.cantidad, 0);
                      return (
                        <div key={g.key} style={{ background:BK3, border:"1px solid "+BK4, borderRadius:10, padding:"14px 16px", borderLeft:"3px solid "+R }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                            <div>
                              <div>
                                <span style={{ color:CEL, fontFamily:"monospace", fontWeight:900, fontSize:16, marginRight:8 }}>{"#"+(g.num_piloto||"—")}</span>
                                <span style={{ fontWeight:900, fontSize:17, color:"white" }}>{g.piloto}</span>
                              </div>
                              <div style={{ fontSize:11, color:GR2, marginTop:2 }}>{g.email}</div>
                              <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
                                <Chip c={CEL}>{g.categoria}</Chip>
                                <Chip c="#555">{circ?.num+" "+circ?.nombre}</Chip>
                                <Chip c={g.tipo_factura==="FAC" ? CEL : "#4caf50"}>{g.tipo_factura==="FAC" ? "FAC — "+g.cuit : "Cons. Final"}</Chip>
                              </div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              {Object.entries(totPorMoneda).map(([m,t]) => (
                                <div key={m} style={{ fontWeight:900, color:R, fontSize:18, fontFamily:"monospace" }}>{fmt(t,m)}</div>
                              ))}
                              <div style={{ fontSize:11, color:GR2 }}>{unidades+" neumático"+(unidades!==1?"s":"")}</div>
                            </div>
                          </div>
                          <div style={{ borderTop:"1px solid "+BK4, paddingTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                            {g.items.map((v, i) => {
                              const p = PRODUCTOS.find(x => x.id === v.prod_id);
                              return (
                                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <Chip c={p?.tipo==="Trasero" ? CEL : R}>{p?.tipo}</Chip>
                                    <span style={{ color:"white", fontWeight:700 }}>{p?.label}</span>
                                    <span style={{ color:GR2 }}>{"×"+v.cantidad}</span>
                                  </div>
                                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                    <span style={{ color:CEL, fontWeight:700, fontFamily:"monospace" }}>{fmt(v.total_monto,v.moneda)}</span>
                                    <Chip c="#444">{v.metodo.toUpperCase()}</Chip>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* ══════════ STOCK (admin) ══════════ */}
        {tab === "stock" && isAdmin && (
          <div>
            <div style={cardStyle}>
              <ST>Control de Stock Pirelli</ST>
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid "+BK4, borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12 }}>
                <span style={{ color:CEL, fontWeight:700 }}>Bodega Pirelli</span>{" — depósito.  "}
                <span style={{ color:"#4caf50", fontWeight:700 }}>Stock Flotante</span>{" — neumáticos en pista listos para vender."}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 130px 80px 160px", padding:"8px 12px", fontSize:10, color:GR3, textTransform:"uppercase", letterSpacing:1, borderBottom:"1px solid "+BK4, gap:8 }}>
                <span>Neumático</span>
                <span style={{ textAlign:"center" }}>Bodega Pirelli</span>
                <span style={{ textAlign:"center" }}>Stock Flotante</span>
                <span style={{ textAlign:"center" }}>Total</span>
                <span style={{ textAlign:"center" }}>Mover</span>
              </div>
              {PRODUCTOS.map(p => {
                const s   = stock[p.id];
                const tot = (s.bodega ?? 0) + (s.flotante ?? 0);
                const alrt = tot <= 5;
                return (
                  <div key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr 120px 130px 80px 160px", padding:"12px", borderBottom:"1px solid "+BK3, gap:8, alignItems:"center", background: alrt ? "rgba(168,85,247,0.08)" : "transparent" }}>
                    <div>
                      <div style={{ fontWeight:700 }}>{p.label}</div>
                      <div style={{ fontSize:11, color:GR2 }}>{"USD "+p.precios.USD+" / ARS "+p.precios.ARS.toLocaleString()}</div>
                    </div>
                    {/* Bodega */}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:24, fontWeight:900, color:CEL, fontFamily:"monospace" }}>{s.bodega}</div>
                      <div style={{ display:"flex", gap:4, justifyContent:"center", marginTop:4 }}>
                        <MBtn c={CEL} onClick={() => { const s={...stock,[p.id]:{...stock[p.id],bodega:stock[p.id].bodega+1}}; saveStock(s); }}>+</MBtn>
                        <MBtn c={R}   onClick={() => { const s={...stock,[p.id]:{...stock[p.id],bodega:Math.max(0,stock[p.id].bodega-1)}}; saveStock(s); }}>−</MBtn>
                      </div>
                    </div>
                    {/* Flotante */}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:24, fontWeight:900, color:"#4caf50", fontFamily:"monospace" }}>{s.flotante ?? 0}</div>
                      <div style={{ display:"flex", gap:4, justifyContent:"center", marginTop:4 }}>
                        <MBtn c="#4caf50" onClick={() => { const s={...stock,[p.id]:{...stock[p.id],flotante:(stock[p.id].flotante??0)+1}}; saveStock(s); }}>+</MBtn>
                        <MBtn c={R}       onClick={() => { const s={...stock,[p.id]:{...stock[p.id],flotante:Math.max(0,(stock[p.id].flotante??0)-1)}}; saveStock(s); }}>−</MBtn>
                      </div>
                    </div>
                    {/* Total */}
                    <div style={{ textAlign:"center", fontSize:24, fontWeight:900, fontFamily:"monospace", color: alrt ? R : "white" }}>{tot}</div>
                    {/* Mover */}
                    <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                      <MBtn c={CEL} onClick={() => setStock(prev => {
                        if (!prev[p.id].bodega) return prev;
                        return { ...prev, [p.id]:{ bodega:prev[p.id].bodega-1, flotante:(prev[p.id].flotante??0)+1 } };
                      })}>B→F</MBtn>
                      <MBtn c={GR3} onClick={() => setStock(prev => {
                        if (!(prev[p.id].flotante??0)) return prev;
                        return { ...prev, [p.id]:{ bodega:prev[p.id].bodega+1, flotante:(prev[p.id].flotante??0)-1 } };
                      })}>F→B</MBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ ESTADÍSTICAS (admin) ══════════ */}
        {tab === "estadisticas" && isAdmin && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {[["todos","Todos"], ...CIRCUITOS.map(c => [c.id, c.num+" "+c.nombre])].map(([id,lbl]) => (
                <button key={id} onClick={() => setFiltro(id)}
                  style={{ background: filtro===id ? "rgba(168,85,247,0.15)" : "transparent", border:"1px solid "+(filtro===id ? R : BK4), color: filtro===id ? "white" : GR2, padding:"7px 14px", borderRadius:20, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                  {lbl}
                </button>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16, marginBottom:20 }}>
              {["USD","ARS"].map(m => totales[m] ? (
                <BigKPI key={m} label={"Total "+simbolo(m)} val={fmt(totales[m],m)} c={m==="ARS"?CEL:"#4caf50"} />
              ) : null)}
              <BigKPI label="Unidades" val={totUni} c="white" />
              <BigKPI label="Cons. Final" val={ventas.filter(v=>v.tipo_factura==="CF").length} c="#4caf50" />
              <BigKPI label="Facturas" val={ventas.filter(v=>v.tipo_factura==="FAC").length} c={CEL} />
            </div>

            <div style={cardStyle}>
              <ST>{"Detalle — "+vF.length+" registros"}</ST>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:900 }}>
                  <thead>
                    <tr>{["Fecha","N°","Piloto","Cat.","Circuito","Neumático","Cant.","Moneda","Total","Pago","Email","Factura","CUIT"].map(h => (
                      <th key={h} style={{ padding:"9px 10px", textAlign:"left", fontSize:9, color:GR2, letterSpacing:2, textTransform:"uppercase", borderBottom:"2px solid "+R, whiteSpace:"nowrap" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {vF.length === 0
                      ? <tr><td colSpan={13} style={{ textAlign:"center", padding:32, color:GR3 }}>Sin ventas</td></tr>
                      : vF.map(v => {
                          const p = PRODUCTOS.find(x => x.id === v.prod_id);
                          const c = CIRCUITOS.find(x => x.id === v.circ_id);
                          return (
                            <tr key={v.id} style={{ borderBottom:"1px solid "+BK3 }}>
                              <td style={td}>{v.fecha}</td>
                              <td style={{ ...td, fontFamily:"monospace", color:CEL }}>{"#"+(v.num_piloto||"—")}</td>
                              <td style={{ ...td, fontWeight:700, color:"white" }}>{v.piloto}</td>
                              <td style={td}><Chip c={CEL}>{v.categoria}</Chip></td>
                              <td style={td}>{c?.nombre}</td>
                              <td style={td}>{p?.label}</td>
                              <td style={{ ...td, textAlign:"center" }}>{v.cantidad}</td>
                              <td style={td}><Chip c={v.moneda==="ARS"?CEL:"#4caf50"}>{v.moneda}</Chip></td>
                              <td style={{ ...td, color:R, fontWeight:900, fontFamily:"monospace" }}>{fmt(v.total_monto,v.moneda)}</td>
                              <td style={td}>{v.metodo}</td>
                              <td style={{ ...td, fontSize:11 }}>{v.email_cliente}</td>
                              <td style={td}><Chip c={v.tipo_factura==="FAC" ? CEL : "#4caf50"}>{v.tipo_factura==="FAC" ? "Factura" : "CF"}</Chip></td>
                              <td style={{ ...td, fontFamily:"monospace", fontSize:11 }}>{v.cuit||"—"}</td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>

            {/* ANÁLISIS POR MÉTODO DE PAGO */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginTop:20 }}>

              {/* Por método */}
              <div style={cardStyle}>
                <ST>Ventas por Método de Pago</ST>
                {(() => {
                  const metodos = {};
                  vF.forEach(v => {
                    if (!metodos[v.metodo]) metodos[v.metodo] = { usd:0, ars:0, unidades:0, count:0 };
                    if (v.moneda === "USD") metodos[v.metodo].usd += v.total_monto;
                    else metodos[v.metodo].ars += v.total_monto;
                    metodos[v.metodo].unidades += v.cantidad;
                    metodos[v.metodo].count++;
                  });
                  const labels = { efectivo:"💵 Efectivo", transferencia:"🏦 Transferencia", debito:"💳 Débito", credito:"💳 Crédito" };
                  return Object.entries(metodos).length === 0
                    ? <Empty>Sin ventas</Empty>
                    : Object.entries(metodos).map(([met, d]) => (
                      <div key={met} style={{ padding:"12px 0", borderBottom:"1px solid "+BK4 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontWeight:700, fontSize:15 }}>{labels[met]||met}</span>
                          <span style={{ fontSize:12, color:GR2 }}>{d.count+" venta"+(d.count!==1?"s":"")+" · "+d.unidades+" u."}</span>
                        </div>
                        <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                          {d.usd > 0 && <span style={{ fontWeight:900, color:"#4caf50", fontFamily:"monospace", fontSize:16 }}>{fmt(d.usd,"USD")}</span>}
                          {d.ars > 0 && <span style={{ fontWeight:900, color:CEL, fontFamily:"monospace", fontSize:16 }}>{fmt(d.ars,"ARS")}</span>}
                        </div>
                        {/* Barra proporcional */}
                        <div style={{ background:BK4, borderRadius:4, height:6, marginTop:8 }}>
                          <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#a855f7,#ffffff)", width: (vF.length>0?(d.count/vF.length*100).toFixed(0):0)+"%" }} />
                        </div>
                        <div style={{ fontSize:10, color:GR2, marginTop:2, textAlign:"right" }}>{vF.length>0?(d.count/vF.length*100).toFixed(1):0}% de las ventas</div>
                      </div>
                    ));
                })()}
                {/* Totales globales */}
                <div style={{ marginTop:14, paddingTop:12, borderTop:"2px solid "+R }}>
                  <div style={{ fontSize:10, color:GR2, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Totales Generales</div>
                  {totales["USD"] && <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}><span style={{ color:GR2 }}>Total USD</span><span style={{ fontWeight:900, color:"#4caf50", fontFamily:"monospace", fontSize:18 }}>{fmt(totales["USD"],"USD")}</span></div>}
                  {totales["ARS"] && <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}><span style={{ color:GR2 }}>Total ARS</span><span style={{ fontWeight:900, color:CEL, fontFamily:"monospace", fontSize:18 }}>{fmt(totales["ARS"],"ARS")}</span></div>}
                </div>
              </div>

              {/* Por producto */}
              <div style={cardStyle}>
                <ST>Ventas por Neumático</ST>
                {(() => {
                  const prods = {};
                  vF.forEach(v => {
                    if (!prods[v.prod_id]) prods[v.prod_id] = { usd:0, ars:0, unidades:0 };
                    if (v.moneda === "USD") prods[v.prod_id].usd += v.total_monto;
                    else prods[v.prod_id].ars += v.total_monto;
                    prods[v.prod_id].unidades += v.cantidad;
                  });
                  const sorted = PRODUCTOS.map(p => ({ ...p, ...prods[p.id] }))
                    .filter(p => p.unidades > 0)
                    .sort((a,b) => b.unidades - a.unidades);
                  const maxU = sorted[0]?.unidades || 1;
                  return sorted.length === 0
                    ? <Empty>Sin ventas</Empty>
                    : sorted.map(p => (
                      <div key={p.id} style={{ padding:"10px 0", borderBottom:"1px solid "+BK4 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <Chip c={p.tipo==="Trasero"?CEL:R}>{p.tipo}</Chip>
                            <span style={{ fontWeight:700 }}>{p.label}</span>
                          </div>
                          <span style={{ fontWeight:900, fontSize:18, color:"white" }}>{p.unidades+" u."}</span>
                        </div>
                        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginBottom:6 }}>
                          {p.usd > 0 && <span style={{ color:"#4caf50", fontFamily:"monospace", fontWeight:700 }}>{fmt(p.usd,"USD")}</span>}
                          {p.ars > 0 && <span style={{ color:CEL, fontFamily:"monospace", fontWeight:700 }}>{fmt(p.ars,"ARS")}</span>}
                        </div>
                        <div style={{ background:BK4, borderRadius:4, height:6 }}>
                          <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#a855f7,#ffffff)", width:(p.unidades/maxU*100).toFixed(0)+"%" }} />
                        </div>
                      </div>
                    ));
                })()}
              </div>

              {/* CF vs Factura */}
              <div style={cardStyle}>
                <ST>Facturación — CF vs Empresa</ST>
                {(() => {
                  const cf  = vF.filter(v => v.tipo_factura === "CF");
                  const fac = vF.filter(v => v.tipo_factura === "FAC");
                  const tot = vF.length || 1;
                  const cfUSD  = cf.filter(v=>v.moneda==="USD").reduce((s,v)=>s+v.total_monto,0);
                  const cfARS  = cf.filter(v=>v.moneda==="ARS").reduce((s,v)=>s+v.total_monto,0);
                  const facUSD = fac.filter(v=>v.moneda==="USD").reduce((s,v)=>s+v.total_monto,0);
                  const facARS = fac.filter(v=>v.moneda==="ARS").reduce((s,v)=>s+v.total_monto,0);
                  return (
                    <div>
                      <div style={{ padding:"12px 0", borderBottom:"1px solid "+BK4 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <span style={{ fontWeight:700, fontSize:16 }}>👤 Consumidor Final</span>
                          <span style={{ color:"#4caf50", fontWeight:700 }}>{cf.length+" ventas"}</span>
                        </div>
                        {cfUSD>0&&<div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:GR2 }}>Total USD</span><span style={{ fontWeight:900, color:"#4caf50", fontFamily:"monospace" }}>{fmt(cfUSD,"USD")}</span></div>}
                        {cfARS>0&&<div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:GR2 }}>Total ARS</span><span style={{ fontWeight:900, color:CEL, fontFamily:"monospace" }}>{fmt(cfARS,"ARS")}</span></div>}
                        <div style={{ background:BK4, borderRadius:4, height:8, marginTop:8 }}>
                          <div style={{ height:"100%", borderRadius:4, background:"#4caf50", width:(cf.length/tot*100).toFixed(0)+"%" }} />
                        </div>
                        <div style={{ fontSize:10, color:GR2, marginTop:2, textAlign:"right" }}>{(cf.length/tot*100).toFixed(1)}%</div>
                      </div>
                      <div style={{ padding:"12px 0" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <span style={{ fontWeight:700, fontSize:16 }}>🏢 Factura Empresa</span>
                          <span style={{ color:CEL, fontWeight:700 }}>{fac.length+" ventas"}</span>
                        </div>
                        {facUSD>0&&<div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:GR2 }}>Total USD</span><span style={{ fontWeight:900, color:"#4caf50", fontFamily:"monospace" }}>{fmt(facUSD,"USD")}</span></div>}
                        {facARS>0&&<div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:GR2 }}>Total ARS</span><span style={{ fontWeight:900, color:CEL, fontFamily:"monospace" }}>{fmt(facARS,"ARS")}</span></div>}
                        {fac.length > 0 && (
                          <div style={{ marginTop:10, background:BK3, borderRadius:8, padding:10 }}>
                            <div style={{ fontSize:10, color:CEL, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Detalle empresas</div>
                            {fac.map((v,i) => (
                              <div key={i} style={{ fontSize:12, display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid "+BK4 }}>
                                <span style={{ color:GR2 }}>{v.empresa||v.piloto} — CUIT {v.cuit}</span>
                                <span style={{ color:CEL, fontFamily:"monospace", fontWeight:700 }}>{fmt(v.total_monto,v.moneda)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Por piloto — top compradores */}
              <div style={cardStyle}>
                <ST>Top Compradores del Día</ST>
                {(() => {
                  const pils = {};
                  vF.forEach(v => {
                    const key = v.piloto+"_"+v.num_piloto;
                    if (!pils[key]) pils[key] = { piloto:v.piloto, num:v.num_piloto, cat:v.categoria, usd:0, ars:0, unidades:0 };
                    if (v.moneda==="USD") pils[key].usd += v.total_monto;
                    else pils[key].ars += v.total_monto;
                    pils[key].unidades += v.cantidad;
                  });
                  const sorted = Object.values(pils).sort((a,b)=>b.unidades-a.unidades);
                  return sorted.length === 0
                    ? <Empty>Sin ventas</Empty>
                    : sorted.map((p,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid "+BK4 }}>
                        <div>
                          <div>
                            <span style={{ color:CEL, fontFamily:"monospace", fontWeight:900, marginRight:8 }}>{"#"+p.num}</span>
                            <span style={{ fontWeight:700 }}>{p.piloto}</span>
                          </div>
                          <div style={{ fontSize:11, color:GR2 }}>{p.cat+" · "+p.unidades+" neumático"+(p.unidades!==1?"s":"")}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          {p.usd>0&&<div style={{ fontWeight:900, color:"#4caf50", fontFamily:"monospace" }}>{fmt(p.usd,"USD")}</div>}
                          {p.ars>0&&<div style={{ fontWeight:900, color:CEL, fontFamily:"monospace" }}>{fmt(p.ars,"ARS")}</div>}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ CIERRE DEL DÍA (admin) ══════════ */}
        {tab === "cierre" && isAdmin && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
            <div style={cardStyle}>
              <ST>Resumen de Cierre</ST>
              <div style={{ fontSize:12, color:GR2, marginBottom:16 }}>
                {new Date().toLocaleDateString("es-AR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
              </div>
              {["USD","ARS"].map(m => totales[m] ? (
                <ResRow key={m} label={"Total "+simbolo(m)} val={fmt(totales[m],m)} c={m==="ARS"?CEL:"#4caf50"} />
              ) : null)}
              <div style={{ borderTop:"1px solid "+BK4, padding:"10px 0" }} />
              <ResRow label="Total transacciones" val={ventas.length+" ventas"} c="white" />
              <ResRow label="Total unidades" val={ventas.reduce((s,v)=>s+v.cantidad,0)+" neumáticos"} c="white" />
              <div style={{ borderTop:"1px solid "+BK4, padding:"10px 0" }} />
              <ResRow label="Consumidor Final" val={ventas.filter(v=>v.tipo_factura==="CF").length+" ventas"} c="#4caf50" />
              <ResRow label="Facturas Empresa" val={ventas.filter(v=>v.tipo_factura==="FAC").length+" ventas"} c={CEL} />
              <button onClick={() => exportCSV(ventas,stock)}
                style={{ width:"100%", marginTop:20, padding:14, background:R, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:900, letterSpacing:2, cursor:"pointer" }}>
                EXPORTAR CIERRE EN EXCEL
              </button>
            </div>
            <div style={cardStyle}>
              <ST>Stock al Cierre</ST>
              {PRODUCTOS.map(p => {
                const s = stock[p.id];
                const tot = (s.bodega??0)+(s.flotante??0);
                return (
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid "+BK4 }}>
                    <span style={{ fontWeight:700 }}>{p.label}</span>
                    <div style={{ display:"flex", gap:12, fontSize:13 }}>
                      <span style={{ color:GR2 }}>Bodega: <b style={{ color:CEL }}>{s.bodega}</b></span>
                      <span style={{ color:GR2 }}>Flotante: <b style={{ color:"#4caf50" }}>{s.flotante??0}</b></span>
                      <span style={{ color: tot<=5?R:"#00cc66", fontWeight:800 }}>Total: {tot}</span>
                    </div>
                  </div>
                );
              })}
              {ventas.filter(v=>v.tipo_factura==="FAC").length > 0 && (
                <>
                  <ST style={{ marginTop:20 }}>Facturas Pendientes</ST>
                  {ventas.filter(v=>v.tipo_factura==="FAC").map(v => {
                    const p = PRODUCTOS.find(x=>x.id===v.prod_id);
                    return (
                      <div key={v.id} style={{ padding:"10px 0", borderBottom:"1px solid "+BK4 }}>
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontWeight:700 }}>{v.empresa||v.piloto}</span>
                          <span style={{ color:R, fontWeight:900, fontFamily:"monospace" }}>{fmt(v.total_monto,v.moneda)}</span>
                        </div>
                        <div style={{ fontSize:11, color:GR2 }}>{"CUIT: "+v.cuit+" — "+p?.label+" ×"+v.cantidad}</div>
                        <div style={{ fontSize:11, color:GR2 }}>{v.email_cliente}</div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════ GESTIÓN ADMIN ══════════ */}
        {tab === "pilotos" && isAdmin && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

            {/* Agregar piloto */}
            <div style={cardStyle}>
              <ST>Pilotos — Agregar / Ver</ST>
              <div style={{ display:"grid", gridTemplateColumns:"80px 1fr", gap:8, marginBottom:8 }}>
                <input id="nnum" style={inpStyle} placeholder="N°" />
                <input id="nnombre" style={inpStyle} placeholder="Nombre completo" />
              </div>
              <select id="ncat" style={{ ...inpStyle, marginBottom:8 }}>
                {todasLasCategorias.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={() => {
                const num = document.getElementById('nnum').value.trim();
                const nombre = document.getElementById('nnombre').value.trim();
                const cat = document.getElementById('ncat').value;
                if (!num || !nombre) { boom('Completá número y nombre', true); return; }
                const nuevo = { num, nombre, cat };
                savePilotos([...pilotosExtra, nuevo]);
                document.getElementById('nnum').value='';
                document.getElementById('nnombre').value='';
                boom('Piloto agregado: ' + nombre);
              }} style={{ ...btnAdd, marginBottom:16 }}>+ Agregar Piloto</button>

              <input type="text" style={{ ...inpStyle, marginBottom:12 }} placeholder="Buscar piloto..."
                value={pilotoQ} onChange={e => setPilotoQ(e.target.value)} />

              <div style={{ maxHeight:400, overflowY:"auto" }}>
                {todasLasCategorias.map(cat => {
                  const ps = todosLosPilotos.filter(p => p.cat===cat && (!pilotoQ || p.nombre.toLowerCase().includes(pilotoQ.toLowerCase()) || p.num.includes(pilotoQ)));
                  if (!ps.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:10, fontWeight:900, color:CEL, letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>{cat}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {ps.map((p,i) => (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:BK3, borderRadius:6, border:"1px solid "+BK4 }}>
                            <span style={{ color:CEL, fontFamily:"monospace", fontWeight:900, minWidth:40 }}>{"#"+p.num}</span>
                            <span style={{ fontWeight:700, flex:1 }}>{p.nombre}</span>
                            <span style={{ fontSize:11, color:GR2 }}>{p.cat}</span>
                            {pilotosExtra.find(x=>x.num===p.num&&x.nombre===p.nombre) && (
                              <button onClick={() => savePilotos(pilotosExtra.filter(x=>!(x.num===p.num&&x.nombre===p.nombre)))}
                                style={{ background:"transparent", border:"none", color:R, cursor:"pointer", fontSize:16 }}>×</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              {/* Agregar categoría */}
              <div style={cardStyle}>
                <ST>Categorías</ST>
                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  <input id="ncatnueva" style={{ ...inpStyle, flex:1 }} placeholder="Nueva categoría..." />
                  <button onClick={() => {
                    const val = document.getElementById('ncatnueva').value.trim();
                    if (!val) return;
                    saveCategorias([...categoriasExtra, val]);
                    document.getElementById('ncatnueva').value='';
                    boom('Categoría agregada: ' + val);
                  }} style={btnAdd}>+ Agregar</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {todasLasCategorias.map(c => (
                    <div key={c} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:BK3, borderRadius:6, border:"1px solid "+BK4 }}>
                      <span style={{ fontWeight:700 }}>{c}</span>
                      {categoriasExtra.includes(c) && (
                        <button onClick={() => saveCategorias(categoriasExtra.filter(x=>x!==c))}
                          style={{ background:"transparent", border:"none", color:R, cursor:"pointer", fontSize:16 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Editar precios */}
              <div style={cardStyle}>
                <ST>Precios Neumáticos</ST>
                {PRODUCTOS.map(p => (
                  <div key={p.id} style={{ marginBottom:12, padding:"10px 12px", background:BK3, borderRadius:8, border:"1px solid "+BK4 }}>
                    <div style={{ fontWeight:700, marginBottom:6 }}>{p.label}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <label style={{ fontSize:10, color:GR2 }}>USD
                        <input type="number" style={{ ...inpStyle, marginTop:4 }}
                          value={preciosEdit[p.id]?.USD ?? p.precios.USD}
                          onChange={e => savePrecios({ ...preciosEdit, [p.id]:{ ...preciosEdit[p.id], USD:+e.target.value } })} />
                      </label>
                      <label style={{ fontSize:10, color:GR2 }}>ARS
                        <input type="number" style={{ ...inpStyle, marginTop:4 }}
                          value={preciosEdit[p.id]?.ARS ?? p.precios.ARS}
                          onChange={e => savePrecios({ ...preciosEdit, [p.id]:{ ...preciosEdit[p.id], ARS:+e.target.value } })} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Zona peligro */}
              <div style={{ ...cardStyle, border:"1px solid "+R }}>
                <ST>Zona Admin</ST>
                <button onClick={clearAllData}
                  style={{ width:"100%", padding:12, background:"transparent", border:"2px solid "+R, color:R, borderRadius:8, cursor:"pointer", fontWeight:900, fontSize:14 }}>
                  🗑 Borrar historial de ventas
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign:"center", padding:14, fontSize:10, color:GR3, borderTop:"1px solid "+BK4, letterSpacing:2, textTransform:"uppercase", marginTop:20 }}>
        GP3 Sports LATAM — CAV 2026 — Pirelli Official Partner — {EMAIL_DESTINO}
      </footer>
    </div>
  );
}

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────────────────
function ST({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:"white", marginBottom:16, paddingBottom:10, borderBottom:"2px solid "+R, display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ width:3, height:14, background:R, display:"inline-block", borderRadius:2, flexShrink:0 }} />
      {children}
    </div>
  );
}
function Fld({ label, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
      <label style={{ fontSize:10, color:GR2, letterSpacing:2, textTransform:"uppercase" }}>{label}</label>
      {children}
    </div>
  );
}
function Chip({ children, c }) {
  return <span style={{ display:"inline-block", fontSize:10, padding:"2px 7px", borderRadius:3, background:c+"33", color:c, border:"1px solid "+c+"55", textTransform:"uppercase", letterSpacing:.5, fontWeight:700 }}>{children}</span>;
}
function KPI({ label, val, c }) {
  return (
    <div style={{ textAlign:"center", padding:"6px 14px", background:BK3, borderRadius:8, borderBottom:"3px solid "+c }}>
      <div style={{ fontSize:9, color:GR2, letterSpacing:1, textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:900, color:c }}>{val}</div>
    </div>
  );
}
function BigKPI({ label, val, c }) {
  return (
    <div style={{ background:BK3, border:"1px solid "+BK4, borderRadius:10, padding:"16px 20px", textAlign:"center", borderTop:"3px solid "+c }}>
      <div style={{ fontSize:9, color:GR2, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:900, color:c, lineHeight:1 }}>{val}</div>
    </div>
  );
}
function ResRow({ label, val, c }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid "+BK4 }}>
      <span style={{ fontSize:13, color:GR2 }}>{label}</span>
      <span style={{ fontSize:16, fontWeight:900, color:c }}>{val}</span>
    </div>
  );
}
function MBtn({ children, c, onClick }) {
  return (
    <button onClick={onClick} style={{ background:"transparent", border:"1px solid "+c, color:c, borderRadius:4, padding:"3px 8px", fontSize:11, cursor:"pointer", fontWeight:800 }}>
      {children}
    </button>
  );
}
function Empty({ children }) {
  return <div style={{ textAlign:"center", padding:32, color:GR3, fontSize:13 }}>{children}</div>;
}

const cardStyle = { background:BK2, border:"1px solid "+BK4, borderRadius:12, padding:24 };
const inpStyle  = { background:BK3, border:"1px solid "+BK4, color:"white", borderRadius:6, padding:"10px 12px", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
const btnBase   = { padding:"12px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontWeight:900, letterSpacing:2 };
const cantBtn   = { background:BK4, border:"1px solid "+GR3, color:"white", borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:16, fontWeight:900 };
const btnAdd    = { background:R, border:"none", color:"white", borderRadius:6, padding:"10px 16px", cursor:"pointer", fontWeight:900, fontSize:13, whiteSpace:"nowrap" };
const td        = { padding:"9px 10px" };
const loginCard = { background:BK2, border:"1px solid "+BK4, borderRadius:16, padding:32, textAlign:"center", width:220 };
