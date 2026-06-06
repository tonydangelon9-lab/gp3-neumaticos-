import { useState, useMemo, useEffect, useRef } from "react";

// ─── BRAND MotoGP/F1 Style ───────────────────────────────────────────────────
const C = {
  red:     "#E8001D",
  dark:    "#0a0a0f",
  dark2:   "#111118",
  dark3:   "#1a1a24",
  dark4:   "#222230",
  border:  "#2a2a3a",
  border2: "#333345",
  white:   "#ffffff",
  gray:    "#8888aa",
  gray2:   "#555570",
  green:   "#00d4aa",
  orange:  "#ff6b00",
  yellow:  "#ffd700",
};

const ADMIN_PIN     = "GP3admin";
const EMAIL_DESTINO = "Francisca@gp3chile.cl";
const SHEETS_URL    = "https://script.google.com/macros/s/AKfycbxh0cN7SV9tZtR0bgvZH6ysGzxQgApFiKn7O4C9mN7HUV8h3hWpLbq2fqYbw5XV1Jk3/exec";

async function syncSheets(type, data) {
  try {
    await fetch(SHEETS_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...data })
    });
  } catch(e) { console.log("Sync error:", e); }
}

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────
const PRODUCTOS = [
  { id:"m110sc1", tipo:"Delantero", label:"Modelo 110 SC1", precios:{ USD:500, ARS:700000 } },
  { id:"m140sc1", tipo:"Trasero",   label:"Modelo 140 SC1", precios:{ USD:500, ARS:700000 } },
  { id:"m120sc1", tipo:"Delantero", label:"Modelo 120 SC1", precios:{ USD:300, ARS:415000 } },
  { id:"m180sc2", tipo:"Trasero",   label:"Modelo 180 SC2", precios:{ USD:400, ARS:555000 } },
  { id:"m200sc1", tipo:"Trasero",   label:"Modelo 200 SC1", precios:{ USD:400, ARS:555000 } },
];

const CIRCUITOS_BASE = [
  { id:"f1", num:"1ª", nombre:"Termas de Río Hondo",       inicio:"2026-04-03", fin:"2026-04-05" },
  { id:"f2", num:"2ª", nombre:"Toay",                      inicio:"2026-05-22", fin:"2026-05-24" },
  { id:"f3", num:"3ª", nombre:"San Nicolás",                inicio:"2026-06-19", fin:"2026-06-21" },
  { id:"f4", num:"4ª", nombre:"Concordia",                  inicio:"2026-08-07", fin:"2026-08-09" },
  { id:"f5", num:"5ª", nombre:"San Juan Villicum",          inicio:"2026-09-04", fin:"2026-09-06" },
  { id:"f6", num:"6ª", nombre:"Termas de Río Hondo 2",     inicio:"2026-10-09", fin:"2026-10-11" },
  { id:"f7", num:"7ª", nombre:"San Juan Villicum — Final",  inicio:"2026-11-13", fin:"2026-11-15" },
];

const HOY = new Date().toISOString().slice(0,10);

