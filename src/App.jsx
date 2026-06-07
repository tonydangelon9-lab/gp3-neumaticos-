import { useState, useMemo, useEffect } from "react";

const C = {
  red:"#E8001D", dark:"#0a0a0f", dark2:"#111118", dark3:"#1a1a24",
  border:"#2a2a3a", white:"#ffffff", gray:"#8888aa", green:"#00d4aa"
};

const ADMIN_PIN = "GP3admin";
const VENDEDOR_PIN = "Fran2026";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbxh0cN7SV9tZtR0bgvZH6ysGzxQgApFiKn7O4C9mN7HUV8h3hWpLbq2fqYbw5XV1Jk3/exec";

const PRODUCTOS = [
  {id:"m110sc1", label:"110 SC1", tipo:"Delantero", precios:{USD:500, ARS:700000}},
  {id:"m140sc1", label:"140 SC1", tipo:"Trasero", precios:{USD:500, ARS:700000}},
  {id:"m120sc1", label:"120 SC1", tipo:"Delantero", precios:{USD:300, ARS:415000}},
  {id:"m180sc2", label:"180 SC2", tipo:"Trasero", precios:{USD:400, ARS:555000}},
  {id:"m200sc1", label:"200 SC1", tipo:"Trasero", precios:{USD:400, ARS:555000}},
  {id:"m200sc2", label:"200 SC2", tipo:"Trasero", precios:{USD:400, ARS:555000}},
  {id:"m200sc3", label:"200 SC3", tipo:"Trasero", precios:{USD:400, ARS:555000}},
  {id:"m120rain", label:"120 RAIN", tipo:"Delantero", precios:{USD:300, ARS:415000}},
  {id:"m200rain", label:"200 RAIN", tipo:"Trasero", precios:{USD:400, ARS:555000}}
];

const STOCK0 = Object.fromEntries(PRODUCTOS.map(p => [p.id, {bodega:0, transito:0, flotante:0}]));

async function syncSheets(type, data) {
  try {
    await fetch(SHEETS_URL, {
      method:"POST", mode:"no-cors",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({type, ...data})
    });
  } catch(e) { console.log("Sync error:", e); }
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [PIN, setPIN] = useState("");
  const [screen, setScreen] = useState("login");
  const [stock, setStock] = useState(() => {
    const saved = localStorage.getItem("gp3_stock");
    return saved ? {...STOCK0, ...JSON.parse(saved)} : STOCK0;
  });
  const [ventas, setVentas] = useState(() => {
    const saved = localStorage.getItem("gp3_ventas");
    return saved ? JSON.parse(saved) : [];
  });

  const saveStock = () => {
    localStorage.setItem("gp3_stock", JSON.stringify(stock));
    const data = PRODUCTOS.map(p => ({
      id: p.id, label: p.label, tipo: p.tipo,
      bodega: stock[p.id]?.bodega || 0,
      transito: stock[p.id]?.transito || 0,
      flotante: stock[p.id]?.flotante || 0
    }));
    syncSheets("stock", {productos: data});
  };

  const saveVenta = () => {
    localStorage.setItem("gp3_ventas", JSON.stringify(ventas));
    syncSheets("ventas", {ventas});
  };

  if (screen === "login") {
    return (
      <div style={{background: C.dark, color: C.white, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center"}}>
        <div style={{textAlign: "center", maxWidth: 400}}>
          <h1>GP3 Neumáticos</h1>
          <input placeholder="PIN" type="password" value={PIN} onChange={(e) => setPIN(e.target.value)} style={{width: "100%", padding: 10, marginBottom: 10}} />
          <button onClick={() => { if(PIN === ADMIN_PIN) { setIsAdmin(true); setScreen("admin"); setPIN(""); } else if(PIN === VENDEDOR_PIN) { setIsAdmin(false); setScreen("venta"); setPIN(""); } }} style={{width: "100%", padding: 10, background: C.red, color: C.white, border: "none", cursor: "pointer"}}>Ingresar</button>
        </div>
      </div>
    );
  }

  if (screen === "venta") {
    return (
      <div style={{background: C.dark, color: C.white, padding: 20}}>
        <h2>Modo Venta</h2>
        <button onClick={() => {setScreen("login"); setIsAdmin(false);}} style={{marginBottom: 10}}>Salir</button>
        <div>
          {PRODUCTOS.map(p => (
            <div key={p.id} style={{padding: 10, borderBottom: "1px solid " + C.border}}>
              <strong>{p.label}</strong> - Flotante: {stock[p.id]?.flotante || 0}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "admin") {
    return (
      <div style={{background: C.dark, color: C.white, padding: 20}}>
        <h2>Admin</h2>
        <button onClick={() => {setScreen("login"); setIsAdmin(false);}} style={{marginBottom: 10}}>Salir</button>
        <div style={{marginBottom: 20}}>
          <h3>Stock</h3>
          {PRODUCTOS.map(p => (
            <div key={p.id} style={{padding: 10, borderBottom: "1px solid " + C.border}}>
              <strong>{p.label}</strong>
              <div style={{display: "grid", gridTemplateColumns: "auto auto auto", gap: 10, marginTop: 5}}>
                <label>Bodega: <input type="number" value={stock[p.id]?.bodega || 0} onChange={(e) => setStock({...stock, [p.id]: {...stock[p.id], bodega: parseInt(e.target.value)}})} /></label>
                <label>Tránsito: <input type="number" value={stock[p.id]?.transito || 0} onChange={(e) => setStock({...stock, [p.id]: {...stock[p.id], transito: parseInt(e.target.value)}})} /></label>
                <label>Flotante: <input type="number" value={stock[p.id]?.flotante || 0} onChange={(e) => setStock({...stock, [p.id]: {...stock[p.id], flotante: parseInt(e.target.value)}})} /></label>
              </div>
            </div>
          ))}
          <button onClick={saveStock} style={{marginTop: 10, padding: 10, background: C.green, color: C.dark, border: "none", cursor: "pointer"}}>Guardar Stock</button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
