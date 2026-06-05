import { useState, useMemo, useEffect, useRef } from "react";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const R   = "#a855f7";
const CEL = "#FFFFFF";
const BK  = "#1a0a2e";
const BK2 = "#22103a";
const BK3 = "#2d1650";
const BK4 = "#3d2060";
const GR2 = "#b8a8d0";
const GR3 = "#7a6a9a";
const VRD = "#4caf50";
const ORG = "#ff9800";

const ADMIN_PIN     = "GP3admin";
const EMAIL_DESTINO = "Francisca@gp3chile.cl";

// ─── PRODUCTOS ───────────────────────────────────────────────────────────────
const PRODUCTOS = [
  { id:"m110sc1", tipo:"Delantero", label:"Modelo 110 SC1", precios:{ USD:500, ARS:700000 } },
  { id:"m140sc1", tipo:"Trasero",   label:"Modelo 140 SC1", precios:{ USD:500, ARS:700000 } },
  { id:"m120sc1", tipo:"Delantero", label:"Modelo 120 SC1", precios:{ USD:300, ARS:415000 } },
  { id:"m180sc2", tipo:"Trasero",   label:"Modelo 180 SC2", precios:{ USD:400, ARS:555000 } },
  { id:"m200sc1", tipo:"Trasero",   label:"Modelo 200 SC1", precios:{ USD:400, ARS:555000 } },
];

// ─── CIRCUITOS CON FECHAS REALES ─────────────────────────────────────────────
const CIRCUITOS_BASE = [
  { id:"f1", num:"1ª", nombre:"Termas de Río Hondo",      inicio:"2026-04-03", fin:"2026-04-05" },
  { id:"f2", num:"2ª", nombre:"Toay",                     inicio:"2026-05-22", fin:"2026-05-24" },
  { id:"f3", num:"3ª", nombre:"San Nicolás",               inicio:"2026-06-19", fin:"2026-06-21" },
  { id:"f4", num:"4ª", nombre:"Concordia",                 inicio:"2026-08-07", fin:"2026-08-09" },
  { id:"f5", num:"5ª", nombre:"San Juan Villicum",         inicio:"2026-09-04", fin:"2026-09-06" },
  { id:"f6", num:"6ª", nombre:"Termas de Río Hondo 2",    inicio:"2026-10-09", fin:"2026-10-11" },
  { id:"f7", num:"7ª", nombre:"San Juan Villicum — Final", inicio:"2026-11-13", fin:"2026-11-15" },
];

const HOY = new Date().toISOString().slice(0,10);

// Circuito activo o próximo (para vendedor)
function getCircuitosVendedor() {
  return CIRCUITOS_BASE.filter(c => c.fin >= HOY);
}

// Circuito actualmente en curso o el próximo
function getCircuitoActivo() {
  const activo = CIRCUITOS_BASE.find(c => HOY >= c.inicio && HOY <= c.fin);
  if (activo) return activo;
  return CIRCUITOS_BASE.find(c => c.inicio > HOY) || CIRCUITOS_BASE[CIRCUITOS_BASE.length-1];
}