function getCircuitosVendedor() { return CIRCUITOS_BASE.filter(c => c.fin >= HOY); }
function getCircuitoActivo() {
  const activo = CIRCUITOS_BASE.find(c => HOY >= c.inicio && HOY <= c.fin);
  if (activo) return activo;
  return CIRCUITOS_BASE.find(c => c.inicio > HOY) || CIRCUITOS_BASE[CIRCUITOS_BASE.length-1];
}

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
  m110sc1: { bodega:13, transito:0, flotante:0 },
  m140sc1: { bodega:13, transito:0, flotante:0 },
  m120sc1: { bodega:38, transito:0, flotante:0 },
  m180sc2: { bodega:6,  transito:0, flotante:0 },
  m200sc1: { bodega:80, transito:0, flotante:0 },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getPrecio(prod, moneda, preciosEdit) {
  if (!prod) return 0;
  const p = preciosEdit?.[prod.id] || prod.precios;
  return moneda === "ARS" ? p.ARS : p.USD;
}
function fmt(val, moneda) {
  const n = Number(val).toLocaleString("es-AR");
  return moneda === "ARS" ? "$ " + n : "USD " + n;
}
function lsGet(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function exportCSV(ventas, stock) {
  const S=";", BOM="\uFEFF";
  const cols = ["ID Venta","Fecha","Circuito","N Piloto","Piloto","Categoria","Email","Factura","CUIT","Empresa","Metodo","Moneda","Neumaticos","Total"];
  const row = v => {
    const c = CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
    const items = v.items.map(i=>{ const p=PRODUCTOS.find(x=>x.id===i.prod_id); return (p?.label||"")+":"+i.cantidad; }).join(" | ");
    return [v.id,v.fecha,c?.nombre||"",v.num_piloto||"",v.piloto,v.categoria,v.email_cliente,v.tipo_factura==="FAC"?"Factura":"CF",v.cuit||"",v.empresa||"",v.metodo,v.moneda,items,v.total_monto].join(S);
  };
  const stk = PRODUCTOS.map(p=>[p.label,stock[p.id]?.bodega??0,stock[p.id]?.transito??0,stock[p.id]?.flotante??0].join(S));
  const csv = BOM+["VENTAS",cols.join(S),...ventas.map(row),"","STOCK",["Producto","Bodega","Transito","Flotante"].join(S),...stk].join("\n");
  try {
    const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="GP3_"+HOY+".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch(e) { alert("Error al exportar"); }
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;background:#0a0a0f;}
  body{font-family:'Barlow',sans-serif;color:#fff;-webkit-font-smoothing:antialiased;}
  input,select,button{font-family:'Barlow',sans-serif;}
  input:-webkit-autofill{-webkit-box-shadow:0 0 0 30px #1a1a24 inset!important;-webkit-text-fill-color:#fff!important;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:#111;}
  ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @media(max-width:640px){
    .desktop-grid{grid-template-columns:1fr!important;}
  }
  .anim-in{animation:fadeIn .25s ease forwards;}
  .slide-up{animation:slideUp .3s ease forwards;}
`;

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Logo({ size = "md" }) {
  const s = size === "sm" ? { gp:22, n3:28, sub:7, gap:6 }
           : size === "lg" ? { gp:32, n3:40, sub:9, gap:8 }
           : { gp:26, n3:32, sub:8, gap:7 };
  return (
    <div style={{display:"flex",alignItems:"center",gap:s.gap}}>
      <div style={{display:"flex",alignItems:"stretch"}}>
        <div style={{background:"#fff",borderRadius:"6px 0 0 6px",padding:"3px 8px",display:"flex",alignItems:"center"}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.gp,fontWeight:900,color:"#0a0a0f",letterSpacing:-1,lineHeight:1}}>GP</span>
        </div>
        <div style={{background:C.red,borderRadius:"0 6px 6px 0",padding:"0 8px",display:"flex",alignItems:"center",transform:"skewX(-6deg)",marginLeft:-2}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.n3,fontWeight:900,color:"#fff",letterSpacing:-2,lineHeight:1,display:"inline-block",transform:"skewX(6deg)"}}> 3</span>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.sub+2,fontWeight:700,color:"#fff",letterSpacing:3,textTransform:"uppercase",lineHeight:1}}>SPORTS LATAM</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.sub,fontWeight:600,color:C.red,letterSpacing:2,textTransform:"uppercase",lineHeight:1}}>NEUMÁTICOS PIRELLI</span>
      </div>
    </div>
  );
}

function Badge({ children, color = C.red, small }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",
      padding: small ? "2px 6px" : "3px 8px",
      borderRadius:3,
      background: color+"22",
      border:`1px solid ${color}44`,
      color,
      fontSize: small ? 9 : 10,
      fontWeight:700,
      letterSpacing:1,
      textTransform:"uppercase",
      fontFamily:"'Barlow Condensed',sans-serif",
      whiteSpace:"nowrap",
    }}>{children}</span>
  );
}

function Pill({ children, active, color = C.red, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"6px 14px",borderRadius:20,cursor:"pointer",
      fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,
      border:`1px solid ${active ? color : C.border2}`,
      background: active ? color+"22" : "transparent",
      color: active ? "#fff" : C.gray,
      transition:"all .2s",whiteSpace:"nowrap",
    }}>{children}</button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background:C.dark3,
      border:`1px solid ${C.border}`,
      borderRadius:12,
      overflow:"hidden",
      ...style
    }}>{children}</div>
  );
}

function CardHeader({ children }) {
  return (
    <div style={{
      padding:"12px 16px",
      borderBottom:`1px solid ${C.border}`,
      display:"flex",alignItems:"center",gap:8,
    }}>
      <div style={{width:3,height:16,background:C.red,borderRadius:2,flexShrink:0}}/>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"#fff"}}>{children}</span>
    </div>
  );
}

function StatBox({ label, value, color = "#fff", sub }) {
  return (
    <div style={{
      background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,
      padding:"12px 14px",flex:1,minWidth:80,
      borderTop:`2px solid ${color}`,
    }}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color,lineHeight:1,letterSpacing:-1}}>{value}</div>
      {sub && <div style={{fontSize:10,color,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,marginTop:1}}>{sub}</div>}
      <div style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginTop:3,fontFamily:"'Barlow Condensed',sans-serif"}}>{label}</div>
    </div>
  );
}

function Input({ style, ...props }) {
  return (
    <input style={{
      background:C.dark4,border:`1px solid ${C.border2}`,color:"#fff",
      borderRadius:8,padding:"11px 14px",fontSize:15,outline:"none",
      width:"100%",transition:"border .2s",
      fontFamily:"'Barlow',sans-serif",
      ...style
    }} {...props}
    onFocus={e=>e.target.style.borderColor=C.red}
    onBlur={e=>e.target.style.borderColor=C.border2}
    />
  );
}

function Select({ children, style, ...props }) {
  return (
    <select style={{
      background:C.dark4,border:`1px solid ${C.border2}`,color:"#fff",
      borderRadius:8,padding:"11px 14px",fontSize:15,outline:"none",
      width:"100%",appearance:"none",
      fontFamily:"'Barlow',sans-serif",
      ...style
    }} {...props}>{children}</select>
  );
}

function Btn({ children, onClick, color = C.red, outline, full, small, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"flex",alignItems:"center",justifyContent:"center",gap:6,
      padding: small ? "8px 14px" : "12px 20px",
      borderRadius:8,cursor:disabled?"not-allowed":"pointer",
      fontFamily:"'Barlow Condensed',sans-serif",fontSize: small ? 13 : 15,fontWeight:700,letterSpacing:1,
      width: full ? "100%" : undefined,
      border:`2px solid ${outline ? color : "transparent"}`,
      background: outline ? "transparent" : disabled ? C.dark4 : color,
      color: outline ? color : disabled ? C.gray : "#fff",
      transition:"all .2s",
      opacity: disabled ? .5 : 1,
      textTransform:"uppercase",
      ...style
    }}>{children}</button>
  );
}

function Toast({ msg, err }) {
  return (
    <div style={{
      position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,
      padding:"12px 20px",borderRadius:10,fontWeight:700,fontSize:14,color:"#fff",
      background: err ? "#cc1133" : "#00a878",
      boxShadow:"0 8px 32px rgba(0,0,0,.6)",
      fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,
      whiteSpace:"nowrap",maxWidth:"90vw",textAlign:"center",
      animation:"slideUp .2s ease",
    }}>{msg}</div>
  );
}

function Label({ children }) {
  return <div style={{fontSize:10,color:C.gray,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif",marginBottom:6,fontWeight:600}}>{children}</div>;
}

function Field({ label, children }) {
  return <div style={{display:"flex",flexDirection:"column",marginBottom:14}}><Label>{label}</Label>{children}</div>;
}

function Divider() {
  return <div style={{height:1,background:C.border,margin:"8px 0"}}/>;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [modo, setModo]       = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [tab, setTab]         = useState("venta");
  const [toast, setToast]     = useState(null);
  const [filtro, setFiltro]   = useState("todos");
  const [busqStats, setBusqStats] = useState("");
  const [busqPiloto, setBusqPiloto] = useState("");

  // Persistencia
  const [ventas,   setVentasRaw]  = useState(() => lsGet("gp3_ventas", []));
  const [stock,    setStockRaw]   = useState(() => lsGet("gp3_stock", STOCK0));
  const [pilotos,  setPilotosRaw] = useState(() => lsGet("gp3_pilotos", []));
  const [cats,     setCatsRaw]    = useState(() => lsGet("gp3_cats", []));
  const [precios,  setPreciosRaw] = useState(() => lsGet("gp3_precios", Object.fromEntries(PRODUCTOS.map(p=>[p.id,{...p.precios}]))));
  const [cierres,  setCierresRaw] = useState(() => lsGet("gp3_cierres", []));
  const [stockDraft, setStockDraft] = useState(null);

  const setVentas  = v => { lsSet("gp3_ventas",  v); setVentasRaw(v);  };
  const setStock   = v => { lsSet("gp3_stock",   v); setStockRaw(v);   };
  const setPilotos = v => { lsSet("gp3_pilotos", v); setPilotosRaw(v); };
  const setCats    = v => { lsSet("gp3_cats",    v); setCatsRaw(v);    };
  const setPrecios = v => { lsSet("gp3_precios", v); setPreciosRaw(v); };
  const setCierres = v => { lsSet("gp3_cierres", v); setCierresRaw(v); };

  const boom = (msg, err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null),3000); };
  const isAdmin = modo === "admin";

  const todosLosPilotos = useMemo(()=>[...PILOTOS_BASE,...pilotos],[pilotos]);
  const todasLasCats    = useMemo(()=>[...new Set([...CATS_BASE,...cats])],[cats]);
  const circuitos       = isAdmin ? CIRCUITOS_BASE : getCircuitosVendedor();
  const circActivo      = getCircuitoActivo();

  // Form
  const FORM0 = {
    circ_id: circActivo.id, fecha: HOY,
    piloto:"", num_piloto:"", categoria: todasLasCats[0]||"",
    moneda:"USD", metodo:"efectivo_usd",
    email_cliente:"", tipo_factura:"CF", cuit:"", empresa:"",
  };
  const [form, setForm]   = useState(FORM0);
  const [pilotoQ, setPilotoQ] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [cantSel, setCantSel] = useState(Object.fromEntries(PRODUCTOS.map(p=>[p.id,0])));

  const sugerencias = useMemo(()=>{
    if(pilotoQ.length<2) return [];
    const q=pilotoQ.toLowerCase();
    return todosLosPilotos.filter(p=>p.nombre.toLowerCase().includes(q)||p.num.includes(q)).slice(0,8);
  },[pilotoQ,todosLosPilotos]);

  const selPiloto = p => { setForm(f=>({...f,piloto:p.nombre,num_piloto:p.num,categoria:p.cat})); setPilotoQ(p.nombre); setShowSug(false); };

  const carritoConPrecios = carrito.map(item=>{
    const p = PRODUCTOS.find(x=>x.id===item.prod_id);
    const pu = getPrecio(p, form.moneda, precios);
    return {...item, prod:p, precio_unit:pu, total:pu*item.cantidad};
  });
  const carritoTotal = carritoConPrecios.reduce((s,i)=>s+i.total,0);
  const carritoUnits = carrito.reduce((s,i)=>s+i.cantidad,0);

  const agregarProducto = prodId => {
    const cant = cantSel[prodId]??0;
    if(cant<=0){boom("Ingresa una cantidad mayor a 0",true);return;}
    const flotDisp = stock[prodId]?.flotante??0;
    const enCar = carrito.find(i=>i.prod_id===prodId)?.cantidad??0;
    if(cant+enCar>flotDisp){boom("Stock flotante insuficiente — solo hay "+flotDisp,true);return;}
    setCarrito(prev=>{
      const idx=prev.findIndex(i=>i.prod_id===prodId);
      if(idx>=0){const u=[...prev];u[idx]={...u[idx],cantidad:u[idx].cantidad+cant};return u;}
      return [...prev,{prod_id:prodId,cantidad:cant}];
    });
    boom(PRODUCTOS.find(x=>x.id===prodId)?.label+" ×"+cant+" → carrito");
    setCantSel(c=>({...c,[prodId]:0}));
  };

  const registrar = () => {
    if(!form.piloto.trim())        {boom("Ingresa el nombre del piloto",true);return;}
    if(!form.email_cliente.trim()) {boom("Ingresa el email del cliente",true);return;}
    if(form.tipo_factura==="FAC"&&!form.cuit.trim()){boom("Ingresa el CUIT",true);return;}
    if(carrito.length===0)         {boom("Agrega al menos un neumático",true);return;}
    const nuevaVenta = {
      id:Date.now(), circ_id:form.circ_id, fecha:form.fecha,
      piloto:form.piloto, num_piloto:form.num_piloto, categoria:form.categoria,
      email_cliente:form.email_cliente, tipo_factura:form.tipo_factura,
      cuit:form.cuit, empresa:form.empresa, metodo:form.metodo, moneda:form.moneda,
      items:carritoConPrecios.map(i=>({prod_id:i.prod_id,cantidad:i.cantidad,precio_unit:i.precio_unit,total:i.total})),
      total_monto:carritoTotal, total_unidades:carritoUnits,
    };
    setVentas([nuevaVenta,...ventas]);
    syncSheets("venta",{venta:nuevaVenta});
    const nuevoStock={...stock};
    carrito.forEach(item=>{
      nuevoStock[item.prod_id]={...nuevoStock[item.prod_id],flotante:Math.max(0,(nuevoStock[item.prod_id].flotante??0)-item.cantidad)};
    });
    setStock(nuevoStock);
    syncSheets("stock",{stock:nuevoStock});
    boom("✓ Venta registrada — "+carritoUnits+" neumático"+(carritoUnits!==1?"s":""));
    setCarrito([]); setForm({...FORM0}); setPilotoQ(""); setShowSug(false);
    setCantSel(Object.fromEntries(PRODUCTOS.map(p=>[p.id,0])));
  };

  const totales = useMemo(()=>{
    const t={};
    ventas.forEach(v=>{t[v.moneda]=(t[v.moneda]||0)+v.total_monto;});
    return t;
  },[ventas]);

  const vF = useMemo(()=>{
    let r = filtro==="todos" ? ventas : ventas.filter(v=>v.circ_id===filtro);
    if(busqStats.trim().length>1){const q=busqStats.toLowerCase();r=r.filter(v=>v.piloto.toLowerCase().includes(q)||v.num_piloto.includes(q)||v.categoria.toLowerCase().includes(q));}
    return r;
  },[ventas,filtro,busqStats]);

  useEffect(()=>{ syncSheets("stock",{stock}); },[]);

  // ── NAV TABS ──
  const tabs = isAdmin
    ? [["venta","🛒 Venta"],["stock","📦 Stock"],["estadisticas","📊 Stats"],["cierre","🗂 Cierre"],["gestion","⚙️ Gestión"]]
    : [["venta","🛒 Venta"],["mis_stats","📊 Mi Resumen"]];

  // ══ LOGIN ══
  if(!modo) return (
    <>
      <style>{GS}</style>
      <div style={{minHeight:"100vh",background:C.dark,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:32,fontFamily:"'Barlow',sans-serif"}}>
        {/* Stripe top */}
        <div style={{position:"fixed",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.red},#ff6b6b,${C.red})`}}/>

        <div className="slide-up" style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <Logo size="lg"/>
          <div style={{marginTop:4}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:4,color:C.red,textTransform:"uppercase",fontWeight:700}}>CAV — Campeonato Argentino de Velocidad 2026</span>
          </div>
        </div>

        <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",width:"100%",maxWidth:440}}>
          {/* Vendedor */}
          <div className="anim-in" style={{flex:1,minWidth:180,background:C.dark3,border:`1px solid ${C.border}`,borderRadius:14,padding:24,textAlign:"center",borderTop:`3px solid ${C.green}`}}>
            <div style={{fontSize:32,marginBottom:10}}>🛒</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:"#fff",letterSpacing:2,marginBottom:4}}>MODO VENTA</div>
            <div style={{fontSize:12,color:C.gray,marginBottom:20}}>Registrar ventas en pista</div>
            <Btn full color={C.green} onClick={()=>{setModo("vendedor");setTab("venta");}}>INGRESAR</Btn>
          </div>

          {/* Admin */}
          <div className="anim-in" style={{flex:1,minWidth:180,background:C.dark3,border:`1px solid ${C.border}`,borderRadius:14,padding:24,textAlign:"center",borderTop:`3px solid ${C.red}`}}>
            <div style={{fontSize:32,marginBottom:10}}>📊</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:"#fff",letterSpacing:2,marginBottom:4}}>MODO ADMIN</div>
            <div style={{fontSize:12,color:C.gray,marginBottom:12}}>Gestión y estadísticas</div>
            <Input type="password" placeholder="PIN de acceso" value={pinInput}
              onChange={e=>{setPinInput(e.target.value);setPinError(false);}}
              onKeyDown={e=>e.key==="Enter"&&(pinInput===ADMIN_PIN?(setModo("admin"),setPinError(false)):setPinError(true))}
              style={{marginBottom:8,textAlign:"center"}}/>
            {pinError&&<div style={{fontSize:11,color:C.red,marginBottom:8,fontWeight:600}}>PIN incorrecto</div>}
            <Btn full onClick={()=>{pinInput===ADMIN_PIN?(setModo("admin"),setPinError(false)):setPinError(true);}}>INGRESAR</Btn>
          </div>
        </div>

        <div style={{fontSize:10,color:C.gray2,letterSpacing:2,textTransform:"uppercase"}}>GP3 Sports LATAM · Pirelli Official Partner</div>
      </div>
    </>
  );

  // ══ APP SHELL ══
  return (
    <>
      <style>{GS}</style>
      <div style={{minHeight:"100vh",background:C.dark,display:"flex",flexDirection:"column",fontFamily:"'Barlow',sans-serif"}}>

        {/* TOP STRIPE */}
        <div style={{height:3,background:`linear-gradient(90deg,${C.red} 0%,#ff4444 50%,${C.red} 100%)`,flexShrink:0}}/>

        {/* HEADER */}
        <header style={{background:C.dark2,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,maxWidth:1200,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <Logo size="sm"/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <Badge color={isAdmin?C.red:C.green}>{isAdmin?"ADMIN":"VENDEDOR"}</Badge>
                <span style={{fontSize:11,color:C.gray2,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>{HOY}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {["USD","ARS"].map(m=>totales[m]?(
                <div key={m} style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:m==="USD"?C.green:C.yellow,letterSpacing:-0.5}}>{fmt(totales[m],m)}</div>
                  <div style={{fontSize:9,color:C.gray,letterSpacing:1}}>{m}</div>
                </div>
              ):null)}
              <div style={{textAlign:"center",background:C.dark3,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px"}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:"#fff"}}>{ventas.length}</div>
                <div style={{fontSize:9,color:C.gray,letterSpacing:1,textTransform:"uppercase"}}>Ventas</div>
              </div>
              <button onClick={()=>{setModo(null);setPinInput("");}} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,padding:"8px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>SALIR</button>
            </div>
          </div>
        </header>

        {/* NAV */}
        <nav style={{background:C.dark2,borderBottom:`1px solid ${C.border}`,padding:"0 16px",flexShrink:0,overflowX:"auto"}}>
          <div style={{display:"flex",gap:2,maxWidth:1200,margin:"0 auto",minWidth:"max-content"}}>
            {tabs.map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                padding:"12px 16px",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,
                border:"none",borderBottom:`3px solid ${tab===id?C.red:"transparent"}`,
                background:"transparent",color:tab===id?"#fff":C.gray,
                transition:"all .2s",whiteSpace:"nowrap",
              }}>{lbl}</button>
            ))}
            {isAdmin&&(
              <button onClick={()=>exportCSV(ventas,stock)} style={{
                marginLeft:"auto",padding:"12px 16px",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,
                border:"none",borderBottom:"3px solid transparent",
                background:"transparent",color:C.red,whiteSpace:"nowrap",
              }}>⬇ EXCEL</button>
            )}
          </div>
        </nav>

        {toast&&<Toast msg={toast.msg} err={toast.err}/>}

        {/* MAIN */}
        <main style={{flex:1,overflowY:"auto",padding:"16px",maxWidth:1200,margin:"0 auto",width:"100%"}}>

          {/* ══ VENTA ══ */}
          {tab==="venta"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:16}}>

              {/* Form */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>

                {/* Circuito */}
                <Card>
                  <CardHeader>Fecha del Campeonato</CardHeader>
                  <div style={{padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                    {circuitos.map(c=>(
                      <button key={c.id} onClick={()=>setForm(f=>({...f,circ_id:c.id,fecha:c.inicio}))} style={{
                        padding:"10px 12px",borderRadius:8,cursor:"pointer",textAlign:"left",
                        border:`1px solid ${form.circ_id===c.id?C.red:C.border}`,
                        background:form.circ_id===c.id?"rgba(232,0,29,.1)":C.dark4,
                        transition:"all .2s",
                      }}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:form.circ_id===c.id?C.red:C.gray,fontWeight:700,letterSpacing:1}}>{c.num}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:"#fff",marginTop:2,lineHeight:1.2}}>{c.nombre}</div>
                        <div style={{fontSize:10,color:C.gray,marginTop:4}}>{c.inicio}</div>
                        {HOY>=c.inicio&&HOY<=c.fin&&<div style={{fontSize:9,color:C.green,fontWeight:700,marginTop:2,letterSpacing:1}}>● EN CURSO</div>}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Piloto */}
                <Card>
                  <CardHeader>Piloto</CardHeader>
                  <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{position:"relative"}}>
                      <Input type="text" placeholder="Buscar por nombre o número..."
                        value={pilotoQ}
                        onChange={e=>{setPilotoQ(e.target.value);setShowSug(true);setForm(f=>({...f,piloto:e.target.value,num_piloto:""}));}}
                        onFocus={()=>setShowSug(true)}/>
                      {showSug&&sugerencias.length>0&&(
                        <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.dark3,border:`1px solid ${C.red}`,borderRadius:"0 0 8px 8px",zIndex:100,maxHeight:220,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,.6)"}}>
                          {sugerencias.map((p,i)=>(
                            <div key={i} onMouseDown={()=>selPiloto(p)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,fontSize:14}}>
                              <span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,minWidth:40}}>#{p.num}</span>
                              <span style={{fontWeight:600,flex:1}}>{p.nombre}</span>
                              <Badge small>{p.cat}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {form.piloto&&(
                      <div style={{display:"flex",alignItems:"center",gap:10,background:C.dark4,border:`1px solid ${C.red}`,borderRadius:8,padding:"10px 14px",flexWrap:"wrap"}}>
                        <span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18}}>#{form.num_piloto||"—"}</span>
                        <span style={{fontWeight:700,fontSize:15}}>{form.piloto}</span>
                        <Badge>{form.categoria}</Badge>
                        <button onClick={()=>{setForm(f=>({...f,piloto:"",num_piloto:""}));setPilotoQ("");}} style={{marginLeft:"auto",background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
                      </div>
                    )}

                    <details>
                      <summary style={{fontSize:12,color:C.red,cursor:"pointer",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>+ AGREGAR PILOTO NUEVO</summary>
                      <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8,marginTop:10}}>
                        <Input id="vnnum" placeholder="N°"/>
                        <Input id="vnnombre" placeholder="Nombre completo"/>
                      </div>
                      <Select id="vncat" style={{marginTop:8}}>{todasLasCats.map(c=><option key={c}>{c}</option>)}</Select>
                      <Btn onClick={()=>{
                        const num=document.getElementById('vnnum').value.trim();
                        const nombre=document.getElementById('vnnombre').value.trim();
                        const cat=document.getElementById('vncat').value;
                        if(!num||!nombre){boom("Completa número y nombre",true);return;}
                        setPilotos([...pilotos,{num,nombre,cat}]);
                        selPiloto({num,nombre,cat});
                        document.getElementById('vnnum').value='';
                        document.getElementById('vnnombre').value='';
                        boom("Piloto agregado: "+nombre);
                      }} small style={{marginTop:8}}>+ Agregar y seleccionar</Btn>
                    </details>

                    <Field label="Categoría">
                      <Select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                        {todasLasCats.map(c=><option key={c}>{c}</option>)}
                      </Select>
                    </Field>
                  </div>
                </Card>

                {/* Moneda */}
                <Card>
                  <CardHeader>Moneda</CardHeader>
                  <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["USD","💵","Dólares",C.green],["ARS","🇦🇷","Pesos ARS",C.yellow]].map(([m,ico,lbl,col])=>(
                      <button key={m} onClick={()=>setForm(f=>({...f,moneda:m,metodo:m==="USD"?"efectivo_usd":"efectivo_ars"}))} style={{
                        padding:"14px 10px",borderRadius:10,cursor:"pointer",textAlign:"center",
                        border:`2px solid ${form.moneda===m?col:C.border}`,
                        background:form.moneda===m?col+"22":C.dark4,
                        transition:"all .2s",
                      }}>
                        <div style={{fontSize:24,marginBottom:4}}>{ico}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:form.moneda===m?"#fff":C.gray}}>{m}</div>
                        <div style={{fontSize:10,color:form.moneda===m?col:C.gray2,letterSpacing:1}}>{lbl}</div>
                        {form.moneda===m&&<div style={{fontSize:9,color:col,fontWeight:700,letterSpacing:1,marginTop:3}}>✓ ACTIVA</div>}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Neumáticos */}
                <Card>
                  <CardHeader>Neumáticos — Stock Flotante</CardHeader>
                  <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
                    {PRODUCTOS.map(p=>{
                      const precio = getPrecio(p,form.moneda,precios);
                      const enCarrito = carrito.find(i=>i.prod_id===p.id)?.cantidad??0;
                      const flotante = stock[p.id]?.flotante??0;
                      const sinStock = flotante<=0;
                      return(
                        <div key={p.id} style={{
                          background:C.dark4,
                          border:`1px solid ${enCarrito>0?C.green:sinStock?"rgba(200,0,0,.3)":C.border}`,
                          borderRadius:10,padding:"12px 14px",opacity:sinStock?.55:1,
                        }}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <Badge color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:"#fff",fontSize:15}}>{p.label}</span>
                              {enCarrito>0&&<span style={{fontSize:11,color:C.green,fontWeight:700}}>✓{enCarrito}</span>}
                            </div>
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:17}}>{fmt(precio,form.moneda)}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                            <div style={{display:"flex",gap:12,fontSize:12}}>
                              <span style={{color:sinStock?"#ff4444":C.green,fontWeight:700}}>🟢 {flotante}</span>
                              <span style={{color:C.gray}}>📦 {stock[p.id]?.bodega??0}</span>
                              {(stock[p.id]?.transito??0)>0&&<span style={{color:C.orange}}>🚚 {stock[p.id]?.transito}</span>}
                            </div>
                            {!sinStock&&(
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <button onClick={()=>setCantSel(c=>({...c,[p.id]:Math.max(0,(c[p.id]??0)-1)}))} style={{background:C.dark3,border:`1px solid ${C.border2}`,color:"#fff",borderRadius:6,width:32,height:32,cursor:"pointer",fontSize:18,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                                <span style={{minWidth:28,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,color:"#fff"}}>{cantSel[p.id]??0}</span>
                                <button onClick={()=>setCantSel(c=>({...c,[p.id]:(c[p.id]??0)+1}))} style={{background:C.dark3,border:`1px solid ${C.border2}`,color:"#fff",borderRadius:6,width:32,height:32,cursor:"pointer",fontSize:18,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                                <Btn small onClick={()=>agregarProducto(p.id)}>+ Agregar</Btn>
                              </div>
                            )}
                            {sinStock&&<span style={{fontSize:11,color:"#ff4444",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>SIN STOCK</span>}
                          </div>
                        </div>
                      );
                    })}

                    {Object.values(cantSel).some(v=>v>0)&&(
                      <Btn full onClick={()=>{
                        let alguno=false;
                        PRODUCTOS.forEach(p=>{
                          const cant=cantSel[p.id]??0;
                          if(cant<=0)return;
                          const flotante=stock[p.id]?.flotante??0;
                          const enCar=carrito.find(i=>i.prod_id===p.id)?.cantidad??0;
                          if(cant+enCar>flotante){boom("Stock insuficiente para "+p.label,true);return;}
                          setCarrito(prev=>{const idx=prev.findIndex(i=>i.prod_id===p.id);if(idx>=0){const u=[...prev];u[idx]={...u[idx],cantidad:u[idx].cantidad+cant};return u;}return [...prev,{prod_id:p.id,cantidad:cant}];});
                          alguno=true;
                        });
                        if(alguno){boom("✓ Todos agregados");setCantSel(Object.fromEntries(PRODUCTOS.map(p=>[p.id,0])));}
                      }} style={{marginTop:4}}>
                        🛒 AGREGAR TODO ({Object.values(cantSel).reduce((s,v)=>s+(v>0?v:0),0)} u.)
                      </Btn>
                    )}
                  </div>
                </Card>

                {/* Método pago */}
                <Card>
                  <CardHeader>Método de Pago</CardHeader>
                  <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {(form.moneda==="USD"
                      ?[["efectivo_usd","💵 Efectivo USD"],["transferencia","🏦 Transferencia"]]
                      :[["efectivo_ars","🇦🇷 Efectivo ARS"],["transferencia","🏦 Transferencia"],["debito","💳 Débito/Crédito"]]
                    ).map(([id,lbl])=>(
                      <button key={id} onClick={()=>setForm(f=>({...f,metodo:id}))} style={{
                        padding:"12px 10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,
                        border:`2px solid ${form.metodo===id?C.red:C.border}`,
                        background:form.metodo===id?"rgba(232,0,29,.1)":C.dark4,
                        color:form.metodo===id?"#fff":C.gray,
                        fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:.5,
                        transition:"all .2s",
                      }}>{lbl}</button>
                    ))}
                  </div>
                </Card>

                {/* Email + Facturación */}
                <Card>
                  <CardHeader>Datos del Cliente</CardHeader>
                  <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
                    <Field label="Email del Cliente">
                      <Input type="email" placeholder="cliente@correo.com" value={form.email_cliente} onChange={e=>setForm(f=>({...f,email_cliente:e.target.value}))}/>
                    </Field>
                    <Label>Tipo de Facturación</Label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <button onClick={()=>setForm(f=>({...f,tipo_factura:"CF",cuit:"",empresa:""}))} style={{padding:"12px 10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${form.tipo_factura==="CF"?C.green:C.border}`,background:form.tipo_factura==="CF"?"rgba(0,212,170,.1)":C.dark4,color:form.tipo_factura==="CF"?"#fff":C.gray,fontFamily:"'Barlow Condensed',sans-serif",transition:"all .2s"}}>👤 Consumidor Final</button>
                      <button onClick={()=>setForm(f=>({...f,tipo_factura:"FAC"}))} style={{padding:"12px 10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${form.tipo_factura==="FAC"?C.red:C.border}`,background:form.tipo_factura==="FAC"?"rgba(232,0,29,.1)":C.dark4,color:form.tipo_factura==="FAC"?"#fff":C.gray,fontFamily:"'Barlow Condensed',sans-serif",transition:"all .2s"}}>🏢 Factura Empresa</button>
                    </div>
                    {form.tipo_factura==="FAC"&&(
                      <div style={{background:"rgba(232,0,29,.06)",border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}>
                        <Field label="CUIT"><Input placeholder="20-12345678-9" value={form.cuit} onChange={e=>setForm(f=>({...f,cuit:e.target.value}))}/></Field>
                        <Field label="Razón Social"><Input placeholder="Nombre empresa" value={form.empresa} onChange={e=>setForm(f=>({...f,empresa:e.target.value}))}/></Field>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Carrito */}
                {carrito.length>0&&(
                  <Card style={{border:`2px solid ${C.red}`}}>
                    <CardHeader>Carrito — {carritoUnits} neumático{carritoUnits!==1?"s":""}</CardHeader>
                    <div style={{padding:12}}>
                      {carritoConPrecios.map((item,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div>
                            <span style={{fontWeight:700,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15}}>{item.prod?.label}</span>
                            <span style={{marginLeft:8,fontSize:12,color:C.gray}}>×{item.cantidad}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:16}}>{fmt(item.total,form.moneda)}</span>
                            <button onClick={()=>setCarrito(prev=>prev.filter((_,j)=>j!==i))} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:14}}>×</button>
                          </div>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:8,borderTop:`2px solid ${C.red}`}}>
                        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:"#fff",fontSize:16,letterSpacing:1}}>TOTAL</span>
                        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:30,letterSpacing:-1}}>{fmt(carritoTotal,form.moneda)}</span>
                      </div>
                    </div>
                  </Card>
                )}

                <Btn full disabled={carrito.length===0} onClick={registrar} style={{padding:18,fontSize:17,letterSpacing:2}}>
                  {carrito.length>0 ? `CONFIRMAR VENTA — ${carritoUnits} NEUMÁTICO${carritoUnits!==1?"S":""} — ${fmt(carritoTotal,form.moneda)}` : "AGREGA NEUMÁTICOS AL CARRITO"}
                </Btn>
              </div>

              {/* Panel compras del día */}
              <div>
                <Card>
                  <CardHeader>Compras del Día — {ventas.length}</CardHeader>
                  <div style={{padding:12,maxHeight:700,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
                    {ventas.length===0?(
                      <div style={{textAlign:"center",padding:32,color:C.gray,fontSize:13}}>Sin ventas registradas</div>
                    ):ventas.map(v=>{
                      const circ=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
                      return(
                        <div key={v.id} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${C.red}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <div>
                              <span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:16,marginRight:8}}>#{v.num_piloto||"—"}</span>
                              <span style={{fontWeight:700,fontSize:15}}>{v.piloto}</span>
                              <div style={{fontSize:11,color:C.gray,marginTop:2}}>{v.email_cliente}</div>
                              <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                                <Badge small>{v.categoria}</Badge>
                                <Badge small color={C.gray}>{circ?.nombre}</Badge>
                                <Badge small color={v.tipo_factura==="FAC"?C.red:C.green}>{v.tipo_factura==="FAC"?"Factura":"CF"}</Badge>
                              </div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:18}}>{fmt(v.total_monto,v.moneda)}</div>
                              <div style={{fontSize:11,color:C.gray}}>{v.total_unidades} u.</div>
                            </div>
                          </div>
                          <Divider/>
                          {v.items.map((item,i)=>{
                            const p=PRODUCTOS.find(x=>x.id===item.prod_id);
                            return(
                              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0"}}>
                                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                  <Badge small color={p?.tipo==="Trasero"?C.red:C.gray}>{p?.tipo}</Badge>
                                  <span>{p?.label} ×{item.cantidad}</span>
                                </div>
                                <span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{fmt(item.total,v.moneda)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══ MIS STATS (vendedor) ══ */}
          {tab==="mis_stats"&&!isAdmin&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
                {["USD","ARS"].map(m=>totales[m]?<StatBox key={m} label={"Total "+m} value={fmt(totales[m],m)} color={m==="USD"?C.green:C.yellow}/>:null)}
                <StatBox label="Ventas" value={ventas.length} color="#fff"/>
                <StatBox label="Unidades" value={ventas.reduce((s,v)=>s+v.total_unidades,0)} color={C.red}/>
              </div>

              <Card>
                <CardHeader>💰 Cuadratura de Caja</CardHeader>
                <div style={{padding:12}}>
                  {(()=>{
                    const metodos={efectivo_usd:{label:"💵 Efectivo USD",usd:0,ars:0,cnt:0},transferencia_usd:{label:"🏦 Transf. USD",usd:0,ars:0,cnt:0},efectivo_ars:{label:"🇦🇷 Efectivo ARS",usd:0,ars:0,cnt:0},transferencia_ars:{label:"🏦 Transf. ARS",usd:0,ars:0,cnt:0},debito:{label:"💳 Débito/Crédito",usd:0,ars:0,cnt:0}};
                    ventas.forEach(v=>{if(metodos[v.metodo]){if(v.moneda==="USD")metodos[v.metodo].usd+=v.total_monto;else metodos[v.metodo].ars+=v.total_monto;metodos[v.metodo].cnt++;}});
                    const activos=Object.entries(metodos).filter(([,d])=>d.cnt>0);
                    if(!activos.length)return<div style={{textAlign:"center",padding:24,color:C.gray}}>Sin ventas</div>;
                    return activos.map(([k,d])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                        <div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{d.label}</div>
                          <div style={{fontSize:11,color:C.gray}}>{d.cnt} venta{d.cnt!==1?"s":""}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          {d.usd>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmt(d.usd,"USD")}</div>}
                          {d.ars>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:16}}>{fmt(d.ars,"ARS")}</div>}
                        </div>
                      </div>
                    ));
                  })()}
                  <div style={{marginTop:12,paddingTop:8,borderTop:`2px solid ${C.red}`}}>
                    {totales["USD"]&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}><span style={{color:C.gray}}>Total USD</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:20}}>{fmt(totales["USD"],"USD")}</span></div>}
                    {totales["ARS"]&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}><span style={{color:C.gray}}>Total ARS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:20}}>{fmt(totales["ARS"],"ARS")}</span></div>}
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>📦 Cuadratura de Stock</CardHeader>
                <div style={{padding:"0 12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 60px 60px",padding:"8px 0",fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,borderBottom:`1px solid ${C.border}`,gap:4}}>
                    <span>Neumático</span><span style={{textAlign:"center"}}>Vend.</span><span style={{textAlign:"center",color:C.green}}>Flot.</span><span style={{textAlign:"center",color:C.orange}}>Trán.</span><span style={{textAlign:"center"}}>Bod.</span>
                  </div>
                  {PRODUCTOS.map(p=>{
                    const vendidos=ventas.reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.cantidad,0),0);
                    return(
                      <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 60px 60px",padding:"10px 0",borderBottom:`1px solid ${C.border}`,gap:4,alignItems:"center"}}>
                        <div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14}}>{p.label}</div>
                          <Badge small color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge>
                        </div>
                        <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:vendidos>0?C.green:C.gray}}>{vendidos}</div>
                        <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:(stock[p.id]?.flotante??0)<=0?"#ff4444":C.green}}>{stock[p.id]?.flotante??0}</div>
                        <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,color:C.orange}}>{stock[p.id]?.transito??0}</div>
                        <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,color:C.gray}}>{stock[p.id]?.bodega??0}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ══ STOCK (admin) ══ */}
          {tab==="stock"&&isAdmin&&(
            <Card>
              <CardHeader>Control de Stock Pirelli</CardHeader>
              <div style={{padding:12}}>
                <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",fontSize:12,color:C.gray}}>
                  <span><span style={{color:C.red,fontWeight:700}}>Bodega</span> — depósito central</span>
                  <span>·</span>
                  <span><span style={{color:C.orange,fontWeight:700}}>Tránsito</span> — en camino</span>
                  <span>·</span>
                  <span><span style={{color:C.green,fontWeight:700}}>Flotante</span> — en pista, para vender</span>
                </div>
                {!stockDraft?(
                  <Btn onClick={()=>setStockDraft({...stock})} outline style={{marginBottom:12}}>✏️ Editar Stock</Btn>
                ):(
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <Btn color={C.green} onClick={()=>{setStock(stockDraft);syncSheets("stock",{stock:stockDraft});setStockDraft(null);boom("✓ Stock guardado");}}>💾 Guardar</Btn>
                    <Btn outline onClick={()=>setStockDraft(null)}>Cancelar</Btn>
                  </div>
                )}

                {/* Tabla stock */}
                <div style={{overflowX:"auto"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 90px 60px 1fr",padding:"8px 10px",fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:1,borderBottom:`1px solid ${C.border}`,gap:8,minWidth:520}}>
                    <span>Neumático</span>
                    <span style={{textAlign:"center"}}>Bodega</span>
                    <span style={{textAlign:"center",color:C.orange}}>Tránsito</span>
                    <span style={{textAlign:"center",color:C.green}}>Flotante</span>
                    <span style={{textAlign:"center"}}>Total</span>
                    <span style={{textAlign:"center"}}>Mover</span>
                  </div>
                  {PRODUCTOS.map(p=>{
                    const s=stockDraft?stockDraft[p.id]:stock[p.id];
                    const tot=(s?.bodega??0)+(s?.transito??0)+(s?.flotante??0);
                    const upd=(field,val)=>{if(!stockDraft)return;setStockDraft(prev=>({...prev,[p.id]:{...prev[p.id],[field]:Math.max(0,val)}}));};
                    return(
                      <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 90px 60px 1fr",padding:"14px 10px",borderBottom:`1px solid ${C.border}`,gap:8,alignItems:"center",minWidth:520}}>
                        <div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{p.label}</div>
                          <div style={{fontSize:11,color:C.gray}}>USD {p.precios.USD} / ARS {p.precios.ARS.toLocaleString()}</div>
                        </div>
                        {[["bodega",C.red],["transito",C.orange],["flotante",C.green]].map(([field,col])=>(
                          <div key={field} style={{textAlign:"center"}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:col,lineHeight:1}}>{s?.[field]??0}</div>
                            {stockDraft&&(
                              <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:4}}>
                                <button onClick={()=>upd(field,(s?.[field]??0)+1)} style={{background:"transparent",border:`1px solid ${col}`,color:col,borderRadius:4,padding:"2px 7px",fontSize:12,cursor:"pointer",fontWeight:700}}>+</button>
                                <button onClick={()=>upd(field,(s?.[field]??0)-1)} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,borderRadius:4,padding:"2px 7px",fontSize:12,cursor:"pointer"}}>−</button>
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:tot<=5?"#ff4444":"#fff"}}>{tot}</div>
                        <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>
                          {[
                            ["B→F","bodega","flotante",C.green],
                            ["F→B","flotante","bodega",C.gray],
                            ["B→T","bodega","transito",C.orange],
                            ["T→F","transito","flotante",C.green],
                          ].map(([lbl,from,to,col])=>(
                            <button key={lbl} onClick={()=>{
                              if(!stockDraft)return;
                              if((s?.[from]??0)<1)return;
                              setStockDraft(prev=>({...prev,[p.id]:{...prev[p.id],[from]:Math.max(0,(prev[p.id]?.[from]??0)-1),[to]:(prev[p.id]?.[to]??0)+1}}));
                            }} style={{background:"transparent",border:`1px solid ${col}44`,color:col,borderRadius:4,padding:"3px 7px",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif"}}>{lbl}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* ══ ESTADÍSTICAS (admin) ══ */}
          {tab==="estadisticas"&&isAdmin&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <Input placeholder="Buscar piloto, número, categoría..." value={busqStats} onChange={e=>setBusqStats(e.target.value)} style={{maxWidth:280}}/>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[["todos","Todos"],...CIRCUITOS_BASE.map(c=>[c.id,c.num+" "+c.nombre])].map(([id,lbl])=>(
                    <Pill key={id} active={filtro===id} onClick={()=>setFiltro(id)}>{lbl}</Pill>
                  ))}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
                {["USD","ARS"].map(m=>totales[m]?<StatBox key={m} label={"Total "+m} value={fmt(totales[m],m)} color={m==="USD"?C.green:C.yellow}/>:null)}
                <StatBox label="Clientes" value={vF.length} color="#fff"/>
                <StatBox label="Unidades" value={vF.reduce((s,v)=>s+v.total_unidades,0)} color={C.red}/>
                <StatBox label="CF" value={vF.filter(v=>v.tipo_factura==="CF").length} color={C.green}/>
                <StatBox label="Facturas" value={vF.filter(v=>v.tipo_factura==="FAC").length} color={C.red}/>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
                {/* Por método */}
                <Card>
                  <CardHeader>Por Método de Pago</CardHeader>
                  <div style={{padding:12}}>
                    {(()=>{
                      const mets={};
                      vF.forEach(v=>{if(!mets[v.metodo])mets[v.metodo]={usd:0,ars:0,cnt:0,uni:0};if(v.moneda==="USD")mets[v.metodo].usd+=v.total_monto;else mets[v.metodo].ars+=v.total_monto;mets[v.metodo].cnt++;mets[v.metodo].uni+=v.total_unidades;});
                      const labels={"efectivo_usd":"💵 Efectivo USD","transferencia_usd":"🏦 Transf. USD","efectivo_ars":"🇦🇷 Efectivo ARS","transferencia_ars":"🏦 Transf. ARS","debito":"💳 Débito/Crédito"};
                      return Object.entries(mets).length===0?<div style={{textAlign:"center",padding:24,color:C.gray}}>Sin ventas</div>:
                        Object.entries(mets).map(([met,d])=>(
                          <div key={met} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{labels[met]||met}</span>
                              <span style={{fontSize:12,color:C.gray}}>{d.cnt} venta{d.cnt!==1?"s":""}</span>
                            </div>
                            {d.usd>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>USD</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green}}>{fmt(d.usd,"USD")}</span></div>}
                            {d.ars>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>ARS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow}}>{fmt(d.ars,"ARS")}</span></div>}
                          </div>
                        ));
                    })()}
                  </div>
                </Card>

                {/* Por neumático */}
                <Card>
                  <CardHeader>Por Neumático</CardHeader>
                  <div style={{padding:12}}>
                    {PRODUCTOS.map(p=>{
                      const uni=vF.reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.cantidad,0),0);
                      const usd=vF.filter(v=>v.moneda==="USD").reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.total,0),0);
                      const ars=vF.filter(v=>v.moneda==="ARS").reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.total,0),0);
                      return(
                        <div key={p.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              <Badge small color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{p.label}</span>
                            </div>
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:C.red}}>{uni} u.</span>
                          </div>
                          {usd>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.gray}}>USD</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.green}}>{fmt(usd,"USD")}</span></div>}
                          {ars>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.gray}}>ARS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.yellow}}>{fmt(ars,"ARS")}</span></div>}
                          <div style={{display:"flex",gap:8,marginTop:6,fontSize:11}}>
                            <span style={{color:C.green}}>🟢 {stock[p.id]?.flotante??0}</span>
                            <span style={{color:C.orange}}>🚚 {stock[p.id]?.transito??0}</span>
                            <span style={{color:C.gray}}>📦 {stock[p.id]?.bodega??0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Top compradores */}
                <Card>
                  <CardHeader>Top Compradores</CardHeader>
                  <div style={{padding:12}}>
                    {(()=>{
                      const pils={};
                      vF.forEach(v=>{const k=v.piloto+"_"+v.num_piloto;if(!pils[k])pils[k]={piloto:v.piloto,num:v.num_piloto,cat:v.categoria,usd:0,ars:0,uni:0};if(v.moneda==="USD")pils[k].usd+=v.total_monto;else pils[k].ars+=v.total_monto;pils[k].uni+=v.total_unidades;});
                      const sorted=Object.values(pils).sort((a,b)=>b.uni-a.uni);
                      return sorted.length===0?<div style={{textAlign:"center",padding:24,color:C.gray}}>Sin ventas</div>:sorted.slice(0,10).map((p,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div>
                            <span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,marginRight:8}}>#{p.num}</span>
                            <span style={{fontWeight:700}}>{p.piloto}</span>
                            <div style={{fontSize:11,color:C.gray}}>{p.cat} · {p.uni} u.</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            {p.usd>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green}}>{fmt(p.usd,"USD")}</div>}
                            {p.ars>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow}}>{fmt(p.ars,"ARS")}</div>}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>
              </div>

              {/* Tabla detalle */}
              <Card>
                <CardHeader>Detalle — {vF.length} registros</CardHeader>
                <div style={{padding:12,overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:800}}>
                    <thead>
                      <tr>{["Fecha","N°","Piloto","Cat.","Circuito","Neumáticos","Unid.","Moneda","Total","Pago","Email","Factura"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:9,color:C.gray,letterSpacing:2,textTransform:"uppercase",borderBottom:`2px solid ${C.red}`,whiteSpace:"nowrap"}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {vF.length===0?<tr><td colSpan={12} style={{textAlign:"center",padding:24,color:C.gray}}>Sin ventas</td></tr>:
                        vF.map(v=>{
                          const circ=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
                          const itemsStr=v.items.map(i=>{const p=PRODUCTOS.find(x=>x.id===i.prod_id);return p?.label+"×"+i.cantidad;}).join(", ");
                          return(
                            <tr key={v.id} style={{borderBottom:`1px solid ${C.border}`}}>
                              <td style={{padding:"8px 10px",color:C.gray}}>{v.fecha}</td>
                              <td style={{padding:"8px 10px",fontFamily:"'Barlow Condensed',sans-serif",color:C.red,fontWeight:900}}>#{v.num_piloto||"—"}</td>
                              <td style={{padding:"8px 10px",fontWeight:700}}>{v.piloto}</td>
                              <td style={{padding:"8px 10px"}}><Badge small>{v.categoria}</Badge></td>
                              <td style={{padding:"8px 10px",color:C.gray,fontSize:11}}>{circ?.nombre}</td>
                              <td style={{padding:"8px 10px",fontSize:11,color:C.gray}}>{itemsStr}</td>
                              <td style={{padding:"8px 10px",textAlign:"center"}}>{v.total_unidades}</td>
                              <td style={{padding:"8px 10px"}}><Badge small color={v.moneda==="USD"?C.green:C.yellow}>{v.moneda}</Badge></td>
                              <td style={{padding:"8px 10px",fontFamily:"'Barlow Condensed',sans-serif",color:C.red,fontWeight:900}}>{fmt(v.total_monto,v.moneda)}</td>
                              <td style={{padding:"8px 10px",fontSize:11,color:C.orange}}>{v.metodo.replace(/_/g," ").toUpperCase()}</td>
                              <td style={{padding:"8px 10px",fontSize:11,color:C.gray}}>{v.email_cliente}</td>
                              <td style={{padding:"8px 10px"}}><Badge small color={v.tipo_factura==="FAC"?C.red:C.green}>{v.tipo_factura==="FAC"?"Factura":"CF"}</Badge></td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ══ CIERRE (admin) ══ */}
          {tab==="cierre"&&isAdmin&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:16}}>
              <Card>
                <CardHeader>Resumen de Cierre — {HOY}</CardHeader>
                <div style={{padding:12}}>
                  {[["USD","Total USD",C.green],["ARS","Total ARS",C.yellow]].map(([m,lbl,col])=>totales[m]?(
                    <div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{color:C.gray,fontSize:14}}>{lbl}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:col,fontSize:22}}>{fmt(totales[m],m)}</span>
                    </div>
                  ):null)}
                  {[["Total ventas",ventas.length+" ventas","#fff"],["Total unidades",ventas.reduce((s,v)=>s+v.total_unidades,0)+" neumáticos","#fff"],["Consumidor Final",ventas.filter(v=>v.tipo_factura==="CF").length+" ventas",C.green],["Facturas Empresa",ventas.filter(v=>v.tipo_factura==="FAC").length+" ventas",C.red]].map(([lbl,val,col])=>(
                    <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{color:C.gray,fontSize:14}}>{lbl}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:col,fontSize:16}}>{val}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
                    <Btn full onClick={()=>exportCSV(ventas,stock)}>⬇ Exportar Excel</Btn>
                    <Btn full outline color="#cc1133" onClick={()=>{if(!window.confirm("¿Borrar TODAS las ventas?"))return;setVentas([]);boom("Historial borrado");}}>🗑 Borrar historial</Btn>
                  </div>

                  {cierres.length>0&&(
                    <div style={{marginTop:20}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"#fff",marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>Historial — {cierres.length} cierres</div>
                      {cierres.map((c,i)=>(
                        <div key={i} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                            <div>
                              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:15}}>{c.circuito}</div>
                              <div style={{fontSize:11,color:C.gray}}>{c.fecha} {c.hora} · {c.numVentas} clientes · {c.unidades} u.</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              {c.totales["USD"]&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green}}>{fmt(c.totales["USD"],"USD")}</div>}
                              {c.totales["ARS"]&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow}}>{fmt(c.totales["ARS"],"ARS")}</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <Btn small full outline color={C.red} onClick={()=>setCierres(cierres.filter((_,j)=>j!==i))}>× Eliminar</Btn>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader>Stock al Cierre</CardHeader>
                <div style={{padding:12}}>
                  {PRODUCTOS.map(p=>{
                    const s=stock[p.id];
                    return(
                      <div key={p.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15,marginBottom:6}}>{p.label}</div>
                        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,color:C.red}}>Bodega: <b>{s?.bodega??0}</b></span>
                          <span style={{fontSize:12,color:C.orange}}>Tránsito: <b>{s?.transito??0}</b></span>
                          <span style={{fontSize:12,color:C.green}}>Flotante: <b>{s?.flotante??0}</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ══ GESTIÓN (admin) ══ */}
          {tab==="gestion"&&isAdmin&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
              {/* Pilotos */}
              <Card>
                <CardHeader>Agregar Piloto</CardHeader>
                <div style={{padding:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8,marginBottom:8}}>
                    <Input id="gnum" placeholder="N°"/>
                    <Input id="gnombre" placeholder="Nombre completo"/>
                  </div>
                  <Select id="gcat" style={{marginBottom:8}}>{todasLasCats.map(c=><option key={c}>{c}</option>)}</Select>
                  <Btn full onClick={()=>{
                    const num=document.getElementById('gnum').value.trim();
                    const nombre=document.getElementById('gnombre').value.trim();
                    const cat=document.getElementById('gcat').value;
                    if(!num||!nombre){boom("Completa número y nombre",true);return;}
                    setPilotos([...pilotos,{num,nombre,cat}]);
                    document.getElementById('gnum').value='';
                    document.getElementById('gnombre').value='';
                    boom("Piloto agregado: "+nombre);
                  }} style={{marginBottom:12}}>+ Agregar Piloto</Btn>
                  <Input placeholder="Buscar..." value={busqPiloto} onChange={e=>setBusqPiloto(e.target.value)} style={{marginBottom:10}}/>
                  <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                    {todasLasCats.map(cat=>{
                      const ps=todosLosPilotos.filter(p=>p.cat===cat&&(!busqPiloto||p.nombre.toLowerCase().includes(busqPiloto.toLowerCase())||p.num.includes(busqPiloto)));
                      if(!ps.length)return null;
                      return(
                        <div key={cat}>
                          <div style={{fontSize:10,color:C.red,letterSpacing:3,fontWeight:700,textTransform:"uppercase",margin:"8px 0 4px",fontFamily:"'Barlow Condensed',sans-serif"}}>{cat}</div>
                          {ps.map((p,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.dark4,borderRadius:6,marginBottom:3}}>
                              <span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,minWidth:36}}>#{p.num}</span>
                              <span style={{fontWeight:600,flex:1,fontSize:14}}>{p.nombre}</span>
                              {pilotos.find(x=>x.num===p.num&&x.nombre===p.nombre)&&(
                                <button onClick={()=>setPilotos(pilotos.filter(x=>!(x.num===p.num&&x.nombre===p.nombre)))} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Categorías */}
              <Card>
                <CardHeader>Categorías</CardHeader>
                <div style={{padding:12}}>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <Input id="gcatnueva" placeholder="Nueva categoría..."/>
                    <Btn onClick={()=>{const val=document.getElementById('gcatnueva').value.trim();if(!val)return;setCats([...cats,val]);document.getElementById('gcatnueva').value='';boom("Categoría: "+val);}}>+ Agregar</Btn>
                  </div>
                  {todasLasCats.map(c=>(
                    <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.dark4,borderRadius:6,marginBottom:4}}>
                      <span style={{fontWeight:600}}>{c}</span>
                      {cats.includes(c)&&<button onClick={()=>setCats(cats.filter(x=>x!==c))} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button>}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Precios */}
              <Card>
                <CardHeader>Editar Precios</CardHeader>
                <div style={{padding:12}}>
                  {PRODUCTOS.map(p=>(
                    <div key={p.id} style={{marginBottom:14,padding:"12px",background:C.dark4,borderRadius:10,border:`1px solid ${C.border}`}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15,marginBottom:8}}>{p.label}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div>
                          <Label>USD</Label>
                          <Input type="number" value={precios[p.id]?.USD??p.precios.USD} onChange={e=>setPrecios({...precios,[p.id]:{...precios[p.id],USD:+e.target.value}})}/>
                        </div>
                        <div>
                          <Label>ARS</Label>
                          <Input type="number" value={precios[p.id]?.ARS??p.precios.ARS} onChange={e=>setPrecios({...precios,[p.id]:{...precios[p.id],ARS:+e.target.value}})}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </main>

        {/* FOOTER */}
        <footer style={{textAlign:"center",padding:"12px 16px",fontSize:10,color:C.gray2,borderTop:`1px solid ${C.border}`,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif",flexShrink:0}}>
          GP3 Sports LATAM · CAV 2026 · Pirelli Official Partner · {EMAIL_DESTINO}
        </footer>
      </div>
    </>
  );
}