// ─── PILOTOS BASE ─────────────────────────────────────────────────────────────
const PILOTOS_BASE = [
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

const CATS_BASE = [...new Set(PILOTOS_BASE.map(p => p.cat))];

const STOCK0 = {
  m110sc1: { bodega:13, flotante:0 },
  m140sc1: { bodega:13, flotante:0 },
  m120sc1: { bodega:38, flotante:0 },
  m180sc2: { bodega:6,  flotante:0 },
  m200sc1: { bodega:80, flotante:0 },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getPrecio(prod, moneda, preciosEdit) {
  if (!prod) return 0;
  const p = preciosEdit?.[prod.id] || prod.precios;
  return moneda === "ARS" ? p.ARS : p.USD;
}

function fmt(val, moneda) {
  const n = Number(val).toLocaleString("es-AR");
  return moneda === "ARS" ? "$ " + n + " ARS" : "USD " + n;
}

function simbolo(moneda) {
  return moneda === "ARS" ? "🇦🇷 Pesos ARS" : "💵 Dólares USD";
}

function lsGet(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────
function exportCSV(ventas, stock) {
  const S=";", BOM="\uFEFF";
  const cols = ["ID Venta","Fecha","Circuito","N°Piloto","Piloto","Categoria","Email","Factura","CUIT","Empresa","Metodo","Moneda","Neumaticos","Total"];
  const row = v => {
    const c = CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
    const items = v.items.map(i=>{ const p=PRODUCTOS.find(x=>x.id===i.prod_id); return p?.label+"×"+i.cantidad; }).join(" | ");
    return [v.id, v.fecha, c?.nombre, v.num_piloto, v.piloto, v.categoria,
            v.email_cliente, v.tipo_factura==="FAC"?"Factura":"Cons.Final",
            v.cuit||"", v.empresa||"", v.metodo, v.moneda, items, v.total_monto].join(S);
  };
  const cf  = ventas.filter(v=>v.tipo_factura==="CF");
  const fac = ventas.filter(v=>v.tipo_factura==="FAC");
  const stk = PRODUCTOS.map(p=>[p.label,stock[p.id]?.bodega??0,stock[p.id]?.flotante??0,(stock[p.id]?.bodega??0)+(stock[p.id]?.flotante??0)].join(S));
  const csv = BOM+[
    "TODAS LAS VENTAS",cols.join(S),...ventas.map(row),
    "","CONSUMIDOR FINAL",cols.join(S),...cf.map(row),
    "","FACTURAS EMPRESA",cols.join(S),...fac.map(row),
    "","STOCK ACTUAL",["Producto","Bodega Pirelli","Stock Flotante","Total"].join(S),...stk
  ].join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  a.download="GP3_Neumaticos_"+HOY+".csv";
  a.click();
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function LogoGP3({ logoUrl }) {
  if (logoUrl) return <img src={logoUrl} alt="Logo" style={{ height:56, width:"auto", objectFit:"contain" }} />;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0 }}>
      <div style={{ background:"white", borderRadius:"10px 0 0 10px", padding:"4px 12px 4px 10px" }}>
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

// ═══════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [modo, setModo]       = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Persistencia localStorage
  const [ventas,   setVentasRaw]  = useState(() => lsGet("gp3_ventas", []));
  const [stock,    setStockRaw]   = useState(() => lsGet("gp3_stock", STOCK0));
  const [pilotos,  setPilotosRaw] = useState(() => lsGet("gp3_pilotos", []));
  const [cats,     setCatsRaw]    = useState(() => lsGet("gp3_cats", []));
  const [precios,  setPreciosRaw] = useState(() => lsGet("gp3_precios", Object.fromEntries(PRODUCTOS.map(p=>[p.id,{...p.precios}]))));
  const [logoUrl,  setLogoUrlRaw] = useState(() => lsGet("gp3_logo", null));
  const [stockDraft, setStockDraft] = useState(null);

  // Tema de colores — se aplica a toda la app
  const TEMA_DEFAULT = {bg:"#1a0a2e",acc:"#a855f7",sec:"#FFFFFF",card:"#22103a",borde:"#3d2060"};
  const [tema, setTema] = useState(() => lsGet("gp3_tema", TEMA_DEFAULT));

  // Aplicar tema dinámicamente sobreescribiendo las constantes de color
  const T = {
    R:   tema.acc   || "#a855f7",
    CEL: tema.sec   || "#FFFFFF",
    BK:  tema.bg    || "#1a0a2e",
    BK2: tema.card  || "#22103a",
    BK3: tema.card  ? tema.card+"ee" : "#2d1650",
    BK4: tema.borde || "#3d2060",
  };

  const setVentas = v => { lsSet("gp3_ventas", v); setVentasRaw(v); };
  const setStock  = v => { lsSet("gp3_stock",  v); setStockRaw(v);  };
  const setPilotos= v => { lsSet("gp3_pilotos",v); setPilotosRaw(v);};
  const setCats   = v => { lsSet("gp3_cats",   v); setCatsRaw(v);   };
  const setPrecios= v => { lsSet("gp3_precios",v); setPreciosRaw(v);};
  const setLogoUrl= v => { lsSet("gp3_logo",   v); setLogoUrlRaw(v);};

  const [tab, setTab]     = useState("venta");
  const [filtro, setFiltro] = useState("todos");
  const [toast, setToast] = useState(null);
  const [busqStats, setBusqStats] = useState("");
  const [busqPiloto, setBusqPiloto] = useState("");

  const boom = (msg, err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null),3000); };

  // Aplicar variables CSS del tema a toda la app
  useEffect(()=>{
    document.body.style.background = tema.bg || "#1a0a2e";
  },[tema]);

  // Estilos dinámicos que usan tema — definidos dentro del componente
  const tR   = tema.acc   || R;
  const tBK  = tema.bg    || BK;
  const tBK2 = tema.card  || BK2;
  const tBK3 = tema.card  ? tema.card+"dd" : BK3;
  const tBK4 = tema.borde || BK4;
  const tCardSt   = {background:tBK2, border:"1px solid "+tBK4, borderRadius:12, padding:24};
  const tInpSt    = {background:tBK3, border:"1px solid "+tBK4, color:"white", borderRadius:6, padding:"10px 12px", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit"};
  const tLoginCard = {background:tBK2, border:"1px solid "+tBK4, borderRadius:16, padding:32, textAlign:"center", width:220};

  // Todos los pilotos y categorías
  const todosLosPilotos = useMemo(()=>[...PILOTOS_BASE,...pilotos],[pilotos]);
  const todasLasCats    = useMemo(()=>[...new Set([...CATS_BASE,...cats])],[cats]);

  // Circuitos disponibles según modo
  const circuitos = modo==="admin" ? CIRCUITOS_BASE : getCircuitosVendedor();
  const circActivo = getCircuitoActivo();

  // FORM
  const FORM0 = {
    circ_id: circActivo.id,
    fecha: HOY,
    piloto:"", num_piloto:"", categoria: todasLasCats[0]||"",
    moneda:"USD", metodo:"efectivo",
    email_cliente:"", tipo_factura:"CF", cuit:"", empresa:"",
  };
  const [form, setForm]     = useState(FORM0);
  const [pilotoQ, setPilotoQ] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [carrito, setCarrito] = useState([]); // [{prod_id, cantidad}]
  const [cantSel, setCantSel] = useState(Object.fromEntries(PRODUCTOS.map(p=>[p.id,0])));

  // Sugerencias piloto
  const sugerencias = useMemo(()=>{
    if(pilotoQ.length<2) return [];
    const q=pilotoQ.toLowerCase();
    return todosLosPilotos.filter(p=>p.nombre.toLowerCase().includes(q)||p.num.includes(q)).slice(0,8);
  },[pilotoQ,todosLosPilotos]);

  const selPiloto = p => {
    setForm(f=>({...f,piloto:p.nombre,num_piloto:p.num,categoria:p.cat}));
    setPilotoQ(p.nombre); setShowSug(false);
  };

  // Carrito con precios calculados en tiempo real
  const carritoConPrecios = carrito.map(item=>{
    const p = PRODUCTOS.find(x=>x.id===item.prod_id);
    const pu = getPrecio(p, form.moneda, precios);
    return {...item, prod:p, precio_unit:pu, total:pu*item.cantidad};
  });
  const carritoTotal = carritoConPrecios.reduce((s,i)=>s+i.total,0);
  const carritoUnits = carrito.reduce((s,i)=>s+i.cantidad,0);

  // Agregar al carrito
  const agregarProducto = prodId => {
    const cant = cantSel[prodId] ?? 0;
    if (cant <= 0) { boom("Ponle una cantidad mayor a 0", true); return; }
    const flotDisp = stock[prodId]?.flotante ?? 0;
    const enCar = carrito.find(i=>i.prod_id===prodId)?.cantidad ?? 0;
    if (cant + enCar > flotDisp) { boom("Stock flotante insuficiente — solo hay "+flotDisp+" disponibles", true); return; }
    setCarrito(prev=>{
      const idx = prev.findIndex(i=>i.prod_id===prodId);
      if(idx>=0){ const u=[...prev]; u[idx]={...u[idx],cantidad:u[idx].cantidad+cant}; return u; }
      return [...prev,{prod_id:prodId,cantidad:cant}];
    });
    const p = PRODUCTOS.find(x=>x.id===prodId);
    boom(p?.label+" ×"+cant+" → carrito");
    setCantSel(c=>({...c,[prodId]:0}));
  };

  const quitarItem = idx => setCarrito(prev=>prev.filter((_,i)=>i!==idx));

  // REGISTRAR — una sola venta por cliente con todos los items
  const registrar = () => {
    if(!form.piloto.trim())        { boom("Ingresa el nombre del piloto",true); return; }
    if(!form.email_cliente.trim()) { boom("Ingresa el email del cliente",true); return; }
    if(form.tipo_factura==="FAC"&&!form.cuit.trim()) { boom("Ingresa el CUIT para factura",true); return; }
    if(carrito.length===0)         { boom("Agrega al menos un neumático al carrito",true); return; }

    // Una sola venta con array de items
    const nuevaVenta = {
      id: Date.now(),
      circ_id: form.circ_id,
      fecha: form.fecha,
      piloto: form.piloto,
      num_piloto: form.num_piloto,
      categoria: form.categoria,
      email_cliente: form.email_cliente,
      tipo_factura: form.tipo_factura,
      cuit: form.cuit,
      empresa: form.empresa,
      metodo: form.metodo,
      moneda: form.moneda,
      items: carritoConPrecios.map(i=>({ prod_id:i.prod_id, cantidad:i.cantidad, precio_unit:i.precio_unit, total:i.total })),
      total_monto: carritoTotal,
      total_unidades: carritoUnits,
    };

    setVentas([nuevaVenta, ...ventas]);

    // Descontar solo del stock flotante
    const nuevoStock = {...stock};
    carrito.forEach(item=>{
      nuevoStock[item.prod_id] = {
        ...nuevoStock[item.prod_id],
        flotante: Math.max(0, (nuevoStock[item.prod_id].flotante??0) - item.cantidad)
      };
    });
    setStock(nuevoStock);

    boom("✓ Venta registrada — "+carritoUnits+" neumático"+(carritoUnits!==1?"s":"")+" — "+fmt(carritoTotal,form.moneda));
    setCarrito([]);
    setForm({...FORM0});
    setPilotoQ("");
    setShowSug(false);
    setCantSel(Object.fromEntries(PRODUCTOS.map(p=>[p.id,0])));
  };

  // Stats
  const vF = useMemo(()=>{
    let r = filtro==="todos" ? ventas : ventas.filter(v=>v.circ_id===filtro);
    if(busqStats.trim().length>1) {
      const q=busqStats.toLowerCase();
      r=r.filter(v=>v.piloto.toLowerCase().includes(q)||v.num_piloto.includes(q)||v.categoria.toLowerCase().includes(q));
    }
    return r;
  },[ventas,filtro,busqStats]);

  const totales = useMemo(()=>{
    const t={};
    vF.forEach(v=>{ t[v.moneda]=(t[v.moneda]||0)+v.total_monto; });
    return t;
  },[vF]);

  const isAdmin = modo==="admin";
  const loginAdmin = () => {
    if(pinInput===ADMIN_PIN){ setModo("admin"); setPinError(false); }
    else setPinError(true);
  };

  // ══ LOGIN ══
  if(!modo) return (
    <div style={{minHeight:"100vh",background:tBK,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32,fontFamily:"'Barlow Condensed','Arial Narrow',Arial,sans-serif"}}>
      <LogoGP3 logoUrl={logoUrl}/>
      <div style={{fontSize:11,letterSpacing:4,color:R,textTransform:"uppercase"}}>CAV — Campeonato Argentino de Velocidad 2026</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap",justifyContent:"center"}}>
        <div style={tLoginCard}>
          <div style={{fontSize:36,marginBottom:10}}>🛒</div>
          <div style={{fontSize:18,fontWeight:900,color:"white",letterSpacing:2,marginBottom:6}}>MODO VENTA</div>
          <div style={{fontSize:12,color:GR2,marginBottom:20}}>Registrar ventas de neumáticos</div>
          <button onClick={()=>{setModo("vendedor");setTab("venta");}} style={{...btnBase,background:R,color:"white",width:"100%"}}>INGRESAR</button>
        </div>
        <div style={tLoginCard}>
          <div style={{fontSize:36,marginBottom:10}}>📊</div>
          <div style={{fontSize:18,fontWeight:900,color:"white",letterSpacing:2,marginBottom:6}}>MODO ADMIN</div>
          <div style={{fontSize:12,color:GR2,marginBottom:12}}>Estadísticas, stock y gestión</div>
          <input type="password" placeholder="PIN de acceso" value={pinInput}
            onChange={e=>{setPinInput(e.target.value);setPinError(false);}}
            onKeyDown={e=>e.key==="Enter"&&loginAdmin()}
            style={{...tInpSt,marginBottom:8}}/>
          {pinError&&<div style={{fontSize:11,color:"#ff5555",marginBottom:8}}>PIN incorrecto</div>}
          <button onClick={loginAdmin} style={{...btnBase,background:CEL,color:BK,width:"100%"}}>INGRESAR</button>
        </div>
      </div>
    </div>
  );

  // ══ APP ══
  return (
    <div style={{minHeight:"100vh",background:tBK,color:"#f0f0f0",fontFamily:"'Barlow Condensed','Arial Narrow',Arial,sans-serif"}}>

      {/* HEADER */}
      <header style={{background:"linear-gradient(180deg,"+tBK+","+tBK+"dd)",borderBottom:"3px solid "+tR,padding:"12px 24px",display:"flex",flexWrap:"wrap",gap:16,alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <LogoGP3 logoUrl={logoUrl}/>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:16,fontWeight:900,color:R,letterSpacing:4}}>CAV</span>
            <span style={{fontSize:10,color:GR2,letterSpacing:2,textTransform:"uppercase"}}>Campeonato Argentino de Velocidad 2026</span>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,color:isAdmin?R:"white",background:isAdmin?"rgba(168,85,247,0.2)":"rgba(255,255,255,0.1)",border:"1px solid "+(isAdmin?R:"rgba(255,255,255,0.3)")}}>
              {isAdmin?"ADMIN":"VENDEDOR"}
            </span>
            <span style={{fontSize:11,color:GR2}}>{HOY}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          {["USD","ARS"].map(m=>totales[m]?(
            <KPI key={m} label={m} val={fmt(totales[m],m)} c={m==="USD"?VRD:R}/>
          ):null)}
          <KPI label="Ventas" val={ventas.length} c="white"/>
          <button onClick={()=>{setModo(null);setPinInput("");}} style={{background:"transparent",border:"1px solid "+GR3,color:GR2,padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12}}>Salir</button>
        </div>
      </header>

      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:9999,padding:"12px 24px",borderRadius:8,fontWeight:800,fontSize:14,color:"white",background:toast.err?"#cc2244":VRD,boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>{toast.msg}</div>}

      {/* NAV */}
      <nav style={{background:tBK2,borderBottom:"1px solid "+tBK4,padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {[
            ["venta","🛒 Venta"],
            ...(isAdmin?[["stock","📦 Stock"],["estadisticas","📊 Estadísticas"],["cierre","🗂 Cierre"],["gestion","⚙️ Gestión"]]:
                        [["mis_stats","📊 Mi Resumen"]])
          ].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{background:tab===id?R:"transparent",border:"1px solid "+(tab===id?R:GR3),color:tab===id?"white":GR2,padding:"9px 20px",borderRadius:6,cursor:"pointer",fontSize:14,fontWeight:700}}>
              {lbl}
            </button>
          ))}
        </div>
        {isAdmin&&<button onClick={()=>exportCSV(ventas,stock)} style={{background:"transparent",border:"1px solid "+R,color:R,padding:"9px 18px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:700}}>Exportar Excel</button>}
      </nav>

      <main style={{padding:"24px",maxWidth:1440,margin:"0 auto"}}>

        {/* ══ VENTA ══ */}
        {tab==="venta"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
            <div style={tCardSt}>
              <ST>Nueva Venta</ST>

              {/* Circuito — solo futuros para vendedor */}
              <Fld label="Fecha del Campeonato">
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:6}}>
                  {circuitos.map(c=>(
                    <button key={c.id} onClick={()=>setForm(f=>({...f,circ_id:c.id,fecha:c.inicio}))}
                      style={{display:"flex",flexDirection:"column",gap:2,padding:"9px 12px",borderRadius:8,cursor:"pointer",textAlign:"left",
                        border:"1px solid "+(form.circ_id===c.id?R:BK4),
                        background:form.circ_id===c.id?"rgba(168,85,247,0.15)":BK3}}>
                      <span style={{fontSize:10,color:form.circ_id===c.id?R:GR2,fontWeight:900}}>{c.num}</span>
                      <span style={{fontSize:12,fontWeight:700,color:"white",lineHeight:1.2}}>{c.nombre}</span>
                      <span style={{fontSize:10,color:GR2}}>{c.inicio} → {c.fin}</span>
                      {HOY>=c.inicio&&HOY<=c.fin&&<span style={{fontSize:9,color:VRD,fontWeight:900}}>● EN CURSO</span>}
                    </button>
                  ))}
                </div>
              </Fld>

              {/* Piloto — vendedor también puede agregar */}
              <Fld label="Piloto — nombre, número o agregar nuevo">
                <div style={{position:"relative"}}>
                  <input style={tInpSt} type="text" placeholder="Buscar por nombre o número..."
                    value={pilotoQ}
                    onChange={e=>{setPilotoQ(e.target.value);setShowSug(true);setForm(f=>({...f,piloto:e.target.value,num_piloto:""}));}}
                    onFocus={()=>setShowSug(true)}/>
                  {showSug&&sugerencias.length>0&&(
                    <div style={{position:"absolute",top:"100%",left:0,right:0,background:BK2,border:"1px solid "+R,borderRadius:"0 0 8px 8px",zIndex:100,maxHeight:220,overflowY:"auto"}}>
                      {sugerencias.map((p,i)=>(
                        <div key={i} onMouseDown={()=>selPiloto(p)}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+BK4,fontSize:13}}>
                          <span style={{color:R,fontWeight:900,minWidth:34,fontFamily:"monospace"}}>{"#"+p.num}</span>
                          <span style={{fontWeight:700}}>{p.nombre}</span>
                          <span style={{marginLeft:"auto",fontSize:11,color:GR2}}>{p.cat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Agregar piloto nuevo desde vendedor */}
                <details style={{marginTop:6}}>
                  <summary style={{fontSize:11,color:R,cursor:"pointer",letterSpacing:1}}>+ Agregar piloto nuevo</summary>
                  <div style={{display:"grid",gridTemplateColumns:"70px 1fr",gap:6,marginTop:8}}>
                    <input id="vnnum" style={tInpSt} placeholder="N°"/>
                    <input id="vnnombre" style={tInpSt} placeholder="Nombre completo"/>
                  </div>
                  <select id="vncat" style={{...tInpSt,marginTop:6}}>
                    {todasLasCats.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <button onClick={()=>{
                    const num=document.getElementById('vnnum').value.trim();
                    const nombre=document.getElementById('vnnombre').value.trim();
                    const cat=document.getElementById('vncat').value;
                    if(!num||!nombre){boom("Completa número y nombre",true);return;}
                    setPilotos([...pilotos,{num,nombre,cat}]);
                    selPiloto({num,nombre,cat});
                    document.getElementById('vnnum').value='';
                    document.getElementById('vnnombre').value='';
                    boom("Piloto agregado: "+nombre);
                  }} style={{...btnAdd,marginTop:6,width:"100%"}}>+ Agregar y seleccionar</button>
                </details>
              </Fld>

              {form.piloto&&(
                <div style={{display:"flex",alignItems:"center",gap:8,background:BK3,border:"1px solid "+R,borderRadius:8,padding:"8px 12px",marginBottom:14,flexWrap:"wrap"}}>
                  <span style={{color:R,fontFamily:"monospace",fontWeight:900}}>{"#"+(form.num_piloto||"—")}</span>
                  <span style={{fontWeight:800}}>{form.piloto}</span>
                  <Chip c={R}>{form.categoria}</Chip>
                  <button onClick={()=>{setForm(f=>({...f,piloto:"",num_piloto:""}));setPilotoQ("");}}
                    style={{marginLeft:"auto",background:"transparent",border:"none",color:GR3,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                </div>
              )}

              <Fld label="Categoría">
                <select style={tInpSt} value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                  {todasLasCats.map(c=><option key={c}>{c}</option>)}
                </select>
              </Fld>

              {/* Moneda */}
              <Fld label="① Selecciona la moneda — los precios cambian automáticamente">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["USD","💵","Dólares",VRD],["ARS","🇦🇷","Pesos ARS",R]].map(([m,ico,lbl,c])=>{
                    const activa=form.moneda===m;
                    return(
                      <button key={m} onClick={()=>setForm(f=>({...f,moneda:m,metodo:m==="USD"?"efectivo_usd":"efectivo_ars"}))}
                        style={{padding:"14px 0",borderRadius:8,cursor:"pointer",fontWeight:900,fontSize:15,
                          border:"3px solid "+(activa?c:BK4),background:activa?c+"22":BK3,color:activa?"white":GR2}}>
                        <div style={{fontSize:24}}>{ico}</div>
                        <div style={{fontSize:14,marginTop:4}}>{m}</div>
                        <div style={{fontSize:10,color:activa?c:GR2,marginTop:2}}>{lbl}</div>
                        {activa&&<div style={{fontSize:10,color:c,fontWeight:700}}>✓ ACTIVA</div>}
                      </button>
                    );
                  })}
                </div>
              </Fld>

              {/* Indicador moneda activa */}
              <div style={{background:form.moneda==="ARS"?"rgba(168,85,247,0.1)":"rgba(76,175,80,0.1)",border:"1px solid "+(form.moneda==="ARS"?R:VRD),borderRadius:8,padding:"8px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{form.moneda==="ARS"?"🇦🇷":"💵"}</span>
                <div>
                  <div style={{fontWeight:900,color:"white",fontSize:14}}>Precios en {form.moneda==="ARS"?"Pesos Argentinos":"Dólares"}</div>
                  <div style={{fontSize:11,color:GR2}}>Solo se vende del stock flotante (en pista)</div>
                </div>
              </div>

              {/* Productos — cantidad empieza en 0 */}
              <Fld label="Neumáticos — stock flotante disponible">
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {PRODUCTOS.map(p=>{
                    const precio    = getPrecio(p,form.moneda,precios);
                    const enCarrito = carrito.find(i=>i.prod_id===p.id)?.cantidad??0;
                    const flotante  = stock[p.id]?.flotante??0;
                    const bodega    = stock[p.id]?.bodega??0;
                    const sinStock  = flotante<=0;
                    return(
                      <div key={p.id} style={{background:BK3,border:"1px solid "+(enCarrito>0?"#4caf50":sinStock?"rgba(255,50,50,0.3)":BK4),borderRadius:8,padding:"10px 12px",opacity:sinStock?.6:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <Chip c={p.tipo==="Trasero"?R:"white"}>{p.tipo}</Chip>
                            <span style={{fontWeight:700,color:"white",fontSize:14}}>{p.label}</span>
                            {enCarrito>0&&<span style={{fontSize:11,color:VRD,fontWeight:700}}>{"✓ "+enCarrito+" en carrito"}</span>}
                          </div>
                          <span style={{fontFamily:"monospace",fontWeight:900,color:R,fontSize:16}}>{fmt(precio,form.moneda)}</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                          <div style={{display:"flex",gap:12,fontSize:12}}>
                            <span style={{color:sinStock?"#ff5555":VRD,fontWeight:700}}>🟢 Flotante: {flotante}</span>
                            <span style={{color:GR2}}>📦 Bodega: {bodega}</span>
                          </div>
                          {!sinStock&&(
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <button onClick={()=>setCantSel(c=>({...c,[p.id]:Math.max(0,(c[p.id]??0)-1)}))} style={cantBtn}>−</button>
                              <span style={{minWidth:28,textAlign:"center",fontWeight:900,fontSize:18,color:"white"}}>{cantSel[p.id]??0}</span>
                              <button onClick={()=>setCantSel(c=>({...c,[p.id]:(c[p.id]??0)+1}))} style={cantBtn}>+</button>
                              <button onClick={()=>agregarProducto(p.id)} style={btnAdd}>+ Agregar</button>
                            </div>
                          )}
                          {sinStock&&<span style={{fontSize:11,color:"#ff5555",fontWeight:700}}>Sin stock flotante</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Fld>

              {/* Método de pago — vinculado a moneda seleccionada */}
              <Fld label="Método de Pago">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {(form.moneda==="USD"
                    ? [["efectivo_usd","💵 Efectivo USD"],["transferencia","🏦 Transferencia"]]
                    : [["efectivo_ars","🇦🇷 Efectivo ARS"],["transferencia","🏦 Transferencia"],["debito","💳 Débito/Crédito"]]
                  ).map(([id,lbl])=>(
                    <button key={id} onClick={()=>setForm(f=>({...f,metodo:id}))}
                      style={{padding:"12px 0",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,
                        border:"2px solid "+(form.metodo===id?R:BK4),
                        background:form.metodo===id?"rgba(168,85,247,0.15)":BK3,
                        color:form.metodo===id?"white":GR2}}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Fld>

              {/* Email */}
              <Fld label="Email del Cliente">
                <input type="email" style={tInpSt} placeholder="cliente@correo.com"
                  value={form.email_cliente} onChange={e=>setForm(f=>({...f,email_cliente:e.target.value}))}/>
              </Fld>

              {/* Facturación */}
              <Fld label="Tipo de Facturación">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <button onClick={()=>setForm(f=>({...f,tipo_factura:"CF",cuit:"",empresa:""}))}
                    style={{padding:"12px 0",borderRadius:8,cursor:"pointer",fontWeight:900,fontSize:13,
                      border:"2px solid "+(form.tipo_factura==="CF"?VRD:BK4),
                      background:form.tipo_factura==="CF"?"rgba(76,175,80,0.1)":BK3,
                      color:form.tipo_factura==="CF"?"white":GR2}}>
                    👤 Consumidor Final
                  </button>
                  <button onClick={()=>setForm(f=>({...f,tipo_factura:"FAC"}))}
                    style={{padding:"12px 0",borderRadius:8,cursor:"pointer",fontWeight:900,fontSize:13,
                      border:"2px solid "+(form.tipo_factura==="FAC"?R:BK4),
                      background:form.tipo_factura==="FAC"?"rgba(168,85,247,0.1)":BK3,
                      color:form.tipo_factura==="FAC"?"white":GR2}}>
                    🏢 Factura Empresa
                  </button>
                </div>
              </Fld>

              {form.tipo_factura==="FAC"&&(
                <div style={{background:"rgba(168,85,247,0.06)",border:"1px solid "+R,borderRadius:10,padding:14,marginBottom:14}}>
                  <div style={{fontSize:10,color:R,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Datos de Facturación</div>
                  <Fld label="CUIT">
                    <input type="text" style={tInpSt} placeholder="20-12345678-9" value={form.cuit} onChange={e=>setForm(f=>({...f,cuit:e.target.value}))}/>
                  </Fld>
                  <Fld label="Razón Social">
                    <input type="text" style={tInpSt} placeholder="Nombre empresa" value={form.empresa} onChange={e=>setForm(f=>({...f,empresa:e.target.value}))}/>
                  </Fld>
                </div>
              )}

              {/* Carrito */}
              {carrito.length>0&&(
                <div style={{background:"rgba(168,85,247,0.06)",border:"2px solid "+R,borderRadius:10,padding:14,marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:900,color:R,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>
                    {"Carrito — "+carritoUnits+" neumático"+(carritoUnits!==1?"s":"")}
                  </div>
                  {carritoConPrecios.map((item,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+BK4}}>
                      <div>
                        <span style={{fontWeight:700,color:"white"}}>{item.prod?.label}</span>
                        <span style={{marginLeft:8,fontSize:12,color:GR2}}>{"×"+item.cantidad}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontWeight:900,color:R,fontFamily:"monospace"}}>{fmt(item.total,form.moneda)}</span>
                        <button onClick={()=>quitarItem(i)} style={{background:"transparent",border:"1px solid "+GR3,color:GR3,borderRadius:4,padding:"2px 7px",cursor:"pointer",fontSize:13}}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                    <span style={{fontWeight:900,color:"white",fontSize:15}}>TOTAL</span>
                    <span style={{fontWeight:900,color:R,fontSize:28,fontFamily:"monospace"}}>{fmt(carritoTotal,form.moneda)}</span>
                  </div>
                </div>
              )}

              <button onClick={registrar}
                style={{width:"100%",padding:16,background:carrito.length>0?R:GR3,color:"white",border:"none",borderRadius:8,fontSize:16,fontWeight:900,letterSpacing:2,cursor:carrito.length>0?"pointer":"not-allowed",textTransform:"uppercase"}}>
                {carrito.length>0?"CONFIRMAR VENTA — "+carritoUnits+" NEUMÁTICO"+(carritoUnits!==1?"S":"")+" — "+fmt(carritoTotal,form.moneda):"AGREGA NEUMÁTICOS AL CARRITO"}
              </button>
            </div>

            {/* Panel derecho — compras agrupadas por piloto */}
            <div style={tCardSt}>
              <ST>{"Compras del Día — "+ventas.length+" registros"}</ST>
              {ventas.length===0?<Empty>Sin ventas registradas</Empty>:(
                <div style={{display:"flex",flexDirection:"column",gap:12,maxHeight:900,overflowY:"auto",paddingRight:4}}>
                  {ventas.map(v=>{
                    const circ=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
                    return(
                      <div key={v.id} style={{background:BK3,border:"1px solid "+BK4,borderRadius:10,padding:"14px 16px",borderLeft:"3px solid "+R}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div>
                            <div>
                              <span style={{color:R,fontFamily:"monospace",fontWeight:900,fontSize:16,marginRight:8}}>{"#"+(v.num_piloto||"—")}</span>
                              <span style={{fontWeight:900,fontSize:17,color:"white"}}>{v.piloto}</span>
                            </div>
                            <div style={{fontSize:11,color:GR2,marginTop:2}}>{v.email_cliente}</div>
                            <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                              <Chip c={R}>{v.categoria}</Chip>
                              <Chip c={GR3}>{circ?.num+" "+circ?.nombre}</Chip>
                              <Chip c={v.tipo_factura==="FAC"?R:VRD}>{v.tipo_factura==="FAC"?"FAC — "+v.cuit:"Cons. Final"}</Chip>
                              <Chip c={ORG}>{v.metodo.replace(/_/g," ").toUpperCase()}</Chip>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontWeight:900,color:R,fontSize:20,fontFamily:"monospace"}}>{fmt(v.total_monto,v.moneda)}</div>
                            <div style={{fontSize:11,color:GR2}}>{v.total_unidades+" u."}</div>
                          </div>
                        </div>
                        <div style={{borderTop:"1px solid "+BK4,paddingTop:8,display:"flex",flexDirection:"column",gap:4}}>
                          {v.items.map((item,i)=>{
                            const p=PRODUCTOS.find(x=>x.id===item.prod_id);
                            return(
                              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <Chip c={p?.tipo==="Trasero"?R:"white"}>{p?.tipo}</Chip>
                                  <span style={{color:"white",fontWeight:700}}>{p?.label}</span>
                                  <span style={{color:GR2}}>{"×"+item.cantidad}</span>
                                </div>
                                <span style={{color:R,fontWeight:700,fontFamily:"monospace"}}>{fmt(item.total,v.moneda)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ MIS STATS (vendedor) ══ */}
        {tab==="mis_stats"&&!isAdmin&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:16}}>
              {["USD","ARS"].map(m=>totales[m]?(
                <BigKPI key={m} label={"Total "+m} val={fmt(totales[m],m)} c={m==="USD"?VRD:R}/>
              ):null)}
              <BigKPI label="Ventas" val={ventas.length} c="white"/>
              <BigKPI label="Unidades" val={ventas.reduce((s,v)=>s+v.total_unidades,0)} c={R}/>
            </div>
            {/* Por categoría */}
            <div style={tCardSt}>
              <ST>Ventas por Categoría</ST>
              {todasLasCats.map(cat=>{
                const vcat=ventas.filter(v=>v.categoria===cat);
                if(!vcat.length) return null;
                const uni=vcat.reduce((s,v)=>s+v.total_unidades,0);
                const maxUni=Math.max(...todasLasCats.map(c=>ventas.filter(v=>v.categoria===c).reduce((s,v)=>s+v.total_unidades,0)));
                return(
                  <div key={cat} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontWeight:700}}>{cat}</span>
                      <span style={{color:R,fontWeight:900}}>{uni+" u."}</span>
                    </div>
                    <div style={{background:BK4,borderRadius:4,height:8}}>
                      <div style={{height:"100%",borderRadius:4,background:"linear-gradient(90deg,"+R+",white)",width:(maxUni>0?uni/maxUni*100:0)+"%",transition:"width .4s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Stock flotante visible para vendedor */}
            <div style={tCardSt}>
              <ST>Stock Disponible (Flotante)</ST>
              {PRODUCTOS.map(p=>{
                const f=stock[p.id]?.flotante??0;
                return(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid "+BK4}}>
                    <span style={{fontWeight:700}}>{p.label}</span>
                    <div style={{display:"flex",gap:16,fontSize:14}}>
                      <span style={{color:f<=0?"#ff5555":VRD,fontWeight:800}}>{"🟢 "+f+" flotante"}</span>
                      <span style={{color:GR2}}>{"📦 "+(stock[p.id]?.bodega??0)+" bodega"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ STOCK (admin) ══ */}
        {tab==="stock"&&isAdmin&&(
          <div style={tCardSt}>
            <ST>Control de Stock Pirelli</ST>
            <div style={{background:"rgba(168,85,247,0.05)",border:"1px solid "+BK4,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12}}>
              <span style={{color:R,fontWeight:700}}>Bodega Pirelli</span>{" — depósito. "}
              <span style={{color:VRD,fontWeight:700}}>Stock Flotante</span>{" — en pista, disponible para vender."}
              <span style={{color:ORG,fontWeight:700,marginLeft:8}}>Solo el flotante se puede vender.</span>
            </div>
            {!stockDraft?(
              <button onClick={()=>setStockDraft({...stock})} style={{...btnAdd,marginBottom:16}}>✏️ Editar Stock</button>
            ):(
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <button onClick={()=>{ setStock(stockDraft); setStockDraft(null); boom("✓ Stock guardado"); }}
                  style={{...btnAdd,background:VRD}}>💾 GUARDAR STOCK</button>
                <button onClick={()=>setStockDraft(null)} style={{...btnAdd,background:GR3}}>Cancelar</button>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 120px 130px 80px 160px",padding:"8px 12px",fontSize:10,color:GR3,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid "+BK4,gap:8}}>
              <span>Neumático</span>
              <span style={{textAlign:"center"}}>Bodega Pirelli</span>
              <span style={{textAlign:"center"}}>Stock Flotante</span>
              <span style={{textAlign:"center"}}>Total</span>
              <span style={{textAlign:"center"}}>Mover</span>
            </div>
            {PRODUCTOS.map(p=>{
              const s = stockDraft ? stockDraft[p.id] : stock[p.id];
              const tot=(s?.bodega??0)+(s?.flotante??0);
              const alrt=tot<=5;
              const upd = (field,val) => {
                if(!stockDraft) return;
                setStockDraft(prev=>({...prev,[p.id]:{...prev[p.id],[field]:Math.max(0,val)}}));
              };
              return(
                <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 120px 130px 80px 160px",padding:"12px",borderBottom:"1px solid "+BK3,gap:8,alignItems:"center",background:alrt?"rgba(168,85,247,0.07)":"transparent"}}>
                  <div>
                    <div style={{fontWeight:700}}>{p.label}</div>
                    <div style={{fontSize:11,color:GR2}}>{"USD "+p.precios.USD+" / ARS "+p.precios.ARS.toLocaleString()}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:900,color:R,fontFamily:"monospace"}}>{s?.bodega??0}</div>
                    {stockDraft&&(
                      <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:4}}>
                        <MBtn c={R} onClick={()=>upd("bodega",(s?.bodega??0)+1)}>+</MBtn>
                        <MBtn c={GR3} onClick={()=>upd("bodega",(s?.bodega??0)-1)}>−</MBtn>
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:900,color:VRD,fontFamily:"monospace"}}>{s?.flotante??0}</div>
                    {stockDraft&&(
                      <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:4}}>
                        <MBtn c={VRD} onClick={()=>upd("flotante",(s?.flotante??0)+1)}>+</MBtn>
                        <MBtn c={GR3} onClick={()=>upd("flotante",(s?.flotante??0)-1)}>−</MBtn>
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"center",fontSize:24,fontWeight:900,fontFamily:"monospace",color:alrt?"#ff5555":"white"}}>{tot}</div>
                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                    <MBtn c={R} onClick={()=>{ if(!stockDraft) return; upd("bodega",(s?.bodega??0)-1); setStockDraft(prev=>({...prev,[p.id]:{...prev[p.id],flotante:(prev[p.id]?.flotante??0)+1}})); }}>B→F</MBtn>
                    <MBtn c={GR3} onClick={()=>{ if(!stockDraft) return; upd("flotante",(s?.flotante??0)-1); setStockDraft(prev=>({...prev,[p.id]:{...prev[p.id],bodega:(prev[p.id]?.bodega??0)+1}})); }}>F→B</MBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ ESTADÍSTICAS (admin) ══ */}
        {tab==="estadisticas"&&isAdmin&&(
          <div>
            {/* Filtros */}
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <input style={{...tInpSt,maxWidth:240}} placeholder="Buscar piloto, número, categoría..." value={busqStats} onChange={e=>setBusqStats(e.target.value)}/>
              {[["todos","Todos"],...CIRCUITOS_BASE.map(c=>[c.id,c.num+" "+c.nombre])].map(([id,lbl])=>(
                <button key={id} onClick={()=>setFiltro(id)}
                  style={{background:filtro===id?"rgba(168,85,247,0.12)":"transparent",border:"1px solid "+(filtro===id?R:BK4),color:filtro===id?"white":GR2,padding:"7px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600}}>
                  {lbl}
                </button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:16,marginBottom:20}}>
              {["USD","ARS"].map(m=>totales[m]?(
                <BigKPI key={m} label={"Total "+m} val={fmt(totales[m],m)} c={m==="USD"?VRD:R}/>
              ):null)}
              <BigKPI label="Ventas (clientes)" val={vF.length} c="white"/>
              <BigKPI label="Unidades" val={vF.reduce((s,v)=>s+v.total_unidades,0)} c={R}/>
              <BigKPI label="Cons. Final" val={vF.filter(v=>v.tipo_factura==="CF").length} c={VRD}/>
              <BigKPI label="Facturas" val={vF.filter(v=>v.tipo_factura==="FAC").length} c={R}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20,marginBottom:20}}>

              {/* Por método de pago DIFERENCIADO */}
              <div style={tCardSt}>
                <ST>Por Método de Pago</ST>
                {(()=>{
                  const mets={};
                  vF.forEach(v=>{
                    if(!mets[v.metodo]) mets[v.metodo]={usd:0,ars:0,cnt:0,uni:0};
                    if(v.moneda==="USD") mets[v.metodo].usd+=v.total_monto;
                    else mets[v.metodo].ars+=v.total_monto;
                    mets[v.metodo].cnt++;
                    mets[v.metodo].uni+=v.total_unidades;
                  });
                  const labels={"efectivo_usd":"💵 Efectivo USD","efectivo_ars":"🇦🇷 Efectivo ARS","transferencia":"🏦 Transferencia","debito":"💳 Débito/Crédito"};
                  const total=vF.length||1;
                  return Object.entries(mets).length===0?<Empty>Sin ventas</Empty>:
                    Object.entries(mets).map(([met,d])=>(
                      <div key={met} style={{padding:"10px 0",borderBottom:"1px solid "+BK4}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontWeight:700}}>{labels[met]||met}</span>
                          <span style={{color:GR2,fontSize:12}}>{d.cnt+" venta"+(d.cnt!==1?"s":"")}</span>
                        </div>
                        {d.usd>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:GR2,fontSize:12}}>USD</span><span style={{fontWeight:900,color:VRD,fontFamily:"monospace"}}>{fmt(d.usd,"USD")}</span></div>}
                        {d.ars>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:GR2,fontSize:12}}>ARS</span><span style={{fontWeight:900,color:R,fontFamily:"monospace"}}>{fmt(d.ars,"ARS")}</span></div>}
                        <div style={{background:BK4,borderRadius:4,height:5,marginTop:6}}>
                          <div style={{height:"100%",borderRadius:4,background:"linear-gradient(90deg,"+R+",white)",width:(d.cnt/total*100).toFixed(0)+"%"}}/>
                        </div>
                      </div>
                    ));
                })()}
                <div style={{borderTop:"2px solid "+R,paddingTop:10,marginTop:8}}>
                  {["USD","ARS"].map(m=>totales[m]?(
                    <div key={m} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
                      <span style={{color:GR2}}>{"Total "+m}</span>
                      <span style={{fontWeight:900,color:m==="USD"?VRD:R,fontFamily:"monospace"}}>{fmt(totales[m],m)}</span>
                    </div>
                  ):null)}
                </div>
              </div>

              {/* Por neumático con stock */}
              <div style={tCardSt}>
                <ST>Por Neumático + Stock</ST>
                {PRODUCTOS.map(p=>{
                  const uni=vF.filter(v=>v.items.some(i=>i.prod_id===p.id)).reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.cantidad,0),0);
                  const usd=vF.filter(v=>v.moneda==="USD"&&v.items.some(i=>i.prod_id===p.id)).reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.total,0),0);
                  const ars=vF.filter(v=>v.moneda==="ARS"&&v.items.some(i=>i.prod_id===p.id)).reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.total,0),0);
                  const fl=stock[p.id]?.flotante??0;
                  const bo=stock[p.id]?.bodega??0;
                  return(
                    <div key={p.id} style={{padding:"10px 0",borderBottom:"1px solid "+BK4}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <Chip c={p.tipo==="Trasero"?R:"white"}>{p.tipo}</Chip>
                          <span style={{fontWeight:700}}>{p.label}</span>
                        </div>
                        <span style={{fontWeight:900,fontSize:18}}>{uni+" u. vendidas"}</span>
                      </div>
                      {usd>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:GR2}}>USD</span><span style={{color:VRD,fontFamily:"monospace",fontWeight:700}}>{fmt(usd,"USD")}</span></div>}
                      {ars>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:GR2}}>ARS</span><span style={{color:R,fontFamily:"monospace",fontWeight:700}}>{fmt(ars,"ARS")}</span></div>}
                      <div style={{display:"flex",gap:10,marginTop:6,fontSize:12}}>
                        <span style={{background:"rgba(76,175,80,0.15)",color:VRD,padding:"2px 8px",borderRadius:4,fontWeight:700}}>{"🟢 Flotante: "+fl}</span>
                        <span style={{background:"rgba(168,85,247,0.15)",color:R,padding:"2px 8px",borderRadius:4,fontWeight:700}}>{"📦 Bodega: "+bo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CF vs Factura */}
              <div style={tCardSt}>
                <ST>Facturación — CF vs Empresa</ST>
                {(()=>{
                  const cf=vF.filter(v=>v.tipo_factura==="CF");
                  const fac=vF.filter(v=>v.tipo_factura==="FAC");
                  const tot=vF.length||1;
                  const sum=(arr,m)=>arr.filter(v=>v.moneda===m).reduce((s,v)=>s+v.total_monto,0);
                  return(
                    <div>
                      <div style={{padding:"12px 0",borderBottom:"1px solid "+BK4}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <span style={{fontWeight:700,fontSize:16}}>👤 Consumidor Final</span>
                          <span style={{color:VRD,fontWeight:700}}>{cf.length+" ventas"}</span>
                        </div>
                        {sum(cf,"USD")>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:GR2}}>USD</span><span style={{fontWeight:900,color:VRD,fontFamily:"monospace"}}>{fmt(sum(cf,"USD"),"USD")}</span></div>}
                        {sum(cf,"ARS")>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:GR2}}>ARS</span><span style={{fontWeight:900,color:R,fontFamily:"monospace"}}>{fmt(sum(cf,"ARS"),"ARS")}</span></div>}
                        <div style={{background:BK4,borderRadius:4,height:8,marginTop:8}}>
                          <div style={{height:"100%",borderRadius:4,background:VRD,width:(cf.length/tot*100).toFixed(0)+"%"}}/>
                        </div>
                      </div>
                      <div style={{padding:"12px 0"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <span style={{fontWeight:700,fontSize:16}}>🏢 Factura Empresa</span>
                          <span style={{color:R,fontWeight:700}}>{fac.length+" ventas"}</span>
                        </div>
                        {sum(fac,"USD")>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:GR2}}>USD</span><span style={{fontWeight:900,color:VRD,fontFamily:"monospace"}}>{fmt(sum(fac,"USD"),"USD")}</span></div>}
                        {sum(fac,"ARS")>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:GR2}}>ARS</span><span style={{fontWeight:900,color:R,fontFamily:"monospace"}}>{fmt(sum(fac,"ARS"),"ARS")}</span></div>}
                        {fac.length>0&&(
                          <div style={{marginTop:10,background:BK3,borderRadius:8,padding:10}}>
                            <div style={{fontSize:10,color:R,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Detalle empresas</div>
                            {fac.map((v,i)=>(
                              <div key={i} style={{fontSize:12,display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid "+BK4}}>
                                <span style={{color:GR2}}>{v.empresa||v.piloto} — CUIT {v.cuit}</span>
                                <span style={{color:R,fontFamily:"monospace",fontWeight:700}}>{fmt(v.total_monto,v.moneda)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Top compradores */}
              <div style={tCardSt}>
                <ST>Top Compradores</ST>
                {(()=>{
                  const pils={};
                  vF.forEach(v=>{
                    const k=v.piloto+"_"+v.num_piloto;
                    if(!pils[k]) pils[k]={piloto:v.piloto,num:v.num_piloto,cat:v.categoria,usd:0,ars:0,uni:0,ventas:[]};
                    if(v.moneda==="USD") pils[k].usd+=v.total_monto;
                    else pils[k].ars+=v.total_monto;
                    pils[k].uni+=v.total_unidades;
                    pils[k].ventas.push(v);
                  });
                  const sorted=Object.values(pils).sort((a,b)=>b.uni-a.uni);
                  return sorted.length===0?<Empty>Sin ventas</Empty>:sorted.map((p,i)=>(
                    <div key={i} style={{padding:"10px 0",borderBottom:"1px solid "+BK4}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div>
                            <span style={{color:R,fontFamily:"monospace",fontWeight:900,marginRight:8}}>{"#"+p.num}</span>
                            <span style={{fontWeight:700}}>{p.piloto}</span>
                          </div>
                          <div style={{fontSize:11,color:GR2}}>{p.cat+" · "+p.uni+" u."}</div>
                          {/* Formas de pago del piloto */}
                          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                            {[...new Set(p.ventas.map(v=>v.metodo))].map(m=>(
                              <span key={m} style={{fontSize:10,background:"rgba(168,85,247,0.15)",color:R,padding:"1px 6px",borderRadius:3}}>{m.replace(/_/g," ").toUpperCase()}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          {p.usd>0&&<div style={{fontWeight:900,color:VRD,fontFamily:"monospace"}}>{fmt(p.usd,"USD")}</div>}
                          {p.ars>0&&<div style={{fontWeight:900,color:R,fontFamily:"monospace"}}>{fmt(p.ars,"ARS")}</div>}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Tabla detalle */}
            <div style={tCardSt}>
              <ST>{"Detalle — "+vF.length+" registros (1 fila = 1 cliente)"}</ST>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
                  <thead>
                    <tr>{["Fecha","N°","Piloto","Cat.","Circuito","Neumáticos","Unid.","Moneda","Total","Pago","Email","Factura","CUIT"].map(h=>(
                      <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:9,color:GR2,letterSpacing:2,textTransform:"uppercase",borderBottom:"2px solid "+R,whiteSpace:"nowrap"}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {vF.length===0?<tr><td colSpan={13} style={{textAlign:"center",padding:32,color:GR3}}>Sin ventas</td></tr>:
                      vF.map(v=>{
                        const circ=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
                        const itemsStr=v.items.map(i=>{ const p=PRODUCTOS.find(x=>x.id===i.prod_id); return p?.label+"×"+i.cantidad; }).join(", ");
                        return(
                          <tr key={v.id} style={{borderBottom:"1px solid "+BK3}}>
                            <td style={tdSt}>{v.fecha}</td>
                            <td style={{...tdSt,fontFamily:"monospace",color:R}}>{"#"+(v.num_piloto||"—")}</td>
                            <td style={{...tdSt,fontWeight:700,color:"white"}}>{v.piloto}</td>
                            <td style={tdSt}><Chip c={R}>{v.categoria}</Chip></td>
                            <td style={tdSt}>{circ?.nombre}</td>
                            <td style={{...tdSt,fontSize:11,color:GR2}}>{itemsStr}</td>
                            <td style={{...tdSt,textAlign:"center"}}>{v.total_unidades}</td>
                            <td style={tdSt}><Chip c={v.moneda==="USD"?VRD:R}>{v.moneda}</Chip></td>
                            <td style={{...tdSt,color:R,fontWeight:900,fontFamily:"monospace"}}>{fmt(v.total_monto,v.moneda)}</td>
                            <td style={tdSt}><span style={{fontSize:10,color:ORG}}>{v.metodo.replace(/_/g," ").toUpperCase()}</span></td>
                            <td style={{...tdSt,fontSize:11}}>{v.email_cliente}</td>
                            <td style={tdSt}><Chip c={v.tipo_factura==="FAC"?R:VRD}>{v.tipo_factura==="FAC"?"Factura":"CF"}</Chip></td>
                            <td style={{...tdSt,fontFamily:"monospace",fontSize:11}}>{v.cuit||"—"}</td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ CIERRE (admin) ══ */}
        {tab==="cierre"&&isAdmin&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
            <div style={tCardSt}>
              <ST>Resumen de Cierre — {HOY}</ST>
              {["USD","ARS"].map(m=>totales[m]?(
                <ResRow key={m} label={"Total "+simbolo(m)} val={fmt(totales[m],m)} c={m==="USD"?VRD:R}/>
              ):null)}
              <div style={{borderTop:"1px solid "+BK4,padding:"8px 0"}}/>
              <ResRow label="Total ventas (clientes)" val={ventas.length+" ventas"} c="white"/>
              <ResRow label="Total unidades" val={ventas.reduce((s,v)=>s+v.total_unidades,0)+" neumáticos"} c="white"/>
              <div style={{borderTop:"1px solid "+BK4,padding:"8px 0"}}/>
              <ResRow label="Consumidor Final" val={ventas.filter(v=>v.tipo_factura==="CF").length+" ventas"} c={VRD}/>
              <ResRow label="Facturas Empresa" val={ventas.filter(v=>v.tipo_factura==="FAC").length+" ventas"} c={R}/>
              <button onClick={()=>exportCSV(ventas,stock)} style={{width:"100%",marginTop:20,padding:14,background:R,color:"white",border:"none",borderRadius:8,fontSize:15,fontWeight:900,letterSpacing:2,cursor:"pointer"}}>
                EXPORTAR CIERRE EN EXCEL
              </button>
              <button onClick={()=>{ if(!window.confirm("¿Borrar TODAS las ventas?")) return; setVentas([]); boom("Historial borrado"); }}
                style={{width:"100%",marginTop:8,padding:12,background:"transparent",border:"2px solid #cc2244",color:"#cc2244",borderRadius:8,fontSize:14,fontWeight:900,cursor:"pointer"}}>
                🗑 Borrar historial
              </button>
            </div>
            <div style={tCardSt}>
              <ST>Stock al Cierre</ST>
              {PRODUCTOS.map(p=>{
                const s=stock[p.id];
                return(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid "+BK4}}>
                    <span style={{fontWeight:700}}>{p.label}</span>
                    <div style={{display:"flex",gap:10,fontSize:13}}>
                      <span style={{color:R}}>Bodega: <b>{s?.bodega??0}</b></span>
                      <span style={{color:VRD}}>Flotante: <b>{s?.flotante??0}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ GESTIÓN (admin) ══ */}
        {tab==="gestion"&&isAdmin&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
            {/* Pilotos */}
            <div style={tCardSt}>
              <ST>Agregar Piloto</ST>
              <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8,marginBottom:8}}>
                <input id="gnum" style={tInpSt} placeholder="N°"/>
                <input id="gnombre" style={tInpSt} placeholder="Nombre completo"/>
              </div>
              <select id="gcat" style={{...tInpSt,marginBottom:8}}>
                {todasLasCats.map(c=><option key={c}>{c}</option>)}
              </select>
              <button onClick={()=>{
                const num=document.getElementById('gnum').value.trim();
                const nombre=document.getElementById('gnombre').value.trim();
                const cat=document.getElementById('gcat').value;
                if(!num||!nombre){boom("Completa número y nombre",true);return;}
                setPilotos([...pilotos,{num,nombre,cat}]);
                document.getElementById('gnum').value='';
                document.getElementById('gnombre').value='';
                boom("Piloto agregado: "+nombre);
              }} style={{...btnAdd,width:"100%",marginBottom:16}}>+ Agregar Piloto</button>

              <input style={{...tInpSt,marginBottom:12}} placeholder="Buscar..." value={busqPiloto} onChange={e=>setBusqPiloto(e.target.value)}/>
              <div style={{maxHeight:300,overflowY:"auto"}}>
                {todasLasCats.map(cat=>{
                  const ps=todosLosPilotos.filter(p=>p.cat===cat&&(!busqPiloto||p.nombre.toLowerCase().includes(busqPiloto.toLowerCase())||p.num.includes(busqPiloto)));
                  if(!ps.length) return null;
                  return(
                    <div key={cat} style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:R,letterSpacing:3,fontWeight:900,textTransform:"uppercase",marginBottom:6}}>{cat}</div>
                      {ps.map((p,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:BK3,borderRadius:6,marginBottom:4}}>
                          <span style={{color:R,fontFamily:"monospace",fontWeight:900,minWidth:36}}>{"#"+p.num}</span>
                          <span style={{fontWeight:700,flex:1}}>{p.nombre}</span>
                          {pilotos.find(x=>x.num===p.num&&x.nombre===p.nombre)&&(
                            <button onClick={()=>setPilotos(pilotos.filter(x=>!(x.num===p.num&&x.nombre===p.nombre)))}
                              style={{background:"transparent",border:"none",color:"#cc2244",cursor:"pointer",fontSize:16}}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              {/* Categorías */}
              <div style={tCardSt}>
                <ST>Categorías</ST>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <input id="gcatnueva" style={{...tInpSt,flex:1}} placeholder="Nueva categoría..."/>
                  <button onClick={()=>{
                    const val=document.getElementById('gcatnueva').value.trim();
                    if(!val) return;
                    setCats([...cats,val]);
                    document.getElementById('gcatnueva').value='';
                    boom("Categoría agregada: "+val);
                  }} style={btnAdd}>+ Agregar</button>
                </div>
                {todasLasCats.map(c=>(
                  <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:BK3,borderRadius:6,marginBottom:4}}>
                    <span style={{fontWeight:700}}>{c}</span>
                    {cats.includes(c)&&(
                      <button onClick={()=>setCats(cats.filter(x=>x!==c))} style={{background:"transparent",border:"none",color:"#cc2244",cursor:"pointer",fontSize:16}}>×</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Precios */}
              <div style={tCardSt}>
                <ST>Editar Precios</ST>
                {PRODUCTOS.map(p=>(
                  <div key={p.id} style={{marginBottom:12,padding:"10px 12px",background:BK3,borderRadius:8,border:"1px solid "+BK4}}>
                    <div style={{fontWeight:700,marginBottom:6}}>{p.label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <label style={{fontSize:10,color:GR2}}>USD
                        <input type="number" style={{...tInpSt,marginTop:4}}
                          value={precios[p.id]?.USD??p.precios.USD}
                          onChange={e=>setPrecios({...precios,[p.id]:{...precios[p.id],USD:+e.target.value}})}/>
                      </label>
                      <label style={{fontSize:10,color:GR2}}>ARS
                        <input type="number" style={{...tInpSt,marginTop:4}}
                          value={precios[p.id]?.ARS??p.precios.ARS}
                          onChange={e=>setPrecios({...precios,[p.id]:{...precios[p.id],ARS:+e.target.value}})}/>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Logo + Tema */}
              <div style={tCardSt}>
                <ST>Logo de la App</ST>
                <input type="file" accept="image/*" onChange={e=>{
                  const file=e.target.files[0];
                  if(!file) return;
                  const reader=new FileReader();
                  reader.onload=ev=>{ setLogoUrl(ev.target.result); boom("✓ Logo actualizado"); };
                  reader.readAsDataURL(file);
                }} style={{...tInpSt,padding:8,cursor:"pointer"}}/>
                {logoUrl&&(
                  <div style={{marginTop:12,textAlign:"center"}}>
                    <img src={logoUrl} alt="Logo" style={{maxHeight:80,maxWidth:"100%",objectFit:"contain",borderRadius:8}}/>
                    <button onClick={()=>{setLogoUrl(null);boom("Logo eliminado");}} style={{display:"block",margin:"8px auto 0",background:"transparent",border:"1px solid #cc2244",color:"#cc2244",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12}}>× Eliminar logo</button>
                  </div>
                )}
              </div>

              {/* Editor de colores */}
              <div style={tCardSt}>
                <ST>Colores de la App</ST>

                {/* Paletas predefinidas */}
                <div style={{fontSize:10,color:GR2,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Paletas predefinidas</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8,marginBottom:16}}>
                  {[
                    {nombre:"Púrpura",bg:"#1a0a2e",acc:"#a855f7",sec:"#FFFFFF",card:"#22103a",borde:"#3d2060"},
                    {nombre:"GP3 Original",bg:"#0a0a0a",acc:"#E8001D",sec:"#6ACCE4",card:"#111111",borde:"#222222"},
                    {nombre:"Azul Noche",bg:"#020b18",acc:"#0ea5e9",sec:"#38bdf8",card:"#0c1a2e",borde:"#1e3a5f"},
                    {nombre:"Verde Racing",bg:"#031a0a",acc:"#16a34a",sec:"#86efac",card:"#052e16",borde:"#14532d"},
                    {nombre:"Naranja Fuego",bg:"#1a0800",acc:"#ea580c",sec:"#fdba74",card:"#2a1000",borde:"#7c2d12"},
                    {nombre:"Gris Acero",bg:"#111827",acc:"#6366f1",sec:"#a5b4fc",card:"#1f2937",borde:"#374151"},
                  ].map((p,i)=>(
                    <button key={i} onClick={()=>{
                      setTema({bg:p.bg,acc:p.acc,sec:p.sec,card:p.card,borde:p.borde});
                      lsSet("gp3_tema",{bg:p.bg,acc:p.acc,sec:p.sec,card:p.card,borde:p.borde});
                      boom("✓ Paleta "+p.nombre+" aplicada");
                    }} style={{padding:"10px 8px",borderRadius:8,cursor:"pointer",border:"2px solid "+p.acc,background:p.bg,display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
                      <div style={{display:"flex",gap:3}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:p.acc}}/>
                        <div style={{width:14,height:14,borderRadius:"50%",background:p.sec}}/>
                        <div style={{width:14,height:14,borderRadius:"50%",background:p.card}}/>
                      </div>
                      <span style={{fontSize:10,color:"white",fontWeight:700}}>{p.nombre}</span>
                    </button>
                  ))}
                </div>

                {/* Colores personalizados */}
                <div style={{fontSize:10,color:GR2,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Personalizar colores</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    ["bg","Fondo principal"],
                    ["card","Fondo tarjetas"],
                    ["borde","Bordes"],
                    ["acc","Color acento (botones)"],
                    ["sec","Color secundario"],
                  ].map(([key,lbl])=>(
                    <div key={key} style={{display:"flex",flexDirection:"column",gap:4}}>
                      <label style={{fontSize:10,color:GR2,letterSpacing:1}}>{lbl}</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={tema[key]||"#a855f7"}
                          onChange={e=>{
                            const v={...tema,[key]:e.target.value};
                            setTema(v); lsSet("gp3_tema",v);
                          }}
                          style={{width:44,height:36,borderRadius:6,border:"none",cursor:"pointer",padding:2,background:"transparent"}}/>
                        <span style={{fontFamily:"monospace",fontSize:12,color:"white"}}>{tema[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={()=>{
                  const def={bg:"#1a0a2e",acc:"#a855f7",sec:"#FFFFFF",card:"#22103a",borde:"#3d2060"};
                  setTema(def); lsSet("gp3_tema",def);
                  boom("Colores restaurados");
                }} style={{marginTop:14,width:"100%",padding:10,background:"transparent",border:"1px solid "+GR3,color:GR2,borderRadius:6,cursor:"pointer",fontSize:12}}>
                  ↺ Restaurar colores por defecto
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{textAlign:"center",padding:14,fontSize:10,color:GR3,borderTop:"1px solid "+BK4,letterSpacing:2,textTransform:"uppercase",marginTop:20}}>
        GP3 Sports LATAM — CAV 2026 — Pirelli Official Partner — {EMAIL_DESTINO}
      </footer>
    </div>
  );
}

// ─── COMPONENTES ─────────────────────────────────────────────────────────────
function ST({children}){return <div style={{fontSize:11,fontWeight:900,letterSpacing:3,textTransform:"uppercase",color:"white",marginBottom:16,paddingBottom:10,borderBottom:"2px solid "+R,display:"flex",alignItems:"center",gap:8}}><span style={{width:3,height:14,background:R,display:"inline-block",borderRadius:2,flexShrink:0}}/>{children}</div>;}
function Fld({label,children}){return <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}><label style={{fontSize:10,color:GR2,letterSpacing:2,textTransform:"uppercase"}}>{label}</label>{children}</div>;}
function Chip({children,c}){return <span style={{display:"inline-block",fontSize:10,padding:"2px 7px",borderRadius:3,background:c+"33",color:c,border:"1px solid "+c+"55",textTransform:"uppercase",letterSpacing:.5,fontWeight:700}}>{children}</span>;}
function KPI({label,val,c}){return <div style={{textAlign:"center",padding:"6px 14px",background:BK3,borderRadius:8,borderBottom:"3px solid "+c}}><div style={{fontSize:9,color:GR2,letterSpacing:1,textTransform:"uppercase"}}>{label}</div><div style={{fontSize:18,fontWeight:900,color:c}}>{val}</div></div>;}
function BigKPI({label,val,c}){return <div style={{background:BK3,border:"1px solid "+BK4,borderRadius:10,padding:"16px 20px",textAlign:"center",borderTop:"3px solid "+c}}><div style={{fontSize:9,color:GR2,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{label}</div><div style={{fontSize:28,fontWeight:900,color:c,lineHeight:1}}>{val}</div></div>;}
function ResRow({label,val,c}){return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+BK4}}><span style={{fontSize:13,color:GR2}}>{label}</span><span style={{fontSize:16,fontWeight:900,color:c}}>{val}</span></div>;}
function MBtn({children,c,onClick}){return <button onClick={onClick} style={{background:"transparent",border:"1px solid "+c,color:c,borderRadius:4,padding:"3px 8px",fontSize:11,cursor:"pointer",fontWeight:800}}>{children}</button>;}
function Empty({children}){return <div style={{textAlign:"center",padding:32,color:GR3,fontSize:13}}>{children}</div>;}

const cardSt = {background:BK2,border:"1px solid "+BK4,borderRadius:12,padding:24};
const inpSt  = {background:BK3,border:"1px solid "+BK4,color:"white",borderRadius:6,padding:"10px 12px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit"};
const btnBase = {padding:"12px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:14,fontWeight:900,letterSpacing:2};
const btnAdd  = {background:R,border:"none",color:"white",borderRadius:6,padding:"10px 16px",cursor:"pointer",fontWeight:900,fontSize:13,whiteSpace:"nowrap"};
const cantBtn = {background:BK4,border:"1px solid "+GR3,color:"white",borderRadius:4,width:28,height:28,cursor:"pointer",fontSize:16,fontWeight:900};
const tdSt    = {padding:"9px 10px"};
const loginCard = {background:BK2,border:"1px solid "+BK4,borderRadius:16,padding:32,textAlign:"center",width:220};
