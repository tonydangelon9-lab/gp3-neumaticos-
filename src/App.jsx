import { useState, useMemo, useEffect, useRef } from "react";

const C = {
red:"#E8001D",dark:"#f4f5f8",dark2:"#ffffff",dark3:"#ffffff",dark4:"#eceef3",
border:"#e3e5ec",border2:"#d2d5e0",white:"#ffffff",text:"#16161d",gray:"#5c5c70",gray2:"#9a9ab0",
green:"#00a884",orange:"#ef6c00",yellow:"#c8920a",
};

const ADMIN_PIN    = "2679";
const VERSION = "v2026.06.27-Z";
const VENDEDOR_PIN = "1216";
const ENTRADAS_PIN = "3354";
const INSCRIPCION_PIN = "8846";
const PRESENTACION_PIN = "4997";
// MODO MOTO4: el PIN NO vive aquí — se valida en el servidor (Apps Script MOTO4 COSTOS).
const MOTO4_URL = "https://script.google.com/macros/s/AKfycbw1Rli-JROb--WxbPkpbHlgyCBPbGAgkpqOraNiN1Wf-1dcpZ5hzPjc0E7sIgEkyUoA/exec";
const EMAIL_DESTINO = "Francisca@gp3chile.cl";
const SHEETS_URL   = "https://script.google.com/macros/s/AKfycbxh0cN7SV9tZtR0bgvZH6ysGzxQgApFiKn7O4C9mN7HUV8h3hWpLbq2fqYbw5XV1Jk3/exec";
const FOTO_URL     = "https://pkpass-34330692548.southamerica-east1.run.app/foto";
// ⚠️ PENDIENTE: pegar acá el valor real de PANEL_KEY (Apps Script "NEUMÁTICOS" → Propiedades del script).
// Sin este valor, el backend responde "unauthorized" a casi toda lectura/escritura (ver auditoría 4-ago-2026).
// Igual que los PIN de arriba, esta clave queda visible en el código público del panel: no es secreta
// frente a quien abra el archivo, solo evita que cualquier bot anónimo golpee el endpoint.
const PANEL_KEY = "8sOf6WB4RZ4IvccD1R1JEaS9lTu7IAlf";

// Agrega ?key=... (o &key=... si ya hay otros parámetros) a cualquier URL del backend NEUMÁTICOS.
function withKey(url) {
  return url + (url.indexOf("?") === -1 ? "?" : "&") + "key=" + encodeURIComponent(PANEL_KEY);
}

async function syncSheets(type, data) {
try {
 await fetch(SHEETS_URL, {
   method:"POST", mode:"no-cors",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({type,key:PANEL_KEY,...data})
 });
} catch(e){console.log("Sync error:",e);}
}

async function syncAllVentas(ventas) {
try {
 await fetch(SHEETS_URL, {
   method:"POST", mode:"no-cors",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({type:"reset_ventas",key:PANEL_KEY,ventas})
 });
} catch(e){console.log("Sync error:",e);}
}

// Guarda una clave de Config (set_config) y, después, vuelve a leerla del servidor para confirmar
// que realmente quedó guardada — en vez de asumir éxito apenas se dispara el pedido.
// Devuelve {ok:true} o {ok:false, motivo}. payload DEBE incluir _ts (para comparar contra lo leído).
async function guardarConfigVerificado(configKey, payload) {
  await syncSheets("set_config", { key: configKey, value: JSON.stringify(payload) });
  await new Promise((r) => setTimeout(r, 900));
  try {
    const res = await fetch(withKey(SHEETS_URL + "?t=" + Date.now()));
    const json = await res.json();
    if (!json || !json.ok) return { ok: false, motivo: "sin_autorizacion" };
    const raw = json.config && json.config[configKey];
    if (!raw) return { ok: false, motivo: "no_encontrado" };
    let remote;
    try { remote = JSON.parse(raw); } catch (e) { return { ok: false, motivo: "json_invalido" }; }
    if ((remote._ts || 0) === payload._ts) return { ok: true };
    return { ok: false, motivo: "no_coincide" };
  } catch (e) {
    return { ok: false, motivo: "error_red" };
  }
}

// Vuelve a leer las ventas desde el servidor y confirma que una venta con este id realmente está ahí
// (se usa después de cobrar o editar un pago de inscripción, para no confiar en el éxito optimista).
async function verificarVentaGuardada(id) {
  try {
    const res = await fetch(withKey(SHEETS_URL + "?t=" + Date.now()));
    const json = await res.json();
    if (!json || !json.ok || !Array.isArray(json.ventas)) return false;
    return json.ventas.some((row) => row && String(row[0]) === String(id));
  } catch (e) {
    return false;
  }
}

// Barra reutilizable: botón Guardar + estado real (no optimista) para las pestañas de configuración.
function GuardarBar({ estado, onGuardar, label, hora }) {
  const txt =
    estado === "guardando" ? "Guardando…" :
    estado === "ok" ? "✓ Guardado en Google" + (hora ? " · " + hora.toLocaleTimeString("es-AR") : "") :
    estado === "error" ? "✗ No se pudo guardar — probá de nuevo (revisá conexión / PANEL_KEY)" :
    "Hay cambios sin guardar — tocá Guardar";
  const color = estado === "ok" ? "#00a884" : estado === "error" ? "#E8001D" : "#5c5c70";
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:"#eceef3",border:`1px solid ${color}55`,borderRadius:8,padding:"8px 10px",marginTop:10 }}>
      <span style={{ flex:1,minWidth:150,fontSize:11,color,fontWeight:600 }}>{txt}</span>
      <button
        onClick={onGuardar}
        disabled={estado === "guardando"}
        style={{ background: estado==="error" ? "#E8001D" : "#00a884", color:"#06141c", border:"none", borderRadius:8, padding:"8px 16px", cursor: estado==="guardando" ? "wait" : "pointer", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, letterSpacing:1, textTransform:"uppercase", opacity: estado==="guardando" ? 0.6 : 1 }}
      >💾 Guardar {label}</button>
    </div>
  );
}

// Caché de códigos VIP emitidos (para validar el QR en la puerta).
let _vipCache={ts:0,set:null,info:{}};
async function fetchVipCodes(){
const now=Date.now();
if(_vipCache.set&&now-_vipCache.ts<60000)return _vipCache;
try{
 const r=await fetch(withKey(SHEETS_URL+"?tipo=vip_codes&t="+now));
 const j=await r.json();
 if(j&&j.ok&&Array.isArray(j.codes)){
   const set=new Set();const info={};
   j.codes.forEach(c=>{const k=(""+(c.code||"")).trim();if(k){set.add(k);info[k]=c;}});
   _vipCache={ts:now,set,info};
 }
}catch(e){}
return _vipCache;
}

const PRODUCTOS = [
{id:"m110sc1",  tipo:"Delantero", label:"Modelo 110 SC1",  precios:{USD:500, ARS:700000}},
{id:"m140sc1",  tipo:"Trasero",   label:"Modelo 140 SC1",  precios:{USD:500, ARS:700000}},
{id:"m120sc1",  tipo:"Delantero", label:"Modelo 120 SC1",  precios:{USD:300, ARS:415000}},
{id:"m180sc2",  tipo:"Trasero",   label:"Modelo 180 SC2",  precios:{USD:400, ARS:555000}},
{id:"m200sc1",  tipo:"Trasero",   label:"Modelo 200 SC1",  precios:{USD:400, ARS:555000}},
{id:"m200sc2",  tipo:"Trasero",   label:"Modelo 200 SC2",  precios:{USD:400, ARS:555000}},
{id:"m200sc3",  tipo:"Trasero",   label:"Modelo 200 SC3",  precios:{USD:400, ARS:555000}},
{id:"m120rain", tipo:"Delantero", label:"Modelo 120 RAIN", precios:{USD:300, ARS:415000}},
{id:"m200rain", tipo:"Trasero",   label:"Modelo 200 RAIN", precios:{USD:400, ARS:555000}},
];

const STOCK0 = {
m110sc1: {bodega:13,transito:0,flotante:0},
m140sc1: {bodega:13,transito:0,flotante:0},
m120sc1: {bodega:38,transito:0,flotante:0},
m180sc2: {bodega:6, transito:0,flotante:0},
m200sc1: {bodega:80,transito:0,flotante:0},
m200sc2: {bodega:0, transito:0,flotante:0},
m200sc3: {bodega:0, transito:0,flotante:0},
m120rain:{bodega:0, transito:0,flotante:0},
m200rain:{bodega:0, transito:0,flotante:0},
};

const CIRCUITOS_BASE = [
{id:"f1",num:"1ª",nombre:"Termas de Río Hondo",      inicio:"2026-04-03",fin:"2026-04-05"},
{id:"f2",num:"2ª",nombre:"Toay",                     inicio:"2026-05-22",fin:"2026-05-24"},
{id:"f3",num:"3ª",nombre:"San Nicolás",               inicio:"2026-06-19",fin:"2026-06-21"},
{id:"f4",num:"4ª",nombre:"Concordia",                 inicio:"2026-08-07",fin:"2026-08-09",sinJueves:true},
{id:"f5",num:"5ª",nombre:"San Juan Villicum",         inicio:"2026-09-04",fin:"2026-09-06"},
{id:"f6",num:"6ª",nombre:"Termas de Río Hondo 2",    inicio:"2026-10-09",fin:"2026-10-11"},
{id:"f7",num:"7ª",nombre:"San Juan Villicum — Final", inicio:"2026-11-13",fin:"2026-11-15"},
];

const COSTO_NETO_ARS = {
m110sc1:211769, m140sc1:239338, m120sc1:221891, m180sc2:286408,
m200sc1:292350, m200sc2:292350, m200sc3:292350, m120rain:221891, m200rain:292350,
};

const COSTOS_DEFAULT = {
m110sc1: {valor:211769,moneda:"ARS"},
m140sc1: {valor:239338,moneda:"ARS"},
m120sc1: {valor:221891,moneda:"ARS"},
m180sc2: {valor:286408,moneda:"ARS"},
m200sc1: {valor:292350,moneda:"ARS"},
m200sc2: {valor:0,moneda:"ARS"},
m200sc3: {valor:0,moneda:"ARS"},
m120rain:{valor:0,moneda:"ARS"},
m200rain:{valor:0,moneda:"ARS"},
};

const ADMIN_DEFAULT = {
iva:21, tc:1400,
estructura:[
 {id:"e1",nombre:"Patricia",valor:0,pctGP3:60},
 {id:"e2",nombre:"Francisca",valor:0,pctGP3:50},
 {id:"e3",nombre:"Arriendo de local",valor:0,pctGP3:100},
],
fechas:{
 f1:{ivaMode:"neto",estPct:30,insc:21470000,track:1837000,entr:2970000,neuManual:{on:true,venta:87925000,costo:47300000},costos:[
  {id:"t1",nombre:"Autódromo",valor:14000000,factura:true},
  {id:"t2",nombre:"Camod",valor:10000000,factura:false},
  {id:"t3",nombre:"Rendición Antonio",valor:7860655,factura:false},
  {id:"t4",nombre:"TV (total)",valor:9400000,factura:true},
  {id:"t5",nombre:"Banderilleros",valor:2693031,factura:false},
  {id:"t6",nombre:"Rescatista",valor:2511281,factura:false},
  {id:"t7",nombre:"Meta Add",valor:1879832,factura:true},
  {id:"t8",nombre:"Rendición Paty",valor:1426826,factura:false},
  {id:"t9",nombre:"Francisca",valor:939916,factura:false},
  {id:"t10",nombre:"Locución",valor:602709,factura:false},
  {id:"t11",nombre:"Bomberos",valor:600000,factura:false},
  {id:"t12",nombre:"Hotel TV",valor:580000,factura:true},
  {id:"t13",nombre:"Guardia Nocturna",valor:562527,factura:false},
  {id:"t14",nombre:"Sonido",valor:401805,factura:false},
  {id:"t15",nombre:"Staff (Ivonne/Martín/Juan Pablo/Agustín)",valor:1801506,factura:false},
 ]},
 f2:{ivaMode:"neto",estPct:25,insc:13620000,track:6760000,entr:3955000,neuManual:{on:true,venta:52000000,costo:27500000},costos:[
  {id:"y1",nombre:"Camod",valor:10000000,factura:false},
  {id:"y2",nombre:"Autódromo + saldo",valor:9184338,factura:true},
  {id:"y3",nombre:"TV (total)",valor:8900000,factura:true},
  {id:"y4",nombre:"Ambulancias",valor:6734625,factura:true},
  {id:"y5",nombre:"Banderilleros",valor:4235500,factura:false},
  {id:"y6",nombre:"Guardia Nocturna",valor:2613600,factura:false},
  {id:"y7",nombre:"Meta Add",valor:1877095,factura:true},
  {id:"y8",nombre:"Policía",valor:1712652,factura:true},
  {id:"y9",nombre:"Hotel staff",valor:1550000,factura:false},
  {id:"y10",nombre:"Camión a Toay",valor:1200000,factura:false},
  {id:"y11",nombre:"Guardia Diurna",valor:1197900,factura:false},
  {id:"y12",nombre:"Bomberos",valor:1141767,factura:true},
  {id:"y13",nombre:"Rendición Paty",valor:1050500,factura:false},
  {id:"y14",nombre:"Hotel Banderilleros",valor:960000,factura:false},
  {id:"y15",nombre:"Francisca",valor:942000,factura:false},
  {id:"y16",nombre:"Hotel TV",valor:750000,factura:false},
  {id:"y17",nombre:"Limpieza",valor:500000,factura:false},
  {id:"y18",nombre:"Periodista",valor:469274,factura:false},
  {id:"y19",nombre:"Rendición Francisca",valor:372100,factura:false},
  {id:"y20",nombre:"Otros (fotografía/andamios/flyer/gomería/desayunos)",valor:712000,factura:false},
 ]},
 f3:{ivaMode:"neto",estPct:15,insc:0,track:0,entr:0,neuManual:{on:false,venta:0,costo:0},costos:[]},
 f4:{ivaMode:"neto",estPct:10,insc:0,track:0,entr:0,neuManual:{on:false,venta:0,costo:0},costos:[]},
 f5:{ivaMode:"neto",estPct:10,insc:0,track:0,entr:0,neuManual:{on:false,venta:0,costo:0},costos:[]},
 f6:{ivaMode:"neto",estPct:5, insc:0,track:0,entr:0,neuManual:{on:false,venta:0,costo:0},costos:[]},
 f7:{ivaMode:"neto",estPct:5, insc:0,track:0,entr:0,neuManual:{on:false,venta:0,costo:0},costos:[]},
},
};

const HOY = new Date().toISOString().slice(0,10);
function getCircuitosVendedor(){return CIRCUITOS_BASE.filter(c=>c.fin>=HOY);}
function getCircuitoActivo(){
const a=CIRCUITOS_BASE.find(c=>HOY>=c.inicio&&HOY<=c.fin);
if(a)return a;
const prox=CIRCUITOS_BASE.find(c=>c.inicio>HOY);
if(prox)return prox;
return CIRCUITOS_BASE[CIRCUITOS_BASE.length-1];
}

const PILOTOS_BASE = [
{num:"111",nombre:"Augusto Caviglia",cat:"GP3 Amateur"},
{num:"87", nombre:"Javier Alvarez",cat:"GP3 Amateur"},
{num:"99", nombre:"Lucas Brizuela",cat:"GP3 Amateur"},
{num:"69", nombre:"Jose Ignacio Sartor",cat:"GP3 Amateur"},
{num:"11", nombre:"Santiago Zinno",cat:"GP3 Amateur"},
{num:"73", nombre:"Agustin Gagliardo",cat:"GP3 Amateur"},
{num:"24", nombre:"Fabricio Avalos",cat:"GP3 Amateur"},
{num:"96", nombre:"Nicolas Gomez Pontecorvo",cat:"GP3 Amateur"},
{num:"49", nombre:"Federico Marquez",cat:"GP3 Experto"},
{num:"29", nombre:"Mariano Villalobos",cat:"GP3 Experto"},
{num:"86", nombre:"Jose Maria Plaja Maidana",cat:"GP3 Experto"},
{num:"22", nombre:"Santiago Gossa",cat:"GP3 Experto"},
{num:"13", nombre:"Ariel Gavarini",cat:"GP3 Experto"},
{num:"47", nombre:"Virginia Guidetti",cat:"GP3 Experto"},
{num:"64", nombre:"Facundo Romero",cat:"GP3 Promocional"},
{num:"23", nombre:"Pablo Tarantino",cat:"GP3 Promocional"},
{num:"37", nombre:"Manuel Barrionuevo",cat:"GP3 Promocional"},
{num:"16", nombre:"Mauro Finco",cat:"SBK Promocional"},
{num:"22", nombre:"Sebastian Pablo",cat:"SBK Promocional"},
{num:"24", nombre:"Tomas Calvan",cat:"SBK Promocional"},
{num:"94", nombre:"Miguel Rubiolo",cat:"SBK Promocional"},
{num:"17", nombre:"Francisco Velez",cat:"SBK Experto"},
{num:"22", nombre:"Felipe Gini",cat:"SBK Experto"},
{num:"21", nombre:"Gaston Rosato",cat:"SBK Experto"},
{num:"85", nombre:"Alejandro Dalbon",cat:"SBK Experto"},
{num:"9",  nombre:"Javier De Buono",cat:"SBK Experto"},
{num:"80", nombre:"Valentin Romero",cat:"SBK Experto"},
{num:"7",  nombre:"Ariel Quse",cat:"SBK Experto"},
{num:"82", nombre:"Leonardo Villegas",cat:"SBK Experto"},
{num:"128",nombre:"Cristian Albinana",cat:"SBK Experto"},
{num:"169",nombre:"Mauricio Hidalgo",cat:"SBK Experto"},
{num:"13", nombre:"Jorge Gauna",cat:"SBK Senior"},
{num:"53", nombre:"Gerardo Crisafulli",cat:"SBK Senior"},
{num:"12", nombre:"Alexis Varlan",cat:"SBK Senior"},
{num:"27", nombre:"Pablo Gamberini",cat:"SBK Senior"},
{num:"21", nombre:"Walter Paez",cat:"SBK Senior"},
{num:"19", nombre:"Pedro Arrebola",cat:"SBK Senior"},
{num:"28", nombre:"Elgar Eliot",cat:"SBK Senior"},
{num:"45", nombre:"Luis Martinez",cat:"SBK Senior"},
{num:"56", nombre:"Rodrigo Fontecilla",cat:"SBK Senior"},
{num:"65", nombre:"Miguel Solorza",cat:"SBK Senior"},
{num:"98", nombre:"Alejandro Bonello",cat:"SBK Senior"},
{num:"2",  nombre:"Walter Rebolledo",cat:"SBK Senior"},
{num:"43", nombre:"Sergio Cocha",cat:"SBK Amateur"},
{num:"22", nombre:"Gabriel Juan",cat:"SBK Amateur"},
{num:"121",nombre:"Gaston Martinez",cat:"Sportbike"},
{num:"34", nombre:"Ignacio Lemos",cat:"Sportbike"},
{num:"32", nombre:"Valentin Valor",cat:"Sportbike"},
{num:"28", nombre:"Mateo Bongiovanni",cat:"SBK Pro"},
{num:"11", nombre:"Claudio Lopez",cat:"SBK Pro"},
{num:"73", nombre:"Tomas Cassano",cat:"SBK Pro"},
{num:"52", nombre:"Juan Solorza",cat:"SBK Pro"},
{num:"123",nombre:"Maximiliano Rocha",cat:"SBK Pro"},
{num:"33", nombre:"Alberto Auad Cavallotti",cat:"SBK Pro"},
{num:"26", nombre:"Maximiliano Fontecilla",cat:"SBK Pro"},
{num:"21", nombre:"Guillermo Chamorro",cat:"SBK Pro"},
{num:"36", nombre:"Hernan Buezas",cat:"SBK Pro"},
];

const CATS_BASE=[...new Set(PILOTOS_BASE.map(p=>p.cat))];

function getPrecio(prod,moneda,preciosEdit){
if(!prod)return 0;
const p=preciosEdit?.[prod.id]||prod.precios;
return moneda==="ARS"?p.ARS:p.USD;
}
function fmt(val,moneda){
const n=Number(val).toLocaleString("es-AR");
return moneda==="ARS"?"$ "+n:"USD "+n;
}
const MET_LABELS={efectivo_usd:"Efectivo USD",efectivo_ars:"Efectivo ARS",transferencia:"Transferencia",debito:"Débito/Crédito",post:"Post de pago",dolar:"Dólar billete",otro:"Otro"};
function metLabel(m){return MET_LABELS[m]||m;}
// getPagos: devuelve la lista de pagos de una venta. Compatible con ventas viejas (un solo metodo/moneda).
function getPagos(v){
if(v&&Array.isArray(v.pagos)&&v.pagos.length>0)return v.pagos.map(p=>({metodo:p.metodo||"otro",moneda:p.moneda||v.moneda||"ARS",monto:Number(p.monto)||0}));
return [{metodo:v.metodo||"otro",moneda:v.moneda||"ARS",monto:Number(v.total_monto)||0}];
}
// Codifica/decodifica los pagos divididos dentro de la columna "metodo" de la planilla,
// para que el desglose se respalde en Google sin tocar el Apps Script.
function encodeMetodo(pagosClean){
if(!pagosClean||pagosClean.length<=1)return (pagosClean&&pagosClean[0]?.metodo)||"otro";
return "split:"+pagosClean.map(p=>`${p.metodo}~${Math.round(p.monto)}~${p.moneda}`).join("|");
}
function decodeMetodo(metodoStr,monedaFallback,totalFallback){
const s=(metodoStr||"").toString();
if(s.indexOf("split:")===0){
 const pagos=s.slice(6).split("|").map(tok=>{const p=tok.split("~");return p.length>=3?{metodo:p[0],monto:Number(p[1])||0,moneda:p[2]}:null;}).filter(Boolean);
 if(pagos.length>0)return {metodo:"mixto",pagos};
}
return {metodo:s||"otro",pagos:[{metodo:s||"otro",moneda:monedaFallback||"ARS",monto:Number(totalFallback)||0}]};
}
function lsGet(key,def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def;}catch{return def;}}
function lsSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch{}}

function normTxt(s){return (s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function parseMontoAR(s){s=(""+s).trim();const neg=s.startsWith("(")&&s.endsWith(")");s=s.replace(/[()]/g,"").replace(/\./g,"").replace(/,/g,".").replace(/[^\d.-]/g,"");let v=parseFloat(s);if(isNaN(v))v=0;return neg?-v:v;}
function _esMoneda(c){return /[(),]/.test(c)&&/\d/.test(c);}
function parseCartolaText(text){
 const out=[];const lines=(text||"").split(/\r?\n/);
 for(const ln of lines){
   if(!ln.trim())continue;
   let cols=ln.split("\t");
   if(cols.length<2)cols=ln.split(/ {2,}|;/);
   const fIdx=cols.findIndex(c=>/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test((c||"").trim()));
   if(fIdx<0)continue;
   const fecha=cols[fIdx].trim();
   const monCols=[];for(let k=fIdx+1;k<cols.length;k++){if(_esMoneda(cols[k]))monCols.push(k);}
   if(monCols.length===0)continue;
   const impIdx=monCols.length>=2?monCols[monCols.length-2]:monCols[monCols.length-1];
   const monto=parseMontoAR(cols[impIdx]);
   if(monto===0)continue;
   let concepto="";for(let k=fIdx+1;k<impIdx;k++){const t=(cols[k]||"").trim();if(!_esMoneda(t)&&!/^\d+$/.test(t)&&t.length>concepto.length)concepto=t;}
   concepto=concepto.replace(/\s+/g," ").trim();
   if(concepto.toLowerCase()==="concepto")continue;
   out.push({id:"k"+out.length+"_"+Date.now(),fecha,concepto,monto:Math.abs(monto),tipo:monto<0?"out":"in"});
 }
 return out;
}

function exportCSV(ventas,stock,productosActivos){
const prods=productosActivos||PRODUCTOS;
const S=";",BOM="\uFEFF";
const metLabels={"efectivo_usd":"Efectivo USD","transferencia":"Transferencia","efectivo_ars":"Efectivo ARS","transferencia_ars":"Transferencia ARS","debito":"Débito/Crédito"};
const colsDetalle=["ID Venta","Fecha","Circuito","N° Piloto","Piloto","Categoría","Email","Factura","CUIT","Empresa","Método de Pago","Moneda","Modelo","Tipo","Cantidad","Precio Unit.","Subtotal","Total Venta"];
const rowsDetalle=[];
ventas.forEach(v=>{
 const c=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
 v.items.forEach((item,idx)=>{
   const p=prods.find(x=>x.id===item.prod_id);
   rowsDetalle.push([v.id,v.fecha,c?.nombre||"",v.num_piloto||"",v.piloto,v.categoria,v.email_cliente,v.tipo_factura==="FAC"?"Factura":"CF",v.cuit||"",v.empresa||"",getPagos(v).map(pg=>(metLabels[pg.metodo]||pg.metodo)+" "+Math.round(pg.monto).toLocaleString("es-AR")+" "+pg.moneda).join(" + "),v.moneda,p?.label||item.prod_id,p?.tipo||"",item.cantidad,item.precio_unit||"",item.total||"",idx===0?v.total_monto:""].join(S));
 });
});
const metodos={};
ventas.forEach(v=>{getPagos(v).forEach(pg=>{const k=pg.metodo;if(!metodos[k])metodos[k]={label:metLabels[k]||k,usd:0,ars:0,cnt:0,uni:0};if(pg.moneda==="USD")metodos[k].usd+=pg.monto;else metodos[k].ars+=pg.monto;metodos[k].cnt++;});metodos[getPagos(v)[0].metodo]&&(metodos[getPagos(v)[0].metodo].uni+=(v.total_unidades||0));});
const totUSD=ventas.reduce((s,v)=>s+getPagos(v).filter(p=>p.moneda==="USD").reduce((a,p)=>a+p.monto,0),0);
const totARS=ventas.reduce((s,v)=>s+getPagos(v).filter(p=>p.moneda==="ARS").reduce((a,p)=>a+p.monto,0),0);
const resumenRows=[["RESUMEN DE CAJA","","","",""],[""],["Método de Pago","N° Ventas","Unidades","Total USD","Total ARS"],...Object.values(metodos).map(m=>[m.label,m.cnt,m.uni,m.usd>0?m.usd:"",m.ars>0?m.ars:""]),[""],["TOTALES GENERALES","","","",""],["Total USD","","",totUSD,""],["Total ARS","","","",totARS],["Total clientes","",ventas.length,"",""],["Total neumáticos","",ventas.reduce((s,v)=>s+(v.total_unidades||0),0),"",""],["Facturas Empresa","",ventas.filter(v=>v.tipo_factura==="FAC").length,"",""],["Consumidor Final","",ventas.filter(v=>v.tipo_factura==="CF").length,"",""]].map(r=>r.join(S));
const stkRows=prods.map(p=>{const s=stock[p.id]||{bodega:0,transito:0,flotante:0};const tot=(s.transito||0)+(s.bodega||0)+(s.flotante||0);return[p.label,p.tipo||"",s.transito||0,s.bodega||0,s.flotante||0,tot].join(S);});
const csv=BOM+["DETALLE DE VENTAS — GP3 Sports LATAM — CAV 2026",colsDetalle.join(S),...rowsDetalle,"","",...resumenRows,"","","STOCK AL CIERRE",["Producto","Tipo","Tránsito","Bodega","Flotante","Total"].join(S),...stkRows].join("\n");
try{const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="GP3_Cierre_"+HOY+".csv";document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){alert("Error al exportar");}
}

const GS=`
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;background:#f4f5f8;}
body{font-family:'Barlow',sans-serif;color:#16161d;-webkit-font-smoothing:antialiased;}
input,select,button{font-family:'Barlow',sans-serif;}
input:-webkit-autofill{-webkit-box-shadow:0 0 0 30px #ffffff inset!important;-webkit-text-fill-color:#16161d!important;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:#e6e8ee;}
::-webkit-scrollbar-thumb{background:#c2c5d0;border-radius:2px;}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@media(max-width:640px){.desktop-grid{grid-template-columns:1fr!important;}}
.anim-in{animation:fadeIn .25s ease forwards;}
.slide-up{animation:slideUp .3s ease forwards;}
`;

function Logo({size="md"}){
const [err,setErr]=useState(false);
const h=size==="sm"?26:size==="lg"?46:34;
if(!err){return(<img src="/gp3-logo.png" alt="GP3 Sports Latam" style={{height:h,objectFit:"contain",display:"block"}} onError={()=>setErr(true)}/>);}
const s=size==="sm"?{gp:22,n3:28,sub:7,gap:6}:size==="lg"?{gp:32,n3:40,sub:9,gap:8}:{gp:26,n3:32,sub:8,gap:7};
return(<div style={{display:"flex",alignItems:"center",gap:s.gap}}><div style={{display:"flex",alignItems:"stretch"}}><div style={{background:"#fff",borderRadius:"6px 0 0 6px",padding:"3px 8px",display:"flex",alignItems:"center"}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.gp,fontWeight:900,color:"#0a0a0f",letterSpacing:-1,lineHeight:1}}>GP</span></div><div style={{background:C.red,borderRadius:"0 6px 6px 0",padding:"0 8px",display:"flex",alignItems:"center",transform:"skewX(-6deg)",marginLeft:-2}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.n3,fontWeight:900,color:"#fff",letterSpacing:-2,lineHeight:1,display:"inline-block",transform:"skewX(6deg)"}}> 3</span></div></div><div style={{display:"flex",flexDirection:"column",gap:1}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.sub+2,fontWeight:700,color:C.text,letterSpacing:3,textTransform:"uppercase",lineHeight:1}}>SPORTS LATAM</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.sub,fontWeight:600,color:C.red,letterSpacing:2,textTransform:"uppercase",lineHeight:1}}>PIRELLI PARTNER</span></div></div>);
}
function Badge({children,color=C.red,small}){return(<span style={{display:"inline-flex",alignItems:"center",padding:small?"2px 6px":"3px 8px",borderRadius:3,background:color+"22",border:`1px solid ${color}44`,color,fontSize:small?9:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap"}}>{children}</span>);}
function Pill({children,active,color=C.red,onClick}){return(<button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,border:`1px solid ${active?color:C.border2}`,background:active?color+"22":"transparent",color:active?C.text:C.gray,transition:"all .2s",whiteSpace:"nowrap"}}>{children}</button>);}
function Card({children,style}){return(<div style={{background:C.dark3,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",...style}}>{children}</div>);}
function CardHeader({children}){return(<div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:C.red,borderRadius:2,flexShrink:0}}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text}}>{children}</span></div>);}
function StatBox({label,value,color=C.text,sub}){return(<div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",flex:1,minWidth:80,borderTop:`2px solid ${color}`}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color,lineHeight:1,letterSpacing:-1}}>{value}</div>{sub&&<div style={{fontSize:10,color,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,marginTop:1}}>{sub}</div>}<div style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginTop:3,fontFamily:"'Barlow Condensed',sans-serif"}}>{label}</div></div>);}
function Input({style,...props}){return(<input style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"11px 14px",fontSize:15,outline:"none",width:"100%",transition:"border .2s",fontFamily:"'Barlow',sans-serif",...style}} {...props} onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.border2}/>);}
function Select({children,style,...props}){return(<select style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"11px 14px",fontSize:15,outline:"none",width:"100%",appearance:"none",fontFamily:"'Barlow',sans-serif",...style}} {...props}>{children}</select>);}
function Btn({children,onClick,color=C.red,outline,full,small,disabled,style}){return(<button onClick={onClick} disabled={disabled} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:small?"8px 14px":"12px 20px",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:small?13:15,fontWeight:700,letterSpacing:1,width:full?"100%":undefined,border:`2px solid ${outline?color:"transparent"}`,background:outline?"transparent":disabled?C.dark4:color,color:outline?color:disabled?C.gray:"#fff",transition:"all .2s",opacity:disabled?.5:1,textTransform:"uppercase",...style}}>{children}</button>);}
function Toast({msg,err}){return(<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 20px",borderRadius:10,fontWeight:700,fontSize:14,color:"#fff",background:err?"#cc1133":"#00a878",boxShadow:"0 8px 32px rgba(0,0,0,.6)",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,whiteSpace:"nowrap",maxWidth:"90vw",textAlign:"center",animation:"slideUp .2s ease"}}>{msg}</div>);}
function Label({children}){return <div style={{fontSize:10,color:C.gray,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif",marginBottom:6,fontWeight:600}}>{children}</div>;}
function Field({label,children}){return <div style={{display:"flex",flexDirection:"column",marginBottom:14}}><Label>{label}</Label>{children}</div>;}
function Divider(){return <div style={{height:1,background:C.border,margin:"8px 0"}}/>;}

function NumInput({value,onChange,color,align="right",width}){
return <input value={(value||0).toLocaleString("es-AR")} onChange={e=>{const r=e.target.value.replace(/[^\d]/g,"");onChange(r===""?0:parseInt(r,10));}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:color||C.yellow,borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",width:width||"100%",textAlign:align,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}/>;
}

function CavLogo(){
const [err,setErr]=useState(false);
const CAV="#1f93bf";
if(err)return(<span style={{display:"inline-flex",alignItems:"center"}}><span style={{background:"#fff",color:"#0a0a0f",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,padding:"2px 8px",borderRadius:"6px 0 0 6px",lineHeight:1}}>GP</span><span style={{background:CAV,color:"#0a0a0f",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:27,padding:"0 8px",borderRadius:"0 6px 6px 0",transform:"skewX(-6deg)",marginLeft:-3,lineHeight:1}}>3</span></span>);
return(<img src="/cav-logo.png" alt="CAV" style={{height:44,objectFit:"contain"}} onError={()=>setErr(true)}/>);
}

function DesglosePagos({ventas,tc,titulo}){
 const T=tc||1400;
 const acc={};const norm=m=>{m=(""+(m||"")).toLowerCase();if(m.includes("efectivo")||m.includes("dolar")||m==="usd")return "efectivo";if(m.includes("transfer"))return "transferencia";if(m.includes("debito")||m.includes("credito"))return "debito";if(m.includes("mercado"))return "mercadopago";if(m.includes("post"))return "post";if(m.includes("vip"))return "vip_qr";if(m.includes("ticketera"))return "ticketera";if(m.includes("invitado"))return "invitado";if(m.includes("gratu"))return "gratuito";return m||"otro";};
 (ventas||[]).forEach(v=>{getPagos(v).forEach(p=>{const moneda=p.moneda||"ARS";const metodo=norm(p.metodo);const k=metodo+"|"+moneda;if(!acc[k])acc[k]={metodo,moneda,monto:0,cnt:0};acc[k].monto+=Number(p.monto)||0;acc[k].cnt++;});});
 const MET={efectivo_usd:"💵 Efectivo",efectivo_ars:"💵 Efectivo",transferencia:"🏦 Transferencia",debito:"💳 Débito/Crédito",mercadopago:"📱 MercadoPago",post:"🧾 Post de pago",otro:"💰 Otro",vip_qr:"⭐ VIP",gratuito:"🎁 Gratis",invitado:"🎟 Invitado",ticketera:"🎫 Ticketera",mixto:"🔀 Mixto"};
 const esFact=m=>{m=(""+(m||"")).toLowerCase();return m.includes("transfer")||m.includes("debito")||m.includes("credito")||m.includes("mercado")||m.includes("post");};
 const lineas=Object.values(acc).map(x=>({...x,label:(MET[x.metodo]||x.metodo)+" "+(x.moneda==="USD"?"USD":"ARS"),ars:x.moneda==="USD"?x.monto*T:x.monto,fact:esFact(x.metodo)})).sort((a,b)=>b.ars-a.ars);
 if(lineas.length===0)return null;
 const totalARS=lineas.reduce((s,x)=>s+x.ars,0);
 const factARS=lineas.filter(x=>x.fact).reduce((s,x)=>s+x.ars,0);
 const fmtM=(n,m)=>(m==="USD"?"USD ":"$ ")+Math.round(n||0).toLocaleString("es-AR");
 return(<div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
   <div style={{fontSize:11,color:C.gray,fontWeight:700,letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:8}}>{titulo||"💰 CÓMO INGRESÓ EL DINERO"}</div>
   <div style={{display:"flex",flexDirection:"column",gap:6}}>
     {lineas.map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
       <span style={{color:C.text,fontWeight:600}}>{x.label} <span style={{color:C.gray2,fontSize:11}}>· {x.cnt}</span>{x.fact&&<span style={{marginLeft:6,fontSize:9,color:"#2b8fd0",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,border:"1px solid #2b8fd055",borderRadius:4,padding:"1px 5px"}}>🧾 A FACTURAR</span>}</span>
       <span style={{display:"flex",gap:8,alignItems:"center"}}>
         <b style={{fontFamily:"'Barlow Condensed',sans-serif",color:x.moneda==="USD"?C.green:C.yellow}}>{fmtM(x.monto,x.moneda)}</b>
         {x.moneda==="USD"&&<span style={{fontSize:10,color:C.gray}}>(≈ {fmtM(x.ars,"ARS")})</span>}
       </span>
     </div>))}
   </div>
   {factARS>0&&(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,marginTop:8,borderTop:`1px dashed ${C.border}`}}>
     <span style={{fontSize:12,color:"#2b8fd0",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>🧾 A FACTURAR (transfer. + débito)</span>
     <b style={{fontFamily:"'Barlow Condensed',sans-serif",color:"#2b8fd0",fontSize:15}}>{fmtM(factARS,"ARS")}</b>
   </div>)}
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,marginTop:8,borderTop:`1px solid ${C.border}`}}>
     <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>TOTAL EN PESOS</span>
     <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:18}}>{fmtM(totalARS,"ARS")}</span>
   </div>
   <div style={{fontSize:10,color:C.gray,marginTop:6}}>Dólares pasados a pesos con tu TC {Math.round(T).toLocaleString("es-AR")} (Administración).</div>
 </div>);
}
function InscripcionesPanel({eventoActivo,aranceles,tcApp,onPagar,onEditarPago,inscPagadas,inscVentas,onBorrarVenta,pilotosDB,onNuevoPiloto,onCrearPreinscripcion}){
const CAV="#1f93bf";
const CATS=["GP3 Amateur","GP3 Experto","GP3 Promocional","SBK Pro","SBK Experto","SBK Senior","SBK Promocional","SBK Amateur","Sportbike","600 SSP"];
const selSt={background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"11px 14px",fontSize:15,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"};
const lblIn={fontSize:9,color:C.gray,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,marginBottom:3,display:"block"};
const [data,setData]=useState([]);
const [estado,setEstado]=useState("cargando");
const [ts,setTs]=useState(null);
const [q,setQ]=useState("");
const [editId,setEditId]=useState(null);
const [ed,setEd]=useState({});
const [fFecha,setFFecha]=useState(eventoActivo||"todas");
useEffect(()=>{if(eventoActivo)setFFecha(eventoActivo);},[eventoActivo]);
const ARA=aranceles||{};const PAG=inscPagadas||{};
const normNom=s=>(""+(s||"")).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const ventaDe=p=>{const nom=normNom((p.nombre||"")+" "+(p.apellido||""));return PAG[nom+"|"+(p.circ_id||"")]||PAG[nom]||null;};
const [pagar,setPagar]=useState(null);
const [pagos,setPagos]=useState([]);
const [pagoEdit,setPagoEdit]=useState(null);
const [pTarget,setPTarget]=useState({total:0,moneda:"ARS"});
const [manualMode,setManualMode]=useState(false);
const [manualPil,setManualPil]=useState({nombre:"",categoria:"",numero:""});
const [pilQ,setPilQ]=useState("");
const [showPilSug,setShowPilSug]=useState(false);
const [pulseraPiloto,setPulseraPiloto]=useState("");
const [pulserasAcomp,setPulserasAcomp]=useState([]);
  /* ===== Foto del piloto (almacenamiento propio, NO Drive) ===== */
  const [fotoVer,setFotoVer]=useState(0);        // cache-buster para recargar la imagen
  const [fotoEstado,setFotoEstado]=useState(""); // "", "subiendo", "ok", "error", "vacia"
  const fotoInputRef=useRef(null);
  const fotoIdDe=p=>((p&&(p.dni||p.doc||p.documento))||"").toString().replace(/\D/g,"");
  const fotoSrc=p=>{const id=fotoIdDe(p);return id?(FOTO_URL+"?id="+id+"&v="+fotoVer):"";};
  const cambiarFotoClick=()=>{if(fotoInputRef.current)fotoInputRef.current.click();};
  const subirFoto=async(ev,p)=>{
    const file=ev.target.files&&ev.target.files[0];ev.target.value="";
    if(!file)return;
    const id=fotoIdDe(p);
    if(!id){setFotoEstado("error");alert("Este piloto no tiene DNI cargado; no se puede guardar la foto.");return;}
    if(file.size>8*1024*1024){setFotoEstado("error");alert("La foto es muy grande (máx 8 MB).");return;}
    setFotoEstado("subiendo");
    const rd=new FileReader();
    rd.onload=async()=>{
      try{
        const res=await fetch(FOTO_URL+"?id="+id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({b64:String(rd.result)})});
        const j=await res.json().catch(()=>({}));
        if(res.ok&&j.ok){setFotoEstado("ok");setFotoVer(v=>v+1);}
        else{setFotoEstado("error");alert("No se pudo guardar la foto.");}
      }catch(e){setFotoEstado("error");alert("Error de red al subir la foto.");}
    };
    rd.readAsDataURL(file);
  };
  const borrarFoto=async(p)=>{
    const id=fotoIdDe(p);if(!id)return;
    if(!window.confirm("¿Borrar la foto de este piloto? Quedará sin foto hasta que cargues otra."))return;
    setFotoEstado("subiendo");
    try{
      const res=await fetch(FOTO_URL+"?id="+id,{method:"DELETE"});
      if(res.ok){setFotoEstado("vacia");setFotoVer(v=>v+1);}
      else{setFotoEstado("error");}
    }catch(e){setFotoEstado("error");}
  };
  /* ===== Acompañantes con pase QR (acreditaciones) — auditado ===== */
  const [acredList,setAcredList]=useState([]);
  const [acredMsg,setAcredMsg]=useState("");
  const [acredCargado,setAcredCargado]=useState(false);
  const acredRef=useRef({key:"",list:[],dirty:false,cargado:false,circ_id:"",circuito:""});
  const ACRED_CUPOS={mecanico:3,sponsor:5,invitado:5};
  const acredKey=(p)=>{const d=((p&&(p.dni||p.doc))||"").toString().replace(/\D/g,"");const c=((p&&p.circ_id)||"").toString();return (d&&c)?d+"_"+c:"";};
  const acredFilas=(l)=>l.filter(a=>(((a.nombre||"")+(a.apellido||"")+(a.email||"")).trim()));
  useEffect(()=>{
    let vivo=true;
    const k=pagar?acredKey(pagar):"";
    setAcredList([]);setAcredMsg("");setAcredCargado(false);
    acredRef.current={key:k,list:[],dirty:false,cargado:false,circ_id:((pagar&&pagar.circ_id)||"").toString(),circuito:((pagar&&pagar.circuito)||"").toString()};
    if(!k)return;
    fetch(withKey(SHEETS_URL+"?tipo=acreditaciones&insc_id="+encodeURIComponent(k)))
      .then(r=>r.json())
      .then(rows=>{
        if(!vivo||!Array.isArray(rows))return;
        const lista=rows.map(a=>({id:(a.id||("acr_"+Date.now()+"_"+Math.floor(Math.random()*100000))),tipo:a.tipo||"invitado",nombre:a.nombre||"",apellido:a.apellido||"",nacimiento:a.nacimiento||"",email:a.email||""}));
        setAcredList(lista);setAcredCargado(true);
        acredRef.current.list=lista;acredRef.current.cargado=true;
      })
      .catch(()=>{if(vivo)setAcredMsg("No se pudieron cargar los acompañantes. Reabrí la ficha para reintentar.");});
    return ()=>{
      vivo=false;
      const s=acredRef.current;
      if(s.dirty&&s.cargado&&s.key){
        try{syncSheets("acreditacion_set",{insc_id:s.key,circ_id:s.circ_id,circuito:s.circuito,lista:acredFilas(s.list)});}catch(e){}
      }
    };
  },[pagar?acredKey(pagar):""]);
  const acredMut=(nueva)=>{setAcredList(nueva);acredRef.current.list=nueva;acredRef.current.dirty=true;};
  const acredCount=(tipo)=>acredList.filter(a=>a.tipo===tipo).length;
  const acredAdd=()=>{
    if(!acredCargado)return;
    const tipo=acredCount("invitado")<5?"invitado":(acredCount("mecanico")<3?"mecanico":(acredCount("sponsor")<5?"sponsor":null));
    if(!tipo){setAcredMsg("Cupo máximo: 3 mecánicos, 5 sponsors, 5 invitados");return;}
    setAcredMsg("");
    acredMut([...acredList,{id:"acr_"+Date.now()+"_"+Math.floor(Math.random()*100000),tipo:tipo,nombre:"",apellido:"",nacimiento:"",email:""}]);
  };
  const acredSet=(i,k,v)=>{
    if(k==="tipo"){const cnt=acredList.filter((a,j)=>j!==i&&a.tipo===v).length;if(cnt>=ACRED_CUPOS[v]){setAcredMsg(v==="mecanico"?"Cupo máximo de mecánicos: 3":"Cupo máximo de "+v+"s: 5");return;}}
    setAcredMsg("");
    acredMut(acredList.map((a,j)=>j===i?{...a,[k]:v}:a));
  };
  const acredDel=(i)=>acredMut(acredList.filter((_,j)=>j!==i));
  const acredGuardar=()=>{
    const k=acredKey(pagar);
    if(!k||!acredCargado)return;
    syncSheets("acreditacion_set",{insc_id:k,circ_id:((pagar&&pagar.circ_id)||"").toString(),circuito:((pagar&&pagar.circuito)||"").toString(),lista:acredFilas(acredList)});
    acredRef.current.dirty=false;
    setAcredMsg("✓ Acompañantes enviados");
  };
const [precioManualOn,setPrecioManualOn]=useState(false);
const [pFactura,setPFactura]=useState("CF");
const [pCuit,setPCuit]=useState("");
const [precioBase,setPrecioBase]=useState(0);
const [cat2On,setCat2On]=useState(false);
const [cat2Cat,setCat2Cat]=useState("");
const [cat2Val,setCat2Val]=useState(0);
const [comentario,setComentario]=useState("");
const [datosCompletos,setDatosCompletos]=useState(false);
const [pilFull,setPilFull]=useState({apellido:"",dni:"",nacimiento:"",provincia:"",localidad:"",domicilio:"",telefono:"",telefono_acomp:"",email:"",marca:"",modelo:"",equipo:"",sponsor:"",jefe_equipo:"",carpa:"",jueves:""});
const setPF=(k,v)=>setPilFull(p=>({...p,[k]:v}));
const PDB=pilotosDB||[];
const convM=(m,de,a)=>de===a?(Number(m)||0):(a==="ARS"?(Number(m)||0)*(tcApp||1400):(Number(m)||0)/(tcApp||1400));
const resetExtras=()=>{setManualMode(false);setManualPil({nombre:"",categoria:"",numero:""});setPilQ("");setShowPilSug(false);setPulseraPiloto("");setPulserasAcomp([]);setPrecioManualOn(false);setPFactura("CF");setPCuit("");setPrecioBase(0);setCat2On(false);setCat2Cat("");setCat2Val(0);setComentario("");setDatosCompletos(false);setPilFull({apellido:"",dni:"",nacimiento:"",provincia:"",localidad:"",domicilio:"",telefono:"",telefono_acomp:"",email:"",marca:"",modelo:"",equipo:"",sponsor:"",jefe_equipo:"",carpa:"",jueves:""});};
const aplicarArancel=(cat)=>{const a=ARA[cat]||{valor:0,moneda:"ARS"};setPrecioBase(a.valor||0);setPTarget(t=>({...t,moneda:a.moneda||"ARS"}));setPagos([{metodo:(a.moneda==="USD")?"efectivo_usd":"efectivo_ars",moneda:a.moneda||"ARS",monto:a.valor||0}]);};
useEffect(()=>{setPTarget(t=>({...t,total:Math.round(((Number(precioBase)||0)+(cat2On?(Number(cat2Val)||0):0))*100)/100}));},[precioBase,cat2On,cat2Val]);
const togglePTargetMoneda=()=>{const nm=pTarget.moneda==="USD"?"ARS":"USD";const cv=v=>{const x=convM(v,pTarget.moneda,nm);return nm==="ARS"?Math.round(x):Math.round(x*100)/100;};setPrecioBase(b=>cv(b));setCat2Val(c=>cv(c));setPTarget(t=>({...t,moneda:nm}));};
const setCat2Categoria=(cat)=>{setCat2Cat(cat);const a=ARA[cat]||{valor:0,moneda:"ARS"};const v=convM(a.valor||0,a.moneda||"ARS",pTarget.moneda);setCat2Val(pTarget.moneda==="ARS"?Math.round(v):Math.round(v*100)/100);};
const abrirPago=p=>{resetExtras();setPagar(p);setPagoEdit(null);aplicarArancel(p.categoria);};
const abrirPagoManual=()=>{resetExtras();setPagoEdit(null);setManualMode(true);setPagar({__manual:true,circ_id:fFecha!=="todas"?fFecha:eventoActivo});setPTarget({total:0,moneda:"ARS"});setPagos([{metodo:"efectivo_ars",moneda:"ARS",monto:0}]);};
const abrirPagoEdit=(p,v)=>{resetExtras();setPagar(p);setPagoEdit(v);const tot=Number(v.total_monto)||0;const mon=v.moneda||"ARS";const c2=v.insc_cat2||null;const c2v=c2?(Number(c2.v)||0):0;setPTarget({total:tot,moneda:mon});setPrecioManualOn(true);setPrecioBase(Math.round((tot-c2v)*100)/100);if(c2&&c2.c){setCat2On(true);setCat2Cat(c2.c);setCat2Val(c2v);}setComentario(v.comentario||"");setPFactura(v.tipo_factura==="FAC"?"FAC":"CF");setPCuit(v.cuit||"");setPulseraPiloto(v.pulsera_piloto||"");setPulserasAcomp(Array.isArray(v.pulseras_acomp)?v.pulseras_acomp:[]);const ps=(Array.isArray(v.pagos)&&v.pagos.length)?v.pagos.map(x=>({metodo:x.metodo||"efectivo_ars",moneda:x.moneda||"ARS",monto:Number(x.monto)||0})):[{metodo:v.metodo||"efectivo_ars",moneda:v.moneda||"ARS",monto:Number(v.total_monto)||0}];setPagos(ps);};
const setManualCat=(cat)=>{setManualPil(m=>({...m,categoria:cat}));if(!precioManualOn)aplicarArancel(cat);};
const selSugPiloto=(s)=>{const cat=s.cat||s.categoria||"";const dispName=s.nombre||"";setManualPil({nombre:dispName,categoria:cat,numero:((s.num||s.numero||"")+"")});setPilQ(dispName);setShowPilSug(false);if(s._full){setDatosCompletos(true);setPilFull({apellido:"",dni:s.dni||"",nacimiento:s.nacimiento||"",provincia:s.provincia||"",localidad:s.localidad||"",domicilio:s.domicilio||"",telefono:s.telefono||"",telefono_acomp:s.telefono_acomp||"",email:s.email||"",marca:s.marca||"",modelo:s.modelo||"",equipo:s.equipo||"",sponsor:s.sponsor||"",jefe_equipo:s.jefe_equipo||"",carpa:s.carpa||"",jueves:s.jueves||""});}if(!precioManualOn)aplicarArancel(cat);};
const togglePrecioManual=()=>{const nv=!precioManualOn;setPrecioManualOn(nv);if(!nv)aplicarArancel(manualMode?manualPil.categoria:(pagar&&pagar.categoria));};
const addAcomp=()=>setPulserasAcomp(prev=>[...prev,""]);
const setAcomp=(i,val)=>setPulserasAcomp(prev=>prev.map((x,j)=>j===i?val:x));
const delAcomp=(i)=>setPulserasAcomp(prev=>prev.filter((_,j)=>j!==i));
const pCub=pagos.reduce((s,x)=>s+convM(x.monto,x.moneda,pTarget.moneda),0);
const pFalta=Math.round((pTarget.total-pCub)*100)/100;
const pMixto=pagos.some(x=>x.moneda!==pTarget.moneda);const pTol=pTarget.moneda==="USD"?0.5:(pMixto?Math.max(2,Math.ceil((tcApp||1400)*0.01)):1);const pOk=pTarget.total>0?(Math.abs(pFalta)<=pTol):(pCub>0);
const setPagoL=(idx,patch)=>setPagos(prev=>prev.map((p,i)=>i===idx?{...p,...patch}:p));
const addPagoL=()=>setPagos(prev=>[...prev,{metodo:"efectivo_ars",moneda:pTarget.moneda,monto:Math.max(0,pFalta>0?pFalta:0)}]);
const delPagoL=idx=>setPagos(prev=>{const n=prev.filter((_,i)=>i!==idx);return n.length?n:[{metodo:"efectivo_ars",moneda:pTarget.moneda,monto:pTarget.total}];});
const togglePagoL=(idx,p)=>{const nm=p.moneda==="USD"?"ARS":"USD";const otras=pagos.reduce((s,q,j)=>j===idx?s:s+convM(Number(q.monto)||0,q.moneda,pTarget.moneda),0);const faltaT=Math.max(0,Math.round((pTarget.total-otras)*100)/100);setPagoL(idx,{moneda:nm,monto:Math.round(convM(faltaT,pTarget.moneda,nm)*100)/100});};
const _fmtF=(ini,fin)=>{try{var mm=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];var a=(ini||"").split("-"),b=(fin||"").split("-");return (+a[2])+" – "+(+b[2])+" "+mm[(+b[1])-1]+" "+b[0];}catch(e){return "";}};
  const confirmarPago=()=>{if(!pagar)return;try{if(acredCargado&&acredRef.current.dirty)acredGuardar();}catch(e){} const efCat=manualMode?(manualPil.categoria||""):(pagar.categoria||"");if(manualMode&&!(manualPil.nombre||"").trim()){alert("Poné el nombre del piloto");return;}if(manualMode&&!efCat){alert("Elegí la categoría");return;}const limpios=pagos.filter(x=>(Number(x.monto)||0)>0).map(x=>({metodo:x.metodo,moneda:x.moneda,monto:Number(x.monto)||0}));if(!limpios.length)return;const eff=pTarget.total>0?pTarget.total:pCub;const efPil=manualMode?{nombre:manualPil.nombre,apellido:"",categoria:efCat,numero:manualPil.numero,circ_id:(pagar.circ_id||(fFecha!=="todas"?fFecha:eventoActivo)),email:""}:pagar;const extra={tipo_factura:pFactura,cuit:pFactura==="FAC"?pCuit:"",pulsera_piloto:pulseraPiloto,pulseras_acomp:pulserasAcomp.filter(x=>(""+x).trim()),comentario:(comentario||"").trim(),cat2:(cat2On&&cat2Cat)?{categoria:cat2Cat,valor:Number(cat2Val)||0,moneda:pTarget.moneda}:null,base1:Number(precioBase)||0,manual:!!(manualMode||(pagoEdit&&pagoEdit.insc_manual))};if(manualMode&&datosCompletos&&onCrearPreinscripcion){const _nm=(manualPil.nombre||"").trim();let _no=_nm,_ap=(pilFull.apellido||"").trim();if(!_ap){const _sp=_nm.split(/\s+/);if(_sp.length>1){_no=_sp[0];_ap=_sp.slice(1).join(" ");}}onCrearPreinscripcion({nombre:_no,apellido:_ap,dni:pilFull.dni,nacimiento:pilFull.nacimiento,provincia:pilFull.provincia,localidad:pilFull.localidad,domicilio:pilFull.domicilio,telefono:pilFull.telefono,telefono_acomp:pilFull.telefono_acomp,email:pilFull.email,categoria:efCat,numero:manualPil.numero,marca:pilFull.marca,modelo:pilFull.modelo,equipo:pilFull.equipo,sponsor:pilFull.sponsor,jefe_equipo:pilFull.jefe_equipo,carpa:pilFull.carpa,jueves:((CIRCUITOS_BASE.find(c=>c.id===efPil.circ_id)||{}).sinJueves?"No":pilFull.jueves),circ_id:efPil.circ_id});}if(manualMode&&onNuevoPiloto)onNuevoPiloto({nombre:manualPil.nombre,numero:manualPil.numero,categoria:efCat});if(pagoEdit){onEditarPago&&onEditarPago(pagoEdit,efPil,limpios,eff,pTarget.moneda,extra);}else{onPagar&&onPagar(efPil,limpios,eff,pTarget.moneda,extra);try{if(!manualMode&&pagar&&(pagar.dni||pagar.doc)&&(pagar.email||"").trim()){var _cid=(pagar.circ_id||"").toString();var _c=CIRCUITOS_BASE.filter(function(x){return x.id===_cid;})[0];syncSheets("acreditacion_enviar",{insc_id:(pagar.dni||pagar.doc||"").toString().replace(/\D/g,"")+"_"+_cid,circ_id:_cid,circuito:(pagar.circuito||(_c?_c.nombre:"")),fecha_txt:(_c?_fmtF(_c.inicio,_c.fin):""),piloto:{nombre:pagar.nombre,apellido:pagar.apellido,numero:pagar.numero,categoria:pagar.categoria,moto:((pagar.marca||"")+" "+(pagar.modelo||"")).trim(),email:pagar.email}});}}catch(e){}}setPagar(null);setPagoEdit(null);resetExtras();};
const fmtMon2=(n,m)=>(m==="USD"?"USD ":"$ ")+Math.round(n||0).toLocaleString("es-AR");
const cargar=async()=>{
 try{
   const res=await fetch(SHEETS_URL+"?tipo=inscripciones&t="+Date.now());
   const json=await res.json();
   const arr=Array.isArray(json)?json:(json.inscripciones||json.data||[]);
   setData(arr);setTs(new Date());setEstado(arr.length?"ok":"vacio");
 }catch(e){setEstado(prev=>prev==="ok"?"ok":"error");}
};
useEffect(()=>{cargar();const id=setInterval(cargar,30000);return()=>clearInterval(id);},[]);
const norm=r=>({
 id:r.id||"",fecha_registro:r.fecha_registro||r["Fecha Registro"]||"",
 nombre:r.nombre||"",apellido:r.apellido||"",dni:r.dni||r.doc||r.documento||"",nacimiento:r.nacimiento||"",
 provincia:r.provincia||"",localidad:r.localidad||"",domicilio:r.domicilio||"",
 telefono:r.telefono||r.whatsapp||"",telefono_acomp:r.telefono_acomp||r.emergencia||"",email:r.email||"",
 categoria:r.categoria||"",numero:r.numero||"",marca:r.marca||"",modelo:r.modelo||"",
 equipo:r.equipo||"",sponsor:r.sponsor||"",
 jefe_equipo:r.jefe_equipo||"",pilotos_equipo:r.pilotos_equipo||"",carpa:r.carpa||"",
 circ_id:r.circ_id||"",circuito:r.circuito||"",jueves:r.jueves||"",
});
const filasTodas=data.map(norm);
const circSel=CIRCUITOS_BASE.find(c=>c.id===fFecha);
const filas=fFecha==="todas"?filasTodas:filasTodas.filter(p=>p.circ_id===fFecha||(circSel&&p.circuito===circSel.nombre));
const fil=q.trim().length>1?filas.filter(p=>(p.nombre+" "+p.apellido+" "+p.categoria+" "+p.numero+" "+p.equipo+" "+p.circuito+" "+p.localidad+" "+p.marca).toLowerCase().includes(q.toLowerCase())):filas;
const _matchedV=new Set();fil.forEach(p=>{const vv=ventaDe(p);if(vv)_matchedV.add(vv.id);});
const manualesPil=(inscVentas||[]).filter(v=>v.insc_manual&&!_matchedV.has(v.id)&&(fFecha==="todas"||v.circ_id===fFecha)).map(v=>({id:"man_"+v.id,esManual:true,_venta:v,nombre:v.piloto||"",apellido:"",dni:"",nacimiento:"",provincia:"",localidad:"",domicilio:"",telefono:"",telefono_acomp:"",email:v.email_cliente||"",categoria:v.categoria||"",numero:v.num_piloto||"",marca:"",modelo:"",equipo:"",sponsor:"",jefe_equipo:"",pilotos_equipo:"",carpa:"",circ_id:v.circ_id||"",circuito:(CIRCUITOS_BASE.find(c=>c.id===v.circ_id)?.nombre)||"",jueves:""}));
const manualesPilF=q.trim().length>1?manualesPil.filter(p=>(p.nombre+" "+p.categoria+" "+p.numero+" "+p.circuito).toLowerCase().includes(q.toLowerCase())):manualesPil;
const _dbPre=(()=>{const m={};(filasTodas||[]).forEach(p=>{const full=((p.nombre||"")+" "+(p.apellido||"")).trim();if(!full)return;const k=full.toLowerCase().replace(/\s+/g," ").trim();const sc=[p.dni,p.nacimiento,p.provincia,p.localidad,p.domicilio,p.telefono,p.email,p.marca,p.modelo,p.equipo].filter(x=>(""+x).trim()).length;if(!m[k]||sc>m[k]._sc){m[k]={...p,_full:true,_sc:sc,nombre:full,num:p.numero,cat:p.categoria};}});return Object.values(m);})();
const sugPilotos=(()=>{const qq=pilQ.trim().toLowerCase();if(!qq)return [];const fromDb=_dbPre.filter(p=>(p.nombre||"").toLowerCase().includes(qq)||(""+(p.num||"")).includes(qq));const seen=new Set(fromDb.map(p=>(p.nombre||"").toLowerCase()));const fromBase=PDB.filter(p=>((p.nombre||"").toLowerCase().includes(qq)||(""+(p.num||"")).includes(qq))&&!seen.has((p.nombre||"").toLowerCase()));return [...fromDb,...fromBase].slice(0,8);})();
const porCat={};filas.forEach(p=>{if(p.categoria)porCat[p.categoria]=(porCat[p.categoria]||0)+1;});
const catOrden=Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
const porFecha=CIRCUITOS_BASE.map(c=>({c,n:filas.filter(p=>p.circ_id===c.id||p.circuito===c.nombre).length})).filter(x=>x.n>0);
const juevesSi=filas.filter(p=>p.jueves==="Sí").length;
const borrar=async(p)=>{
 if(!window.confirm("¿Borrar la preinscripción de "+(p.nombre+" "+p.apellido).trim()+"?"))return;
 setData(prev=>prev.filter(x=>(x.id||"")!==p.id));
 if(editId===p.id)setEditId(null);
 await syncSheets("inscripcion_delete",{id:p.id});
 setTimeout(cargar,1500);
};
const abrirEdit=p=>{setEditId(p.id);setEd({...p});};
const guardarEdit=async()=>{
 const p=ed,id=editId;
 setData(prev=>prev.map(x=>(x.id||"")===id?{...x,...p}:x));
 setEditId(null);
 await syncSheets("inscripcion_update",{id,nombre:p.nombre,apellido:p.apellido,dni:p.dni,nacimiento:p.nacimiento,provincia:p.provincia,localidad:p.localidad,domicilio:p.domicilio,telefono:p.telefono,telefono_acomp:p.telefono_acomp,email:p.email,categoria:p.categoria,numero:p.numero,marca:p.marca,modelo:p.modelo,equipo:p.equipo,sponsor:p.sponsor,jefe_equipo:p.jefe_equipo,pilotos_equipo:p.pilotos_equipo,carpa:p.carpa,circ_id:p.circ_id,circuito:p.circuito,jueves:p.jueves});
 setTimeout(cargar,1500);
};
const setCircEd=cid=>{const c=CIRCUITOS_BASE.find(x=>x.id===cid);setEd({...ed,circ_id:cid,circuito:c?c.nombre:""});};
const exportar=()=>{
 const S=";",BOM="\uFEFF";
 const cols=["Fecha Registro","Nombre","Apellido","DNI","Nacimiento","Provincia","Localidad","Domicilio","Teléfono","Teléfono Acompañante","Email","Categoría","N°","Marca","Modelo","Equipo","Sponsor","Jefe de Equipo","Pilotos Equipo","Carpa","Fecha","Entrena Jueves"];
 const rows=filas.map(p=>[p.fecha_registro,p.nombre,p.apellido,p.dni,p.nacimiento,p.provincia,p.localidad,p.domicilio,p.telefono,p.telefono_acomp,p.email,p.categoria,p.numero,p.marca,p.modelo,p.equipo,p.sponsor,p.jefe_equipo,p.pilotos_equipo,p.carpa,p.circuito,p.jueves].map(x=>(""+x).replace(/;/g,",")).join(S));
 const csv=BOM+["PREINSCRIPCIONES — GP3 SPORTS LATAM — CAV 2026",cols.join(S),...rows].join("\n");
 try{const b=new Blob([csv],{type:"text/csv;charset=utf-8;"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="GP3_Preinscripciones_"+HOY+".csv";document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){alert("Error al exportar");}
};
const fichaPDF=(p)=>{
 const w=window.open("","_blank");
 if(!w){alert("Permití las ventanas emergentes para generar la ficha.");return;}
 const fila=(l,v)=>'<tr><td class="l">'+l+'</td><td class="v">'+((v===undefined||v===null||v==="")?"—":v)+'</td></tr>';
 const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ficha '+p.nombre+' '+p.apellido+'</title>'+
 '<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;}'+
 'body{padding:34px 40px;color:#111;}'+
 '.top{height:6px;background:#6ACCE4;border-radius:3px;margin-bottom:18px;}'+
 '.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px;}'+
 '.hd .b{font-size:13px;letter-spacing:3px;color:#2e8fb8;font-weight:bold;}'+
 '.hd h1{font-size:22px;margin-top:4px;}'+
 '.hd .num{font-size:40px;font-weight:900;color:#6ACCE4;line-height:1;}'+
 '.hd .numl{font-size:10px;letter-spacing:2px;color:#888;text-align:right;}'+
 'h2{font-size:11px;letter-spacing:2px;color:#2e8fb8;text-transform:uppercase;margin:18px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px;}'+
 'table{width:100%;border-collapse:collapse;}'+
 'td{padding:6px 4px;font-size:13px;vertical-align:top;border-bottom:1px solid #eee;}'+
 'td.l{color:#888;width:42%;text-transform:uppercase;font-size:10px;letter-spacing:1px;padding-top:8px;}'+
 'td.v{font-weight:bold;}'+
 '.ft{margin-top:26px;font-size:10px;color:#999;letter-spacing:1px;border-top:1px solid #ddd;padding-top:10px;}'+
 '@media print{body{padding:20px 28px;}}</style></head><body>'+
 '<div class="top"></div>'+
 '<div class="hd"><div><div class="b">GP3 SPORTS LATAM · CAV 2026</div><h1>Ficha de Preinscripción</h1></div>'+
 '<div><div class="numl">N° MOTO</div><div class="num">'+(p.numero||"—")+'</div></div></div>'+
 '<h2>Piloto</h2><table>'+
 fila("Nombre",p.nombre)+fila("Apellido",p.apellido)+fila("DNI",p.dni)+fila("Fecha de nacimiento",p.nacimiento)+
 fila("Provincia",p.provincia)+fila("Localidad",p.localidad)+fila("Domicilio",p.domicilio)+
 fila("Teléfono",p.telefono)+fila("Teléfono acompañante",p.telefono_acomp)+fila("Email",p.email)+'</table>'+
 '<h2>Moto y competición</h2><table>'+
 fila("Categoría",p.categoria)+fila("N° de moto",p.numero)+fila("Marca",p.marca)+fila("Modelo",p.modelo)+
 fila("Equipo",p.equipo)+fila("Sponsor",p.sponsor)+'</table>'+
 '<h2>Equipo y logística</h2><table>'+
 fila("Jefe de equipo",p.jefe_equipo)+fila("Pilotos en el equipo",p.pilotos_equipo)+fila("Espacio de carpa",p.carpa)+'</table>'+
 '<h2>Fecha</h2><table>'+
 fila("Circuito",p.circuito)+fila("Entrena jueves",p.jueves)+fila("Registrado",p.fecha_registro)+'</table>'+
 '<div class="ft">GP3 SPORTS LATAM — Campeonato Argentino de Velocidad 2026 · Reserva de lugar sin costo</div>'+
 '<scr'+'ipt>window.onload=function(){window.print();};</scr'+'ipt></body></html>';
 w.document.write(html);w.document.close();
};
const lblColTd={padding:"9px 8px",fontSize:11,color:C.gray};
return(
<div style={{display:"flex",flexDirection:"column",gap:16}}>
 <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
   <CavLogo/>
   <div style={{lineHeight:1.1}}>
     <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,letterSpacing:-0.5}}>Preinscripciones</div>
     <div style={{fontSize:10,color:CAV,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>CAV 2026 · En vivo</div>
   </div>
   <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
     <Btn small color={C.green} onClick={abrirPagoManual}>💵 Cobro manual</Btn>
     <Btn small outline onClick={cargar}>↻ Actualizar</Btn>
     <Btn small color={C.green} onClick={exportar} disabled={filas.length===0}>⬇ Excel</Btn>
   </div>
 </div>
 {ts&&<div style={{fontSize:11,color:C.gray,marginTop:-8}}>Actualizado {ts.toLocaleTimeString("es-AR")}</div>}
 <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
   <span style={{fontSize:10,color:C.gray,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,marginRight:2}}>Fecha:</span>
   {[["todas","Todas"],...CIRCUITOS_BASE.map(c=>[c.id,c.num+" "+c.nombre])].map(([id,lbl])=>(<button key={id} onClick={()=>setFFecha(id)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1,border:`1px solid ${fFecha===id?CAV:C.border2}`,background:fFecha===id?CAV+"22":"transparent",color:fFecha===id?C.text:C.gray,whiteSpace:"nowrap"}}>{lbl}{id===eventoActivo?" ●":""}</button>))}
 </div>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
   <StatBox label={fFecha==="todas"?"Preinscritos (total)":"Preinscritos en esta fecha"} value={filas.length} color={CAV}/>
   <StatBox label="Categorías" value={catOrden.length} color={C.green}/>
   <StatBox label="Entrenan jueves" value={juevesSi} color={C.yellow}/>
   <StatBox label="Fechas con pilotos" value={porFecha.length} color={C.text}/>
 </div>
 {estado==="error"&&(<Card><div style={{padding:20,textAlign:"center",color:C.gray,fontSize:13}}>No se pudo leer las inscripciones todavía.<div style={{marginTop:10}}><Btn small outline onClick={cargar}>Reintentar</Btn></div></div></Card>)}
 {estado==="cargando"&&filas.length===0&&(<Card><div style={{padding:24,textAlign:"center",color:C.gray}}>Cargando inscripciones...</div></Card>)}
 {estado==="vacio"&&(<Card><div style={{padding:24,textAlign:"center",color:C.gray}}>Todavía no hay preinscripciones.</div></Card>)}
 {(filas.length>0||(inscVentas||[]).some(v=>v.insc_manual&&(fFecha==="todas"||v.circ_id===fFecha)))&&(()=>{const tc=tcApp||1400;const arsOf=v=>(v.moneda==="USD"?(v.total_monto||0)*tc:(v.total_monto||0));const pag=fil.map(p=>ventaDe(p)).filter(Boolean);const _enF=(inscVentas||[]).filter(v=>fFecha==="todas"||v.circ_id===fFecha);const _matched=new Set();fil.forEach(p=>{const vv=ventaDe(p);if(vv)_matched.add(vv.id);});const manuales=_enF.filter(v=>v.insc_manual&&!_matched.has(v.id));const totalARS=pag.reduce((s,v)=>s+arsOf(v),0)+manuales.reduce((s,v)=>s+arsOf(v),0);const pendientes=fil.length-pag.length;const porCatP={};fil.forEach(p=>{const v=ventaDe(p);if(v){const c=p.categoria||"—";if(!porCatP[c])porCatP[c]={n:0,ars:0};porCatP[c].n++;porCatP[c].ars+=arsOf(v);}});manuales.forEach(v=>{const c=v.categoria||"—";if(!porCatP[c])porCatP[c]={n:0,ars:0};porCatP[c].n++;porCatP[c].ars+=arsOf(v);});const cats=Object.entries(porCatP).sort((a,b)=>b[1].ars-a[1].ars);const pagTot=pag.length+manuales.length;const totPil=fil.length+manuales.length;return(
  <Card style={{borderColor:C.green+"55"}}>
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:C.green,borderRadius:2}}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text}}>💵 Inscripciones Pagadas {fFecha!=="todas"?"· "+(CIRCUITOS_BASE.find(c=>c.id===fFecha)?.nombre||""):"· Todas"}</span></div>
    <div style={{padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
      <StatBox label="Pagados" value={pagTot} color={C.green}/>
      <StatBox label="Pendientes de pago" value={pendientes} color={pendientes>0?C.orange:C.gray}/>
      <StatBox label="Recaudado (ARS)" value={"$ "+Math.round(totalARS).toLocaleString("es-AR")} color={C.green}/>
      <StatBox label="Total pilotos" value={totPil} color={CAV}/>
    </div>
{(pag.length>0||manuales.length>0)&&(<div style={{padding:"0 14px 14px"}}><DesglosePagos ventas={[...pag,...manuales]} tc={tc} titulo="💰 Inscripciones — cómo ingresó la plata"/></div>)}
   {cats.length>0&&(<div style={{padding:"0 14px 14px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>
      {cats.map(([c,o])=>(<div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 11px"}}><div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:12}}>{c}</div><div style={{fontSize:10,color:C.gray}}>{o.n} pagado(s)</div></div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:14}}>{"$ "+Math.round(o.ars).toLocaleString("es-AR")}</span></div>))}
    </div>)}
    {manuales.length>0&&(<div style={{padding:"0 14px 12px"}}><div style={{fontSize:11,color:C.gray,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>Incluye {manuales.length} cargado(s) manualmente — los ves en la <b style={{color:C.text}}>LISTA</b> (en naranja).</div></div>)}
  </Card>
 );})()}
 {(()=>{
   const insc=inscVentas||[];const tc=tcApp||1400;
   const enFecha=fFecha==="todas"?insc:insc.filter(v=>v.circ_id===fFecha);
   const matchedIds=new Set();filas.forEach(p=>{const vv=ventaDe(p);if(vv)matchedIds.add(vv.id);});
   const orfanos=enFecha.filter(v=>!matchedIds.has(v.id)&&!v.insc_manual);
   if(orfanos.length===0)return null;
   const totOrf=orfanos.reduce((s,v)=>s+(v.moneda==="USD"?(v.total_monto||0)*tc:(v.total_monto||0)),0);
   return(<Card style={{borderColor:C.orange}}>
     <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><div style={{width:3,height:16,background:C.orange,borderRadius:2}}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:C.orange}}>⚠️ Cobros sin preinscripción ({orfanos.length})</span><span style={{marginLeft:"auto",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.orange,fontSize:16}}>{"$ "+Math.round(totOrf).toLocaleString("es-AR")}</span></div>
     <div style={{padding:"10px 16px",fontSize:12,color:C.gray,lineHeight:1.5}}>Estos cobros quedaron <b>sueltos</b> (de pruebas, o de un piloto que editaste o borraste). <b style={{color:C.text}}>Administración los suma pero acá no aparecen</b> — por eso no cuadran los totales. Borralos para reconciliar.</div>
     <div style={{padding:"0 16px 14px",display:"flex",flexDirection:"column",gap:8}}>
       {orfanos.map(v=>(<div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:C.dark4,border:`1px solid ${C.orange}44`,borderRadius:8,padding:"9px 12px"}}>
         <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13}}>{v.piloto||"—"}</div><div style={{fontSize:11,color:C.gray}}>{v.categoria||"—"} · {(CIRCUITOS_BASE.find(c=>c.id===v.circ_id)?.nombre)||v.circ_id||"—"}</div></div>
         <div style={{display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
           <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:14}}>{fmtMon2(v.total_monto,v.moneda)}</span>
           <button onClick={()=>{const pin=prompt("PIN admin para borrar este cobro:");if(pin!==ADMIN_PIN){if(pin!=null)alert("PIN incorrecto");return;}if(!window.confirm("¿Borrar el cobro de "+(v.piloto||"—")+"?"))return;onBorrarVenta&&onBorrarVenta(v.id);}} style={{background:"transparent",border:"1px solid #cc1133",color:"#cc1133",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>🗑 Borrar</button>
         </div>
       </div>))}
     </div>
   </Card>);
 })()}
 {filas.length>0&&(
  <Card style={{borderColor:CAV+"55"}}>
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:CAV,borderRadius:2}}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text}}>Inscritos por Categoría</span></div>
    <div style={{padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
      {catOrden.length===0?<div style={{color:C.gray,fontSize:13}}>—</div>:catOrden.map(([k,n])=>(
        <div key={k} style={{background:C.dark4,border:`1px solid ${CAV}33`,borderTop:`2px solid ${CAV}`,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:13}}>{k}</span>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:CAV,fontSize:26,lineHeight:1}}>{n}</span>
        </div>
      ))}
    </div>
  </Card>
 )}
 {filas.length>0&&porFecha.length>0&&(
  <Card><CardHeader>Pilotos por Fecha</CardHeader><div style={{padding:12}}>
    {porFecha.map(({c,n})=>(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontWeight:700}}>{c.num} {c.nombre}</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,fontSize:18}}>{n}</span></div>))}
  </div></Card>
 )}
 {editId&&(
  <Card style={{borderColor:CAV}}>
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:CAV,borderRadius:2}}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text}}>Editar piloto</span></div>
    <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
      <div><label style={lblIn}>Nombre</label><Input value={ed.nombre||""} onChange={e=>setEd({...ed,nombre:e.target.value})}/></div>
      <div><label style={lblIn}>Apellido</label><Input value={ed.apellido||""} onChange={e=>setEd({...ed,apellido:e.target.value})}/></div>
      <div><label style={lblIn}>DNI</label><Input value={ed.dni||""} onChange={e=>setEd({...ed,dni:e.target.value})}/></div>
      <div><label style={lblIn}>Nacimiento</label><Input value={ed.nacimiento||""} onChange={e=>setEd({...ed,nacimiento:e.target.value})}/></div>
      <div><label style={lblIn}>Provincia</label><Input value={ed.provincia||""} onChange={e=>setEd({...ed,provincia:e.target.value})}/></div>
      <div><label style={lblIn}>Localidad</label><Input value={ed.localidad||""} onChange={e=>setEd({...ed,localidad:e.target.value})}/></div>
      <div><label style={lblIn}>Domicilio</label><Input value={ed.domicilio||""} onChange={e=>setEd({...ed,domicilio:e.target.value})}/></div>
      <div><label style={lblIn}>Teléfono</label><Input value={ed.telefono||""} onChange={e=>setEd({...ed,telefono:e.target.value})}/></div>
      <div><label style={lblIn}>Tel. acompañante</label><Input value={ed.telefono_acomp||""} onChange={e=>setEd({...ed,telefono_acomp:e.target.value})}/></div>
      <div><label style={lblIn}>Email</label><Input value={ed.email||""} onChange={e=>setEd({...ed,email:e.target.value})}/></div>
      <div><label style={lblIn}>Categoría</label><select style={selSt} value={ed.categoria||""} onChange={e=>setEd({...ed,categoria:e.target.value})}><option value="">—</option>{CATS.map(c=>(<option key={c}>{c}</option>))}</select></div>
      <div><label style={lblIn}>N° moto</label><Input value={ed.numero||""} onChange={e=>setEd({...ed,numero:e.target.value})}/></div>
      <div><label style={lblIn}>Marca</label><Input value={ed.marca||""} onChange={e=>setEd({...ed,marca:e.target.value})}/></div>
      <div><label style={lblIn}>Modelo</label><Input value={ed.modelo||""} onChange={e=>setEd({...ed,modelo:e.target.value})}/></div>
      <div><label style={lblIn}>Equipo</label><Input value={ed.equipo||""} onChange={e=>setEd({...ed,equipo:e.target.value})}/></div>
      <div><label style={lblIn}>Jefe de equipo</label><Input value={ed.jefe_equipo||""} onChange={e=>setEd({...ed,jefe_equipo:e.target.value})}/></div>
      <div><label style={lblIn}>Pilotos del equipo</label><Input value={ed.pilotos_equipo||""} onChange={e=>setEd({...ed,pilotos_equipo:e.target.value})}/></div>
      <div><label style={lblIn}>Espacio de carpa</label><Input value={ed.carpa||""} onChange={e=>setEd({...ed,carpa:e.target.value})}/></div>
      <div><label style={lblIn}>Fecha</label><select style={selSt} value={ed.circ_id||""} onChange={e=>setCircEd(e.target.value)}><option value="">—</option>{CIRCUITOS_BASE.map(c=>(<option key={c.id} value={c.id}>{c.num} {c.nombre}</option>))}</select></div>
      <div><label style={lblIn}>Entrena jueves</label>
        <div style={{display:"flex",gap:6}}>
          {["Sí","No"].map(v=>(<button key={v} onClick={()=>setEd({...ed,jueves:v})} style={{flex:1,padding:"9px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,border:`1px solid ${ed.jueves===v?CAV:C.border2}`,background:ed.jueves===v?CAV+"22":"transparent",color:ed.jueves===v?C.text:C.gray}}>{v}</button>))}
        </div>
      </div>
    </div>
    <div style={{padding:"0 16px 16px",display:"flex",gap:10}}>
      <Btn small color={C.green} onClick={guardarEdit}>✓ Guardar</Btn>
      <Btn small outline onClick={()=>setEditId(null)}>Cancelar</Btn>
    </div>
  </Card>
 )}
 {(filas.length>0||manualesPil.length>0)&&(
  <Card>
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <div style={{width:3,height:16,background:CAV,borderRadius:2}}/>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text}}>Lista — {fil.length+manualesPilF.length}</span>
      <Input placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:240,marginLeft:"auto"}}/>
    </div>
    <div style={{padding:12,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
        <thead><tr>{["N°","Piloto","Categoría","Moto","Fecha","Jue","Tel","Pago","Acciones"].map(h=>(<th key={h} style={{padding:"8px",textAlign:"left",fontSize:9,color:C.gray,letterSpacing:1,textTransform:"uppercase",borderBottom:`2px solid ${CAV}`,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
        <tbody>{fil.map((p,i)=>(<tr key={p.id||i} style={{borderBottom:`1px solid ${C.border}`,background:editId===p.id?CAV+"11":"transparent"}}>
          <td style={{padding:"9px 8px",fontFamily:"'Barlow Condensed',sans-serif",color:CAV,fontWeight:900}}>#{p.numero||"—"}</td>
          <td style={{padding:"9px 8px",fontWeight:700}}>{(p.nombre+" "+p.apellido).trim()||"—"}<div style={{fontSize:10,color:C.gray}}>{p.dni}{p.localidad?" · "+p.localidad:""}</div></td>
          <td style={{padding:"9px 8px"}}><Badge small color={CAV}>{p.categoria}</Badge></td>
          <td style={lblColTd}>{((p.marca||"")+" "+(p.modelo||"")).trim()||"—"}</td>
          <td style={lblColTd}>{p.circuito||"—"}</td>
          <td style={{padding:"9px 8px",fontSize:11,color:p.jueves==="Sí"?C.green:C.gray}}>{p.jueves||"—"}</td>
          <td style={{padding:"9px 8px"}}>{p.telefono?<a href={"https://wa.me/"+p.telefono.replace(/[^\d]/g,"")} target="_blank" rel="noreferrer" style={{color:C.green,textDecoration:"none",fontWeight:700}}>💬</a>:"—"}</td>
          <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>{(()=>{const v=ventaDe(p);if(v)return(<span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{display:"inline-flex",alignItems:"center",gap:4,color:C.green,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",fontSize:12}}>✓ Pagado<span style={{color:C.gray,fontWeight:600}}>{fmtMon2(v.total_monto,v.moneda)}</span></span><button onClick={()=>abrirPagoEdit(p,v)} title="Editar forma de pago" style={{padding:"3px 7px",background:"transparent",border:`1px solid ${C.orange}`,color:C.orange,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>✎ pago</button></span>);return(<button onClick={()=>abrirPago(p)} style={{padding:"5px 11px",background:C.green,border:"none",color:"#fff",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:800,letterSpacing:1}}>💵 Pagar</button>);})()}</td>
          <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
            <button onClick={()=>fichaPDF(p)} title="Ficha PDF" style={{padding:"5px 9px",marginRight:5,background:"transparent",border:`1px solid ${CAV}`,color:CAV,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>🖨 Ficha</button>
            <button onClick={()=>abrirEdit(p)} title="Editar" style={{padding:"5px 9px",marginRight:5,background:"transparent",border:`1px solid ${C.orange}`,color:C.orange,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>✏️</button>
            <button onClick={()=>borrar(p)} title="Borrar" style={{padding:"5px 9px",background:"transparent",border:"1px solid #cc1133",color:"#cc1133",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>🗑</button>
          </td>
        </tr>))}{manualesPilF.map((p)=>{const v=p._venta;return(<tr key={p.id} style={{borderBottom:`1px solid ${C.border}`,background:"rgba(239,108,0,.08)"}}>
          <td style={{padding:"9px 8px",fontFamily:"'Barlow Condensed',sans-serif",color:C.orange,fontWeight:900}}>#{p.numero||"—"}</td>
          <td style={{padding:"9px 8px",fontWeight:700}}>{p.nombre||"—"} <Badge small color={C.orange}>Manual</Badge><div style={{fontSize:10,color:C.gray}}>sin preinscripción</div></td>
          <td style={{padding:"9px 8px"}}><Badge small color={C.orange}>{p.categoria||"—"}</Badge></td>
          <td style={lblColTd}>—</td>
          <td style={lblColTd}>{p.circuito||"—"}</td>
          <td style={{padding:"9px 8px",fontSize:11,color:C.gray}}>—</td>
          <td style={{padding:"9px 8px",color:C.gray}}>—</td>
          <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{display:"inline-flex",alignItems:"center",gap:4,color:C.green,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",fontSize:12}}>✓ Pagado<span style={{color:C.gray,fontWeight:600}}>{fmtMon2(v.total_monto,v.moneda)}</span></span><button onClick={()=>abrirPagoEdit({nombre:p.nombre,apellido:"",categoria:p.categoria,numero:p.numero,circ_id:p.circ_id,__manual:true,email:p.email||""},v)} title="Editar forma de pago" style={{padding:"3px 7px",background:"transparent",border:`1px solid ${C.orange}`,color:C.orange,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>✎ pago</button></span></td>
          <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
            <button onClick={()=>fichaPDF(p)} title="Ficha PDF" style={{padding:"5px 9px",marginRight:5,background:"transparent",border:`1px solid ${CAV}`,color:CAV,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>🖨 Ficha</button>
            <button onClick={()=>{const pin=prompt("PIN admin para borrar este cobro:");if(pin!==ADMIN_PIN){if(pin!=null)alert("PIN incorrecto");return;}if(!window.confirm("¿Borrar el cobro de "+(p.nombre||"—")+"?"))return;onBorrarVenta&&onBorrarVenta(v.id);}} title="Borrar" style={{padding:"5px 9px",background:"transparent",border:"1px solid #cc1133",color:"#cc1133",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>🗑</button>
          </td>
        </tr>);})}</tbody>
      </table>
    </div>
  </Card>
 )}
 {pagar&&(()=>{const efCat=manualMode?(manualPil.categoria||""):(pagar.categoria||"");const a=ARA[efCat]||{valor:0,moneda:"ARS"};const nom=manualMode?((manualPil.nombre||"").trim()||"Piloto manual"):(((pagar.nombre||"")+" "+(pagar.apellido||"")).trim()||"—");const metodos=[["efectivo_ars","Efectivo $"],["efectivo_usd","Efectivo USD"],["transferencia","Transferencia"],["debito","Débito/Crédito"],["mercadopago","MercadoPago"]];return(
   <div onClick={()=>setPagar(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
     <div onClick={e=>e.stopPropagation()} style={{background:C.dark2,border:`1px solid ${C.border}`,borderRadius:14,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.4)"}}>
       <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
         <div style={{width:3,height:18,background:C.green,borderRadius:2}}/>
         <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>{pagoEdit?"✏️ Editar Pago":"💵 Cobrar Inscripción"}</span>
         <button onClick={()=>setPagar(null)} style={{marginLeft:"auto",background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
       </div>
       <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
         {!pagoEdit&&(<div style={{display:"flex",alignItems:"center",gap:8,background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px"}}>
           <span style={{fontSize:12,color:C.gray,fontWeight:600}}>Piloto:</span>
           <div style={{marginLeft:"auto",display:"flex",gap:6}}>
             <button onClick={()=>!pagar.__manual&&setManualMode(false)} disabled={pagar.__manual} style={{padding:"5px 10px",borderRadius:7,cursor:pagar.__manual?"not-allowed":"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${!manualMode?C.green:C.border2}`,background:!manualMode?"rgba(0,168,132,.12)":"transparent",color:!manualMode?C.green:C.gray,opacity:pagar.__manual?.45:1}}>Preinscrito</button>
             <button onClick={()=>setManualMode(true)} style={{padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${manualMode?C.orange:C.border2}`,background:manualMode?"rgba(239,108,0,.12)":"transparent",color:manualMode?C.orange:C.gray}}>Sin preinscripción</button>
           </div>
         </div>)}
         {manualMode?(
           <div style={{background:C.dark4,border:`1px solid ${C.orange}44`,borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
             <div style={{fontSize:11,color:C.orange,fontWeight:700,letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif"}}>PILOTO MANUAL (sin preinscripción)</div>
             <div style={{position:"relative"}}>
               <label style={lblIn}>Nombre y apellido</label>
               <Input value={pilQ} placeholder="Buscá o escribí un nombre nuevo" onChange={e=>{setPilQ(e.target.value);setManualPil(m=>({...m,nombre:e.target.value}));setShowPilSug(true);}} onFocus={()=>setShowPilSug(true)} onBlur={()=>setTimeout(()=>setShowPilSug(false),180)}/>
               {showPilSug&&pilQ.trim()&&(<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:30,background:C.dark2,border:`1px solid ${C.border2}`,borderRadius:8,marginTop:2,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>
                 {sugPilotos.map((s,i)=>(<div key={i} onMouseDown={()=>selSugPiloto(s)} style={{padding:"8px 11px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,fontSize:13}}><b>{s.nombre}</b> <span style={{color:C.gray,fontSize:11}}>· #{s.num||"—"} · {s.cat||"—"}</span>{s._full&&<span style={{color:C.green,fontSize:10,fontWeight:700,marginLeft:6,fontFamily:"'Barlow Condensed',sans-serif"}}>✓ FICHA COMPLETA</span>}</div>))}
                 {!sugPilotos.some(s=>(s.nombre||"").trim().toLowerCase()===pilQ.trim().toLowerCase())&&(<div onMouseDown={()=>{setManualPil(m=>({...m,nombre:pilQ.trim()}));setShowPilSug(false);}} style={{padding:"9px 11px",cursor:"pointer",fontSize:13,color:C.orange,fontWeight:700}}>➕ Agregar "{pilQ.trim()}" como piloto nuevo</div>)}
               </div>)}
             </div>
             <div style={{display:"grid",gridTemplateColumns:"1fr 84px",gap:8}}>
               <div><label style={lblIn}>Categoría</label><Select value={manualPil.categoria} onChange={e=>setManualCat(e.target.value)} style={{padding:"9px 10px",fontSize:13}}><option value="">Elegí...</option>{CATS.map(c=>(<option key={c} value={c}>{c}</option>))}</Select></div>
               <div><label style={lblIn}>N°</label><Input value={manualPil.numero} placeholder="#" onChange={e=>setManualPil(m=>({...m,numero:e.target.value}))}/></div>
             </div>
             <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginTop:2}}><input type="checkbox" checked={datosCompletos} onChange={e=>setDatosCompletos(e.target.checked)}/><span style={{fontSize:12,color:C.text,fontWeight:700}}>➕ Cargar datos completos (lo registra como preinscripción)</span></label>
             {datosCompletos&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
               <div><label style={lblIn}>Apellido</label><Input value={pilFull.apellido} onChange={e=>setPF("apellido",e.target.value)}/></div>
               <div><label style={lblIn}>DNI</label><Input value={pilFull.dni} onChange={e=>setPF("dni",e.target.value)}/></div>
               <div><label style={lblIn}>Nacimiento</label><Input value={pilFull.nacimiento} placeholder="DD/MM/AAAA" onChange={e=>setPF("nacimiento",e.target.value)}/></div>
               <div><label style={lblIn}>Provincia</label><Input value={pilFull.provincia} onChange={e=>setPF("provincia",e.target.value)}/></div>
               <div><label style={lblIn}>Localidad</label><Input value={pilFull.localidad} onChange={e=>setPF("localidad",e.target.value)}/></div>
               <div><label style={lblIn}>Domicilio</label><Input value={pilFull.domicilio} onChange={e=>setPF("domicilio",e.target.value)}/></div>
               <div><label style={lblIn}>Tel / WhatsApp</label><Input value={pilFull.telefono} onChange={e=>setPF("telefono",e.target.value)}/></div>
               <div><label style={lblIn}>Tel. emergencia</label><Input value={pilFull.telefono_acomp} onChange={e=>setPF("telefono_acomp",e.target.value)}/></div>
               <div style={{gridColumn:"1 / -1"}}><label style={lblIn}>Email</label><Input value={pilFull.email} onChange={e=>setPF("email",e.target.value)}/></div>
               <div><label style={lblIn}>Marca moto</label><Input value={pilFull.marca} onChange={e=>setPF("marca",e.target.value)}/></div>
               <div><label style={lblIn}>Modelo moto</label><Input value={pilFull.modelo} onChange={e=>setPF("modelo",e.target.value)}/></div>
               <div><label style={lblIn}>Equipo</label><Input value={pilFull.equipo} onChange={e=>setPF("equipo",e.target.value)}/></div>
               <div><label style={lblIn}>Sponsor</label><Input value={pilFull.sponsor} onChange={e=>setPF("sponsor",e.target.value)}/></div>
               <div><label style={lblIn}>Jefe de equipo</label><Input value={pilFull.jefe_equipo} onChange={e=>setPF("jefe_equipo",e.target.value)}/></div>
               <div><label style={lblIn}>Carpa</label><Input value={pilFull.carpa} onChange={e=>setPF("carpa",e.target.value)}/></div>
               {(()=>{const _evt=(pagar&&pagar.circ_id)||eventoActivo;const _c=CIRCUITOS_BASE.find(c=>c.id===_evt)||{};return _c.sinJueves?(
                 <div style={{gridColumn:"1 / -1"}}><label style={lblIn}>¿Entrena jueves?</label><div style={{padding:"9px 11px",borderRadius:8,border:`1px solid ${C.border2}`,background:C.dark2,color:C.gray,fontSize:12,fontWeight:600}}>🚫 Sin entrenamiento de jueves en {_c.nombre||"este evento"}</div></div>
               ):(
                 <div style={{gridColumn:"1 / -1"}}><label style={lblIn}>¿Entrena jueves?</label><div style={{display:"flex",gap:6}}><button onClick={()=>setPF("jueves","Sí")} style={{flex:1,padding:"8px",borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${pilFull.jueves==="Sí"?C.green:C.border2}`,background:pilFull.jueves==="Sí"?"rgba(0,168,132,.12)":"transparent",color:pilFull.jueves==="Sí"?C.green:C.gray}}>Sí</button><button onClick={()=>setPF("jueves","No")} style={{flex:1,padding:"8px",borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${pilFull.jueves==="No"?C.red:C.border2}`,background:pilFull.jueves==="No"?"rgba(204,17,51,.12)":"transparent",color:pilFull.jueves==="No"?C.red:C.gray}}>No</button></div></div>
               );})()}
             </div>)}
           </div>
         ):(
         <div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
           {(()=>{const _id=fotoIdDe(pagar);const _src=fotoSrc(pagar);return(
             <div style={{flexShrink:0,textAlign:"center"}}>
               <div style={{width:92,height:92,borderRadius:10,overflow:"hidden",background:C.dark2,border:`1px solid ${C.border2}`,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                 {_src?(<img key={_src} src={_src} alt="Foto del piloto" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 28%"}} onError={e=>{e.currentTarget.style.display="none";const ph=e.currentTarget.parentNode.querySelector("[data-ph]");if(ph)ph.style.display="flex";}}/>):null}
                 <div data-ph style={{display:_src?"none":"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:"100%",height:"100%",color:C.gray2,gap:2}}>
                   <span style={{fontSize:26}}>👤</span><span style={{fontSize:10,fontWeight:700}}>Sin foto</span>
                 </div>
               </div>
               <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"center"}}>
                 <button onClick={cambiarFotoClick} disabled={!_id||fotoEstado==="subiendo"} style={{padding:"4px 8px",borderRadius:6,cursor:_id?"pointer":"not-allowed",fontSize:10,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,letterSpacing:.5,border:`1px solid ${C.green}`,background:"rgba(0,168,132,.10)",color:C.green,opacity:_id?1:.5}}>{fotoEstado==="subiendo"?"…":"📷 Cambiar"}</button>
                 <button onClick={()=>borrarFoto(pagar)} disabled={!_id||fotoEstado==="subiendo"} title="Borrar foto" style={{padding:"4px 8px",borderRadius:6,cursor:_id?"pointer":"not-allowed",fontSize:10,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,border:`1px solid ${C.border2}`,background:"transparent",color:C.gray,opacity:_id?1:.5}}>🗑</button>
               </div>
               <input ref={fotoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>subirFoto(e,pagar)}/>
               {!_id&&<div style={{fontSize:9,color:C.orange,marginTop:3,maxWidth:92,lineHeight:1.2}}>Falta DNI para la foto</div>}
             </div>
           );})()}
           <div style={{flex:1,minWidth:0}}>
           <div style={{fontSize:17,fontWeight:800}}>{nom}</div>
           <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6,alignItems:"center"}}>
             <Badge small color={CAV}>{pagar.categoria||"—"}</Badge>
             <span style={{fontSize:12,color:C.gray}}>#{pagar.numero||"—"}</span>
             <span style={{fontSize:12,color:C.gray}}>· {pagar.circuito||(CIRCUITOS_BASE.find(c=>c.id===eventoActivo)?.nombre)||"—"}</span>
           </div>
           <div style={{fontSize:11,color:C.gray,marginTop:6}}>Verificá que la foto sea de este piloto. Podés cambiarla o borrarla.</div>
           </div>
          </div>
           {(()=>{const campos=[["DNI",pagar.dni],["Nacimiento",pagar.nacimiento],["Provincia",pagar.provincia],["Localidad",pagar.localidad],["Domicilio",pagar.domicilio],["Tel / WhatsApp",pagar.telefono],["Tel. emergencia",pagar.telefono_acomp],["Email",pagar.email],["Moto",((pagar.marca||"")+" "+(pagar.modelo||"")).trim()],["Equipo",pagar.equipo],["Sponsor",pagar.sponsor],["Jefe de equipo",pagar.jefe_equipo],["Carpa",pagar.carpa],["Entrena jueves",pagar.jueves]].filter(c=>c[1]&&(""+c[1]).trim());return campos.length?(
             <div style={{marginTop:10,paddingTop:10,borderTop:`1px dashed ${C.border2}`,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px"}}>
               {campos.map(([k,v],i)=>(<div key={i} style={{minWidth:0}}><div style={{fontSize:9,color:C.gray2,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif"}}>{k}</div><div style={{fontSize:12,fontWeight:600,color:C.text,wordBreak:"break-word"}}>{v}</div></div>))}
             </div>):null;})()}
         </div>
         )}
         <div style={{background:"rgba(0,168,132,.06)",border:`1px solid ${C.green}44`,borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
             <span style={{fontSize:12,color:C.gray,fontWeight:700}}>{precioManualOn?"Precio manual":("Arancel "+(efCat||"la categoría"))}{cat2On?" · 1ª cat.":""}</span>
             {!precioManualOn&&<span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:20}}>{fmtMon2(precioBase||0,pTarget.moneda)}</span>}
           </div>
           {precioManualOn&&(<div style={{display:"grid",gridTemplateColumns:"1fr 86px",gap:8,alignItems:"center"}}>
             <NumInput value={precioBase} color={pTarget.moneda==="USD"?C.green:C.yellow} onChange={v=>setPrecioBase(v)}/>
             <button onClick={togglePTargetMoneda} style={{padding:"10px 4px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:800,border:`1px solid ${pTarget.moneda==="USD"?C.green:C.yellow}`,background:(pTarget.moneda==="USD"?C.green:C.yellow)+"22",color:pTarget.moneda==="USD"?C.green:C.yellow}}>{pTarget.moneda==="USD"?"USD":"$ ARS"}</button>
           </div>)}
           <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" checked={precioManualOn} onChange={togglePrecioManual}/><span style={{fontSize:12,color:C.text,fontWeight:600}}>Precio manual (ej. 2ª categoría más barata)</span></label>
         </div>
         {!precioManualOn&&(!a||!a.valor)&&<div style={{fontSize:11,color:C.orange,fontWeight:600}}>⚠️ Esta categoría no tiene arancel cargado. Definilo en ⚙️ Gestión → Aranceles, o usá "Precio manual".</div>}
         <div style={{background:C.dark4,border:`1px solid ${cat2On?CAV:C.border}`,borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
           <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" checked={cat2On} onChange={e=>{setCat2On(e.target.checked);if(!e.target.checked){setCat2Cat("");setCat2Val(0);}}}/><span style={{fontSize:12,color:C.text,fontWeight:700}}>➕ Corre también en 2ª categoría</span></label>
           {cat2On&&<div><label style={lblIn}>Categoría adicional</label><Select value={cat2Cat} onChange={e=>setCat2Categoria(e.target.value)} style={{padding:"9px 10px",fontSize:13}}><option value="">Elegí...</option>{CATS.map(c=>(<option key={c} value={c}>{c}</option>))}</Select></div>}
           {cat2On&&<div><label style={lblIn}>Valor 2ª categoría ({pTarget.moneda}) — editable</label><NumInput value={cat2Val} color={pTarget.moneda==="USD"?C.green:C.yellow} onChange={v=>setCat2Val(v)}/></div>}
         </div>
         {cat2On&&(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,168,132,.08)",border:`1px solid ${C.green}55`,borderRadius:10,padding:"10px 14px"}}>
           <span style={{fontSize:12,color:C.gray,fontWeight:700}}>Total a cobrar (1ª + 2ª)</span>
           <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:20}}>{fmtMon2(pTarget.total||0,pTarget.moneda)}</span>
         </div>)}
         <div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
           <div style={{fontSize:11,color:C.gray,fontWeight:700,letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif"}}>🎟 PULSERAS</div>
           <div><label style={lblIn}>N° pulsera del piloto</label><Input value={pulseraPiloto} placeholder="Ej. 123" onChange={e=>setPulseraPiloto(e.target.value)}/></div>
           <div>
             <label style={lblIn}>Pulseras de acompañantes</label>
             <div style={{display:"flex",flexDirection:"column",gap:6}}>
               {pulserasAcomp.map((x,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 26px",gap:6,alignItems:"center"}}><Input value={x} placeholder={"N° acompañante "+(i+1)} onChange={e=>setAcomp(i,e.target.value)}/><button onClick={()=>delAcomp(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button></div>))}
             </div>
             <button onClick={addAcomp} style={{marginTop:6,width:"100%",padding:"7px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,border:`1px dashed ${C.border2}`,background:"transparent",color:C.gray}}>+ Agregar acompañante</button>
           </div>
         </div>
      {/* ===== Acompañantes con pase QR (acreditaciones) ===== */}
      <div style={{background:C.dark4,border:"1px solid "+C.border,borderRadius:10,padding:"12px 14px",marginTop:10}}>
        <div style={{fontSize:11,color:C.gray,fontWeight:700,letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",marginBottom:4}}>Acompañantes — pase QR por email al pagar</div>
        {!acredKey(pagar) ? (
          <div style={{fontSize:11,color:C.gray}}>Disponible para pilotos preinscritos (con DNI y fecha).</div>
        ) : !acredCargado ? (
          <div style={{fontSize:11,color:acredMsg?"#cc1133":C.gray}}>{acredMsg||"Cargando acompañantes…"}</div>
        ) : (
          <div>
            <div style={{fontSize:10,color:C.gray,marginBottom:8}}>Hasta 3 mecánicos, 5 sponsors y 5 invitados. Se cargan acá o en la preinscripción del piloto.</div>
            {acredList.map((a,i)=>(
              <div key={a.id} style={{border:"1px solid "+C.border2,borderRadius:8,padding:8,paddingRight:26,marginBottom:6,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,position:"relative"}}>
                <select value={a.tipo||"invitado"} onChange={e=>acredSet(i,"tipo",e.target.value)} style={{padding:"6px",borderRadius:6,border:"1px solid "+C.border2}}>
                  <option value="invitado">Invitado</option>
                  <option value="mecanico">Mecánico</option>
                  <option value="sponsor">Sponsor propio</option>
                </select>
                <input type="date" value={a.nacimiento||""} onChange={e=>acredSet(i,"nacimiento",e.target.value)} style={{padding:"6px",borderRadius:6,border:"1px solid "+C.border2}}/>
                <input value={a.nombre||""} placeholder="Nombre" onChange={e=>acredSet(i,"nombre",e.target.value)} style={{padding:"6px",borderRadius:6,border:"1px solid "+C.border2}}/>
                <input value={a.apellido||""} placeholder="Apellido" onChange={e=>acredSet(i,"apellido",e.target.value)} style={{padding:"6px",borderRadius:6,border:"1px solid "+C.border2}}/>
                <input type="email" value={a.email||""} placeholder="Email (ahí llega su pase QR)" onChange={e=>acredSet(i,"email",e.target.value)} style={{gridColumn:"1 / span 2",padding:"6px",borderRadius:6,border:"1px solid "+C.border2}}/>
                <button onClick={()=>acredDel(i)} style={{position:"absolute",top:0,right:0,background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:16,padding:"6px 8px"}}>×</button>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              <button onClick={acredAdd} style={{padding:"7px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,border:"1px dashed "+C.border2,background:"transparent",color:C.gray}}>+ Agregar</button>
              <button onClick={acredGuardar} style={{padding:"7px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,border:"none",background:C.green,color:"#fff"}}>Guardar acompañantes</button>
            </div>
            {acredMsg ? <div style={{fontSize:11,color:acredMsg.indexOf("✓")===0?C.green:"#cc1133",marginTop:6}}>{acredMsg}</div> : null}
          </div>
        )}
      </div>
         <div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
           <div style={{display:"flex",alignItems:"center",gap:8}}>
             <span style={{fontSize:11,color:C.gray,fontWeight:700,letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif"}}>COMPROBANTE</span>
             <div style={{marginLeft:"auto",display:"flex",gap:6}}>
               <button onClick={()=>setPFactura("CF")} style={{padding:"5px 11px",borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${pFactura==="CF"?C.green:C.border2}`,background:pFactura==="CF"?"rgba(0,168,132,.12)":"transparent",color:pFactura==="CF"?C.green:C.gray}}>Consumidor final</button>
               <button onClick={()=>setPFactura("FAC")} style={{padding:"5px 11px",borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${pFactura==="FAC"?CAV:C.border2}`,background:pFactura==="FAC"?CAV+"22":"transparent",color:pFactura==="FAC"?C.text:C.gray}}>Factura</button>
             </div>
           </div>
           {pFactura==="FAC"&&(<div><label style={lblIn}>CUIT</label><Input value={pCuit} placeholder="30-XXXXXXXX-X" onChange={e=>setPCuit(e.target.value)}/></div>)}
         </div>
         <div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
           <div style={{fontSize:11,color:C.gray,fontWeight:700,letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif"}}>📝 COMENTARIO</div>
           <textarea value={comentario} onChange={e=>setComentario(e.target.value)} placeholder="Cualquier detalle de esta inscripción (opcional)…" rows={2} style={{background:C.dark2,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 11px",fontSize:13,fontFamily:"'Barlow',sans-serif",outline:"none",resize:"vertical",width:"100%",boxSizing:"border-box"}}/>
         </div>
         <div>
           <label style={lblIn}>Forma{pagos.length>1?"s":""} de pago {pagos.length>1?"— dividido":""}</label>
           <div style={{fontSize:11,color:C.gray,lineHeight:1.4,marginBottom:8}}>Si paga de varias formas (efectivo + transferencia, o USD + ARS), agregá más líneas. El botón de moneda convierte solo con tu dólar (TC {Math.round(tcApp||1400).toLocaleString("es-AR")}).</div>
           <div style={{display:"flex",flexDirection:"column",gap:6}}>
             {pagos.map((p,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 58px 1fr 24px",gap:6,alignItems:"center"}}>
               <Select value={p.metodo} onChange={e=>setPagoL(i,{metodo:e.target.value})} style={{padding:"9px 8px",fontSize:12}}>
                 {metodos.map(([id,lbl])=>(<option key={id} value={id}>{lbl}</option>))}
               </Select>
               <button onClick={()=>togglePagoL(i,p)} style={{padding:"9px 2px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:800,border:`1px solid ${p.moneda==="USD"?C.green:C.yellow}`,background:(p.moneda==="USD"?C.green:C.yellow)+"22",color:p.moneda==="USD"?C.green:C.yellow}}>{p.moneda==="USD"?"USD":"ARS"}</button>
               <NumInput value={p.monto} color={p.moneda==="USD"?C.green:C.yellow} onChange={v=>setPagoL(i,{monto:v})}/>
               {pagos.length>1?<button onClick={()=>delPagoL(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button>:<span/>}
             </div>))}
           </div>
           <button onClick={addPagoL} style={{marginTop:8,width:"100%",padding:"8px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,border:`1px dashed ${C.border2}`,background:"transparent",color:C.gray}}>+ Agregar forma de pago</button>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 11px",marginTop:8,borderRadius:8,background:pOk?"rgba(0,168,132,.1)":pFalta>0?C.dark4:"rgba(239,108,0,.1)",border:`1px solid ${pOk?C.green:pFalta>0?C.border:C.orange}`}}>
             <span style={{fontSize:12,color:C.gray}}>Total: <b style={{color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtMon2(pTarget.total,pTarget.moneda)}</b></span>
             <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:14,color:pOk?C.green:pFalta>0?C.orange:C.red}}>{pTarget.total<=0?(pCub>0?"✓ Listo":"Ingresá monto"):pOk?"✓ Cubierto":pFalta>0?("Falta "+fmtMon2(Math.abs(pFalta),pTarget.moneda)):("Sobra "+fmtMon2(Math.abs(pFalta),pTarget.moneda))}</span>
           </div>
           {pagos.some(p=>p.moneda!==pTarget.moneda)&&<div style={{fontSize:10,color:C.gray,marginTop:5}}>Convertido a {pTarget.moneda} con TC {Math.round(tcApp||1400).toLocaleString("es-AR")} (configurable en Administración).</div>}
         </div>
         <Btn full color={C.green} onClick={confirmarPago} disabled={!pOk}>{pagoEdit?"✓ Guardar cambios del pago":"✓ Confirmar Pago — "+fmtMon2(pTarget.total>0?pTarget.total:pCub,pTarget.moneda)}</Btn>
         <div style={{fontSize:10,color:C.gray,textAlign:"center"}}>Queda registrado y entra solo al consolidado de la fecha y al live.</div>
       </div>
     </div>
   </div>
 );})()}
</div>
);
}

function AdminPanel({ventas,cierres,costosNeu,eventoActivo}){
const [adm,setAdmRaw]=useState(()=>{
 const s=lsGet("gp3_admin",null);
 if(!s)return ADMIN_DEFAULT;
 return {...ADMIN_DEFAULT,...s,estructura:s.estructura||ADMIN_DEFAULT.estructura,fechas:{...ADMIN_DEFAULT.fechas,...(s.fechas||{})}};
});
const [admEstado,setAdmEstado]=useState("idle");
const [admSavedAt,setAdmSavedAt]=useState(null);
const setAdm=v=>{const withTs={...v,_ts:Date.now()};lsSet("gp3_admin",withTs);setAdmRaw(withTs);setAdmEstado("idle");};
const guardarAhora=async()=>{
  setAdmEstado("guardando");
  const withTs={...adm,_ts:Date.now()};
  lsSet("gp3_admin",withTs);setAdmRaw(withTs);
  const r=await guardarConfigVerificado("admin_json",withTs);
  if(r.ok){setAdmEstado("ok");setAdmSavedAt(new Date());}else{setAdmEstado("error");}
};
const adjuntarComprobante=(s,i,it,ev)=>{const file=ev.target.files&&ev.target.files[0];if(!file)return;if(file.size>6*1024*1024){alert("El archivo es muy grande (máx 6 MB).");ev.target.value="";return;}const id="cmp_"+Date.now()+"_"+Math.floor(Math.random()*1000);const reader=new FileReader();reader.onload=()=>{const dataB64=String(reader.result).split(",")[1]||"";setCosto(s,i,{comprobante:{id,name:file.name,estado:"subiendo"}});syncSheets("upload_comprobante",{id,fecha:s,item_id:it.id||"",nombre:file.name,mime:file.type||"application/octet-stream",dataB64});};reader.readAsDataURL(file);ev.target.value="";};
useEffect(()=>{let pend=false;Object.values(adm.fechas||{}).forEach(r=>{(r.costos||[]).forEach(c=>{if(c&&c.comprobante&&c.comprobante.estado==="subiendo")pend=true;});});if(!pend)return;const t=setInterval(async()=>{try{const res=await fetch(withKey(SHEETS_URL+"?tipo=comprobantes&t="+Date.now()));const json=await res.json();if(!json||!json.comprobantes)return;const byId={};json.comprobantes.forEach(c=>{byId[c.id]=c.link;});let changed=false;const nf=JSON.parse(JSON.stringify(adm.fechas||{}));Object.keys(nf).forEach(k=>{(nf[k].costos||[]).forEach(c=>{if(c&&c.comprobante&&c.comprobante.estado==="subiendo"&&byId[c.comprobante.id]){c.comprobante={id:c.comprobante.id,name:c.comprobante.name,url:byId[c.comprobante.id],estado:"listo"};changed=true;}});});if(changed)setAdm({...adm,fechas:nf});}catch(e){}},5000);return ()=>clearInterval(t);},[adm]);
useEffect(()=>{(async()=>{try{
 const res=await fetch(withKey(SHEETS_URL+"?t="+Date.now()));
 const json=await res.json();
 if(!json||!json.ok)return;
 let remote=null;
 if(json.config&&json.config.admin_json){try{remote=JSON.parse(json.config.admin_json);}catch(e){}}
 const localRaw=lsGet("gp3_admin",null);
 if(remote&&(!localRaw||((remote._ts||0)>(localRaw._ts||0)))){
   const merged={...ADMIN_DEFAULT,...remote,estructura:remote.estructura||ADMIN_DEFAULT.estructura,fechas:{...ADMIN_DEFAULT.fechas,...(remote.fechas||{})}};
   lsSet("gp3_admin",merged);setAdmRaw(merged);setAdmEstado("ok");setAdmSavedAt(new Date());
 }else if(localRaw){
   // Había una edición local más nueva que la del servidor (por ejemplo, quedó pendiente de una sesión
   // anterior): la reintenta y recién marca "guardado" si el servidor la confirma de verdad.
   const withTs={...localRaw,_ts:localRaw._ts||Date.now()};
   const r=await guardarConfigVerificado("admin_json",withTs);
   if(r.ok){setAdmEstado("ok");setAdmSavedAt(new Date());}else{setAdmEstado("error");}
 }
}catch(e){}})();},[]);
const [sub,setSub]=useState(eventoActivo||"f1");
useEffect(()=>{if(eventoActivo)setSub(eventoActivo);},[eventoActivo]);
const [cartolaPaste,setCartolaPaste]=useState("");
const tc=adm.tc||1400;
const ivaPct=adm.iva||21;
const fmtA=n=>"$ "+Math.round(n||0).toLocaleString("es-AR");

const costoUnit=pid=>{const c=costosNeu&&costosNeu[pid];if(!c)return 0;return c.moneda==="USD"?(c.valor||0)*tc:(c.valor||0);};
const esFacturado=m=>{m=(""+(m||"")).toLowerCase();if(m.includes("transfer"))return true;if(m.includes("efectivo")||m.includes("dolar")||m==="usd"||m.includes("vip"))return false;if(m.includes("debito")||m.includes("credito")||m.includes("mercado")||m.includes("post")||m.includes("tarjeta"))return true;return false;};
const facturaSplit=circId=>{
 const arr=[...ventas.filter(v=>v.circ_id===circId)];
 cierres.forEach(c=>{if(c.circ_id===circId&&Array.isArray(c.ventas))arr.push(...c.ventas);});
 let fact=0,nofact=0;const detFact={},detNoFact={};
 arr.forEach(v=>{getPagos(v).forEach(p=>{const ars=p.moneda==="USD"?(p.monto||0)*tc:(p.monto||0);if(ars<=0)return;const tv=v.tipo_venta||"neumatico";if(esFacturado(p.metodo)){fact+=ars;detFact[tv]=(detFact[tv]||0)+ars;}else{nofact+=ars;detNoFact[tv]=(detNoFact[tv]||0)+ars;}});});
 return{fact,nofact,detFact,detNoFact};
};
const tireAuto=circId=>{
 const arr=[...ventas.filter(v=>v.circ_id===circId&&(!v.tipo_venta||v.tipo_venta==="neumatico"))];
 cierres.forEach(c=>{if(c.circ_id===circId&&Array.isArray(c.ventas))arr.push(...c.ventas.filter(v=>!v.tipo_venta||v.tipo_venta==="neumatico"));});
 let ventaBruta=0,costo=0,unidades=0;
 arr.forEach(v=>{const fx=v.moneda==="USD"?tc:1;(v.items||[]).forEach(it=>{ventaBruta+=(it.total||0)*fx;costo+=(it.cantidad||0)*costoUnit(it.prod_id);unidades+=(it.cantidad||0);});});
 const div=1+ivaPct/100;
 const venta=Math.round(ventaBruta/div);
 return{venta,ventaBruta,costo,unidades};
};
const entradasAuto=circId=>{
 const arr=[...ventas.filter(v=>v.circ_id===circId&&v.tipo_venta==="entrada")];
 cierres.forEach(c=>{if(c.circ_id===circId&&Array.isArray(c.ventas))arr.push(...c.ventas.filter(v=>v.tipo_venta==="entrada"));});
 let bruto=0,unidades=0;const porMetodo={};
 arr.forEach(v=>{const fx=v.moneda==="USD"?tc:1;bruto+=(v.total_monto||0)*fx;unidades+=(v.total_unidades||0);getPagos(v).forEach(p=>{const m=p.metodo||"otro";porMetodo[m]=(porMetodo[m]||0)+(p.moneda==="USD"?(p.monto||0)*tc:(p.monto||0));});});
 return{bruto,neto:Math.round(bruto/(1+ivaPct/100)),unidades,porMetodo,cantVentas:arr.length};
};
const inscripcionAuto=circId=>{
 const arr=[...ventas.filter(v=>v.circ_id===circId&&v.tipo_venta==="inscripcion")];
 cierres.forEach(c=>{if(c.circ_id===circId&&Array.isArray(c.ventas))arr.push(...c.ventas.filter(v=>v.tipo_venta==="inscripcion"));});
 let bruto=0;const porMetodo={};
 arr.forEach(v=>{const fx=v.moneda==="USD"?tc:1;bruto+=(v.total_monto||0)*fx;getPagos(v).forEach(p=>{const m=p.metodo||"otro";porMetodo[m]=(porMetodo[m]||0)+(p.moneda==="USD"?(p.monto||0)*tc:(p.monto||0));});});
 return{bruto,neto:Math.round(bruto/(1+ivaPct/100)),cantVentas:arr.length,porMetodo};
};

const calc=fId=>{
 const f=adm.fechas[fId];
 if(!f)return null;
 const div=1+ivaPct/100;
 const netVal=it=>(f.ivaMode==="con_iva"&&it.factura)?Math.round(it.valor/div):(it.valor||0);
 const costos=f.costos||[];
 const costoCarrera=costos.reduce((s,it)=>s+netVal(it),0);
 const docu=costos.filter(it=>it.factura).reduce((s,it)=>s+netVal(it),0);
 const docuBruto=costos.filter(it=>it.factura).reduce((s,it)=>s+(it.valor||0),0);
 const negro=costos.filter(it=>!it.factura).reduce((s,it)=>s+(it.valor||0),0);
 const pagoEfec=costos.filter(it=>(it.pago||"efectivo")!=="transferencia").reduce((s,it)=>s+(it.valor||0),0);
 const pagoTransf=costos.filter(it=>it.pago==="transferencia").reduce((s,it)=>s+(it.valor||0),0);
 const totalAnticipo=costos.reduce((s,it)=>s+(it.pagado?(it.valor||0):Math.min(it.valor||0,Math.max(0,it.anticipo||0))),0);
 const saldoPendiente=costos.reduce((s,it)=>s+(it.pagado?0:Math.max(0,(it.valor||0)-(it.anticipo||0))),0);
 const esManual=!!(f.neuManual&&f.neuManual.on);
 const auto=tireAuto(fId);
 const ventaBrutaNeu=esManual?(f.neuManual.venta||0):auto.ventaBruta;
 const ventaNeu=esManual?Math.round((f.neuManual.venta||0)/div):auto.venta;
 const costoNeu=esManual?(f.neuManual.costo||0):auto.costo;
 const utilidadNeu=ventaNeu-costoNeu;
 const inscManualN=Math.round((f.insc||0)/div);
 const ia=inscripcionAuto(fId);
 const inscAutoNeto=ia.neto;
 const inscAutoBruto=ia.bruto;
 const inscN=inscManualN+inscAutoNeto;
 const trackN=Math.round((f.track||0)/div);
 const entrManualN=Math.round((f.entr||0)/div);
 const sponsorN=Math.round((f.sponsor||0)/div);
 const ea=entradasAuto(fId);
 const fs=facturaSplit(fId);
 const entrAutoNeto=ea.neto;
 const entrAutoBruto=ea.bruto;
 const entrN=entrManualN+entrAutoNeto;
 const ingNoGoma=inscN+trackN+entrN+sponsorN;
 const ingNoGomaBruto=(f.insc||0)+(f.track||0)+(f.entr||0)+(f.sponsor||0)+entrAutoBruto+inscAutoBruto;
 const ingresos=ingNoGoma+ventaNeu;
 const costoTotal=costoNeu+costoCarrera;
 const resultado=ingresos-costoTotal;
 const ivaDebito=(ventaBrutaNeu-ventaNeu)+(ingNoGomaBruto-ingNoGoma);
 const ivaCredito=docuBruto-docu;
 const ivaSaldo=ivaDebito-ivaCredito;
 const estTotalGP3=(adm.estructura||[]).reduce((s,e)=>s+(e.valor||0)*((e.pctGP3||0)/100),0);
 const estFecha=Math.round((ingresos||0)*((f.estPct||0)/100));
 const contribucion=resultado-estFecha;
 const margenPct=ingresos>0?resultado/ingresos*100:0;
 const coberturaPct=costoCarrera>0?ingNoGoma/costoCarrera*100:0;
 const dependPct=costoTotal>0?utilidadNeu/costoTotal*100:0;
 return{f,costos,costoCarrera,docu,docuBruto,negro,pagoEfec,pagoTransf,totalAnticipo,saldoPendiente,ventaNeu,ventaBrutaNeu,costoNeu,utilidadNeu,unidadesNeu:auto.unidades,ingNoGoma,ingNoGomaBruto,ingresos,costoTotal,resultado,ivaDebito,ivaCredito,ivaSaldo,estTotalGP3,estFecha,contribucion,margenPct,coberturaPct,dependPct,esManual,entrAutoNeto,entrAutoBruto,entrManualN,entrUnidades:ea.unidades,entrCantVentas:ea.cantVentas,entrPorMetodo:ea.porMetodo,inscAutoNeto,inscAutoBruto,inscManualN,inscCantVentas:ia.cantVentas,inscPorMetodo:ia.porMetodo,factTransf:fs.fact,noFactEfec:fs.nofact,factDet:fs.detFact,noFactDet:fs.detNoFact};
};

const setFecha=(fId,patch)=>{setAdm({...adm,fechas:{...adm.fechas,[fId]:{...adm.fechas[fId],...patch}}});};
const setCosto=(fId,idx,patch)=>{const f=adm.fechas[fId];setFecha(fId,{costos:(f.costos||[]).map((c,i)=>i===idx?{...c,...patch}:c)});};
const addCosto=fId=>{const f=adm.fechas[fId];setFecha(fId,{costos:[...(f.costos||[]),{id:"c"+Date.now(),nombre:"Nuevo ítem",valor:0,factura:false,pago:"efectivo"}]});};
const delCosto=(fId,idx)=>{const f=adm.fechas[fId];setFecha(fId,{costos:(f.costos||[]).filter((_,i)=>i!==idx)});};
const setEst=(idx,patch)=>{setAdm({...adm,estructura:adm.estructura.map((e,i)=>i===idx?{...e,...patch}:e)});};
const addEst=()=>{setAdm({...adm,estructura:[...adm.estructura,{id:"e"+Date.now(),nombre:"Nuevo gasto",valor:0,pctGP3:100}]});};
const delEst=idx=>{setAdm({...adm,estructura:adm.estructura.filter((_,i)=>i!==idx)});};

const sub_label=fId=>{const c=CIRCUITOS_BASE.find(x=>x.id===fId);return c?c.num+" "+c.nombre:fId;};
const SUBS=[...CIRCUITOS_BASE.map(c=>[c.id,c.num]),["consolidado","📊 Consolidado"],["banco","🏦 Banco"]];
const datos=CIRCUITOS_BASE.map(c=>({c,r:calc(c.id)}));
const totResultado=datos.reduce((s,d)=>s+(d.r?d.r.resultado:0),0);
const totContribucion=datos.reduce((s,d)=>s+(d.r?d.r.contribucion:0),0);
const totEstructura=datos.reduce((s,d)=>s+(d.r?d.r.estFecha:0),0);
const totIngresos=datos.reduce((s,d)=>s+(d.r?d.r.ingresos:0),0);
const totUtilNeu=datos.reduce((s,d)=>s+(d.r?d.r.utilidadNeu:0),0);
const totEntradasBruto=datos.reduce((s,d)=>s+(d.r?d.r.entrAutoBruto:0),0);
const totEntradasUnid=datos.reduce((s,d)=>s+(d.r?d.r.entrUnidades:0),0);
const totInscBruto=datos.reduce((s,d)=>s+(d.r?d.r.inscAutoBruto:0),0);
const totInscCant=datos.reduce((s,d)=>s+(d.r?d.r.inscCantVentas:0),0);
const totFact=datos.reduce((s,d)=>s+(d.r?d.r.factTransf:0),0);
const totNoFact=datos.reduce((s,d)=>s+(d.r?d.r.noFactEfec:0),0);
const estTotalGP3=(adm.estructura||[]).reduce((s,e)=>s+(e.valor||0)*((e.pctGP3||0)/100),0);

const cartola=adm.cartola||[];
const addCartolaRow=()=>setAdm({...adm,cartola:[...cartola,{id:"k"+Date.now(),fecha:"",concepto:"",tipo:"in",monto:0}]});
const setCartolaRow=(idx,patch)=>setAdm({...adm,cartola:cartola.map((r,i)=>i===idx?{...r,...patch}:r)});
const delCartolaRow=idx=>setAdm({...adm,cartola:cartola.filter((_,i)=>i!==idx)});
const neuTransfARS=ventas.reduce((s,v)=>s+getPagos(v).filter(p=>p.metodo==="transferencia"&&p.moneda==="ARS").reduce((a,p)=>a+(p.monto||0),0),0);
const ingTransfManual=CIRCUITOS_BASE.reduce((s,c)=>s+((adm.fechas[c.id]&&adm.fechas[c.id].ingTransf)||0),0);
const gastosTransfARS=CIRCUITOS_BASE.reduce((s,c)=>{const rr=calc(c.id);return s+(rr?rr.pagoTransf:0);},0);
const entradasEsp=neuTransfARS+ingTransfManual;
const netoEsperado=entradasEsp-gastosTransfARS;
const netoReal=cartola.reduce((s,r)=>s+((r.tipo==="out"?-1:1)*(r.monto||0)),0);
const difBanco=netoReal-netoEsperado;
const adjuntarCartola=(ev)=>{const file=ev.target.files&&ev.target.files[0];if(!file){return;}const reader=new FileReader();reader.onload=()=>{let text="";try{const buf=new Uint8Array(reader.result);const u=new TextDecoder("utf-8",{fatal:false}).decode(buf);text=u.indexOf("\uFFFD")>=0?new TextDecoder("iso-8859-1").decode(buf):u;}catch(e){try{text=new TextDecoder("iso-8859-1").decode(new Uint8Array(reader.result));}catch(e2){text="";}}const filas=parseCartolaText(text);if(filas.length===0){alert("No pude leer movimientos de ese archivo.");return;}setAdm({...adm,cartola:filas,cartolaArchivo:file.name,cartolaFecha:new Date().toLocaleString("es-AR")});};reader.readAsArrayBuffer(file);ev.target.value="";};
const _ventasARS=[];ventas.forEach(v=>{getPagos(v).filter(p=>p.metodo==="transferencia"&&p.moneda==="ARS").forEach(p=>{_ventasARS.push({id:v.id,piloto:v.piloto,monto:p.monto||0,fecha:v.fecha,used:false});});});
const _gastosARS=[];CIRCUITOS_BASE.forEach(c=>{const f=adm.fechas[c.id];((f&&f.costos)||[]).forEach(it=>{if(it.pago==="transferencia"){const m=it.pagado?(it.valor||0):(it.anticipo||0);if(m>0)_gastosARS.push({nombre:it.nombre,monto:m,fecha:c.nombre,used:false});}});});
const _otro=txt=>{const n=normTxt(txt);return["desanda","hauswagen","aperseg","turbodisel","deposito efvo","deposito efectivo"].some(k=>n.includes(k));};
const _fnum=s=>{if(!s)return null;s=(""+s).trim();let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;return y*10000+(+m[2])*100+(+m[1]);}m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return (+m[1])*10000+(+m[2])*100+(+m[3]);return null;};
const _match=(arr,r)=>{const rf=_fnum(r.fecha);const cands=[];arr.forEach((o,idx)=>{if(!o.used&&Math.abs(o.monto-r.monto)<1)cands.push({o,idx});});if(cands.length===0)return null;cands.sort((a,b)=>{const ad=(rf!=null&&_fnum(a.o.fecha)!=null)?Math.abs(rf-_fnum(a.o.fecha)):9e15;const bd=(rf!=null&&_fnum(b.o.fecha)!=null)?Math.abs(rf-_fnum(b.o.fecha)):9e15;return ad-bd;});const best=cands[0];arr[best.idx].used=true;return best.o;};
const cruceIn=cartola.filter(r=>r.tipo!=="out").map(r=>{const mt=_match(_ventasARS,r);if(mt)return{...r,estado:"ok",det:"Venta de "+mt.piloto};return{...r,estado:"bad",det:_otro(r.concepto)?"Ingreso que NO es venta de goma":"Depósito sin venta cargada en la app"};});
const ventasSinBanco=_ventasARS.filter(v=>!v.used);
const cruceOut=cartola.filter(r=>r.tipo==="out").map(r=>{const mt=_match(_gastosARS,r);if(mt)return{...r,estado:"ok",det:"Gasto: "+mt.nombre};const n=normTxt(r.concepto);const esImp=["comision transf","iva 21% reg","sircreb","impuesto ley 25.413"].some(k=>n.includes(k));return{...r,estado:esImp?"imp":"bad",det:esImp?"Impuesto / comisión bancaria":"Pago del banco sin gasto cargado como transferencia"};});
const gastosSinBanco=_gastosARS.filter(g=>!g.used);
const cruceOkN=cruceIn.filter(x=>x.estado==="ok").length+cruceOut.filter(x=>x.estado==="ok").length;
const cruceRevN=cruceIn.filter(x=>x.estado!=="ok").length+cruceOut.filter(x=>x.estado!=="ok"&&x.estado!=="imp").length+ventasSinBanco.length+gastosSinBanco.length;
const impTotal=cruceOut.filter(x=>x.estado==="imp").reduce((s,x)=>s+x.monto,0);

return(
<div style={{display:"flex",flexDirection:"column",gap:16}}>
 <GuardarBar estado={admEstado} onGuardar={guardarAhora} label="administración" hora={admSavedAt}/>
 <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
   {SUBS.map(([id,lbl])=>(<button key={id} onClick={()=>setSub(id)} style={{padding:"7px 14px",borderRadius:20,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,border:`1px solid ${sub===id?C.red:C.border2}`,background:sub===id?C.red+"22":"transparent",color:sub===id?C.text:C.gray,whiteSpace:"nowrap"}}>{lbl}</button>))}
   <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
     <Label>TC USD</Label>
     <input value={tc.toLocaleString("es-AR")} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setAdm({...adm,tc:x===""?0:parseInt(x,10)});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.green,borderRadius:8,padding:"7px 10px",fontSize:13,width:90,textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none"}}/>
     <Label>IVA %</Label>
     <input value={ivaPct} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setAdm({...adm,iva:x===""?0:parseInt(x,10)});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"7px 10px",fontSize:13,width:54,textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none"}}/>
   </div>
 </div>

 {sub!=="consolidado"&&sub!=="banco"&&(()=>{const r=calc(sub);if(!r)return null;const f=r.f;return(
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:16}}>
     <div style={{display:"flex",flexDirection:"column",gap:16}}>
       <Card><CardHeader>{sub_label(sub)} — Configuración</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
           <Label>Valores cargados</Label>
           <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
             <button onClick={()=>setFecha(sub,{ivaMode:"neto"})} style={{padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${f.ivaMode==="neto"?C.green:C.border}`,background:f.ivaMode==="neto"?"rgba(0,212,170,.1)":C.dark4,color:f.ivaMode==="neto"?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif"}}>NETO (sin IVA)</button>
             <button onClick={()=>setFecha(sub,{ivaMode:"con_iva"})} style={{padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${f.ivaMode==="con_iva"?C.red:C.border}`,background:f.ivaMode==="con_iva"?"rgba(232,0,29,.1)":C.dark4,color:f.ivaMode==="con_iva"?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif"}}>CON IVA</button>
           </div>
           <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>{f.ivaMode==="con_iva"?`A los ítems CON factura se les descuenta el ${ivaPct}% de IVA (recuperás ese crédito). Los sin factura van completos.`:"Los valores se toman tal cual. Pasá a CON IVA si cargaste el total de la factura (con IVA adentro)."}</div>
         </div>
       </Card>
       <Card><CardHeader>Neumáticos Pirelli (enlazado a Ventas)</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
           <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
             <button onClick={()=>setFecha(sub,{neuManual:{...f.neuManual,on:!(f.neuManual&&f.neuManual.on)}})} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,border:`1px solid ${r.esManual?C.orange:C.green}`,background:r.esManual?C.orange+"22":C.green+"22",color:r.esManual?C.orange:C.green}}>{r.esManual?"✍ MANUAL":"🔗 AUTO (desde Ventas)"}</button>
             <span style={{fontSize:11,color:C.gray}}>{r.esManual?"Cifras a mano":`${r.unidadesNeu} u. registradas`}</span>
           </div>
           {r.esManual?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><Label>Venta (con IVA)</Label><NumInput value={f.neuManual.venta} color={C.green} onChange={v=>setFecha(sub,{neuManual:{...f.neuManual,venta:v}})}/></div><div><Label>Costo neto (sin IVA)</Label><NumInput value={f.neuManual.costo} color={C.red} onChange={v=>setFecha(sub,{neuManual:{...f.neuManual,costo:v}})}/></div></div>):(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><StatBox label="Venta neta (auto)" value={fmtA(r.ventaNeu)} color={C.green}/><StatBox label="Costo neto (auto)" value={fmtA(r.costoNeu)} color={C.red}/></div>)}
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.dark4,borderRadius:8,borderLeft:`3px solid ${r.utilidadNeu>=0?C.green:C.red}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:1,color:C.text}}>UTILIDAD NEUMÁTICOS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:r.utilidadNeu>=0?C.green:C.red}}>{fmtA(r.utilidadNeu)}</span></div>
         </div>
       </Card>
       <Card><CardHeader>Ingresos de la Fecha</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
           <div style={{fontSize:11,color:C.gray,lineHeight:1.4,marginBottom:2}}>Cargá los montos con IVA (tal cual los cobrás). La app los netea solos.</div>
           <div><Label>Inscripciones — carga manual (con IVA)</Label><NumInput value={f.insc} color={C.green} onChange={v=>setFecha(sub,{insc:v})}/></div>
           {r.inscCantVentas>0&&(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.dark4,border:`1px solid ${C.yellow}55`,borderRadius:8,padding:"9px 12px"}}><div style={{minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:C.text}}>📋 Inscripciones pagadas en la app</div><div style={{fontSize:10,color:C.gray}}>{r.inscCantVentas} piloto(s) · automático</div></div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:16}}>{fmtA(r.inscAutoBruto)}</span></div>)}
           <div><Label>Track Day (con IVA)</Label><NumInput value={f.track} color={C.green} onChange={v=>setFecha(sub,{track:v})}/></div>
           <div><Label>Entradas / Público — carga manual (con IVA)</Label><NumInput value={f.entr} color={C.green} onChange={v=>setFecha(sub,{entr:v})}/></div>
           {r.entrCantVentas>0&&(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.dark4,border:`1px solid ${C.green}55`,borderRadius:8,padding:"9px 12px"}}><div style={{minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:C.text}}>🎫 Entradas vendidas en la app</div><div style={{fontSize:10,color:C.gray}}>{r.entrCantVentas} venta(s) · {r.entrUnidades} entrada(s) · automático</div></div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmtA(r.entrAutoBruto)}</span></div>)}
           <div><Label>Sponsor (con IVA)</Label><NumInput value={f.sponsor} color={C.green} onChange={v=>setFecha(sub,{sponsor:v})}/></div>
           <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}`}}><span style={{color:C.gray,fontSize:13}}>Subtotal neto (sin goma)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmtA(r.ingNoGoma)}</span></div>
         </div>
       </Card>
       <Card><CardHeader>💳 Facturación automática (por método de pago)</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
           <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>Regla: lo cobrado por <b>transferencia</b> se factura; lo cobrado en <b>efectivo y dólar</b> no se factura. Se calcula solo, sumando todos los cobros de la fecha (neumáticos + entradas + inscripciones).</div>
           <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
             <div style={{background:"rgba(43,143,208,.08)",border:`1px solid #2b8fd055`,borderRadius:10,padding:"11px 13px"}}>
               <div style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>🧾 Facturado (transferencias)</div>
               <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:"#2b8fd0",fontSize:22}}>{fmtA(r.factTransf)}</div>
               {Object.entries(r.factDet||{}).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.gray}}><span>{k==="neumatico"?"🛞 Neumáticos":k==="entrada"?"🎫 Entradas":k==="inscripcion"?"📋 Inscripción":k}</span><span>{fmtA(v)}</span></div>))}
             </div>
             <div style={{background:"rgba(200,146,10,.08)",border:`1px solid ${C.yellow}55`,borderRadius:10,padding:"11px 13px"}}>
               <div style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>💵 No facturado (efectivo + dólar)</div>
               <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:22}}>{fmtA(r.noFactEfec)}</div>
               {Object.entries(r.noFactDet||{}).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.gray}}><span>{k==="neumatico"?"🛞 Neumáticos":k==="entrada"?"🎫 Entradas":k==="inscripcion"?"📋 Inscripción":k}</span><span>{fmtA(v)}</span></div>))}
             </div>
           </div>
           <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}`}}><span style={{color:C.gray,fontSize:13}}>Total cobrado en la fecha</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,fontSize:16}}>{fmtA(r.factTransf+r.noFactEfec)}</span></div>
         </div>
       </Card>
     </div>
     <div style={{display:"flex",flexDirection:"column",gap:16}}>
       <Card><CardHeader>Costos de la Carrera</CardHeader>
         <div style={{padding:12}}>
           <div style={{display:"grid",gridTemplateColumns:"1fr 100px 42px 48px 20px",gap:5,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Ítem</span><span style={{textAlign:"right"}}>Valor ARS</span><span style={{textAlign:"center"}}>Fact.</span><span style={{textAlign:"center"}}>Pago</span><span/></div>
           {r.costos.map((it,i)=>{const _ant=Math.max(0,it.anticipo||0);const _pagado=!!it.pagado;const _saldo=_pagado?0:Math.max(0,(it.valor||0)-_ant);const _trf=(it.pago||"efectivo")==="transferencia";return(<div key={it.id||i} style={{marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}><div style={{display:"grid",gridTemplateColumns:"1fr 100px 42px 48px 20px",gap:5,alignItems:"center"}}><input value={it.nombre} onChange={e=>setCosto(sub,i,{nombre:e.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 10px",fontSize:13,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/><NumInput value={it.valor} color={C.red} onChange={v=>setCosto(sub,i,{valor:v})}/><button onClick={()=>setCosto(sub,i,{factura:!it.factura})} style={{padding:"7px 2px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,border:`1px solid ${it.factura?C.green:C.gray2}`,background:it.factura?C.green+"22":"transparent",color:it.factura?C.green:C.gray}}>{it.factura?"FAC":"S/F"}</button><button onClick={()=>setCosto(sub,i,{pago:_trf?"efectivo":"transferencia"})} title="Forma de pago" style={{padding:"7px 2px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,border:`1px solid ${_trf?"#2b8fd0":C.green}`,background:(_trf?"#2b8fd0":C.green)+"22",color:_trf?"#2b8fd0":C.green}}>{_trf?"TRF":"EFE"}</button><button onClick={()=>delCosto(sub,i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:16}}>×</button></div><div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:6}}>{!_pagado&&(<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>Anticipo</span><div style={{width:96}}><NumInput value={_ant} color={C.green} onChange={v=>setCosto(sub,i,{anticipo:v})}/></div></div>)}<button onClick={()=>setCosto(sub,i,{pagado:!_pagado})} style={{padding:"6px 10px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,border:`1px solid ${_pagado?C.green:C.border2}`,background:_pagado?C.green+"22":"transparent",color:_pagado?C.green:C.gray}}>{_pagado?"✓ PAGADO":"MARCAR PAGADO"}</button>{_pagado?(<span style={{fontSize:11,color:C.green,fontWeight:700}}>Pagado completo</span>):(_ant>0&&(<span style={{fontSize:11,color:C.gray}}>Falta: <b style={{color:_saldo>0?C.orange:C.green,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtA(_saldo)}</b></span>))}{it.comprobante&&it.comprobante.estado==="subiendo"?(<span style={{fontSize:11,color:C.gray}}>⏳ Subiendo…</span>):it.comprobante&&it.comprobante.estado==="listo"?(<span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11}}><a href={it.comprobante.url} target="_blank" rel="noreferrer" style={{color:C.green,fontWeight:700,textDecoration:"none"}}>📎 Ver comprobante</a><button onClick={()=>setCosto(sub,i,{comprobante:null})} style={{background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:13}}>✕</button></span>):(<label style={{display:"inline-flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,textTransform:"uppercase",color:C.gray,border:`1px solid ${C.border2}`,borderRadius:6,padding:"6px 10px"}}>📎 Adjuntar<input type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>adjuntarComprobante(sub,i,it,e)}/></label>)}</div></div>);})}
           <Btn small outline onClick={()=>addCosto(sub)} style={{marginTop:6}}>+ Agregar ítem</Btn>
           <div style={{marginTop:12,paddingTop:10,borderTop:`2px solid ${C.red}`,display:"flex",flexDirection:"column",gap:4}}>
             <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>Con factura (deducible)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.green}}>{fmtA(r.docu)}</span></div>
             <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>Sin factura</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.orange}}>{fmtA(r.negro)}</span></div>
             <div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:`1px dashed ${C.border}`}}><span style={{color:C.gray,fontSize:12}}>💵 Efectivo</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.green}}>{fmtA(r.pagoEfec)}</span></div>
             <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>🏦 Transferencia</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:"#2b8fd0"}}>{fmtA(r.pagoTransf)}</span></div>
             <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>TOTAL CARRERA</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:18}}>{fmtA(r.costoCarrera)}</span></div>
           </div>
         </div>
       </Card>
      <DesglosePagos tc={tc} titulo="💰 Toda la fecha — cómo ingresó (🧾 marca lo facturable)" ventas={(()=>{const a=[...ventas.filter(v=>v.circ_id===sub)];cierres.forEach(c=>{if(c.circ_id===sub&&Array.isArray(c.ventas))a.push(...c.ventas);});return a;})()}/>
      <Card style={{border:`1px solid ${r.resultado>=0?C.green:C.red}`}}><CardHeader>Resultado de la Fecha</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:6}}>
           {[["Ingresos totales (neto)",r.ingresos,C.green],["(−) Costo neumáticos",-r.costoNeu,C.gray],["(−) Costo carrera",-r.costoCarrera,C.gray]].map(([l,v,col],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:13}}>{l}</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:col}}>{fmtA(v)}</span></div>))}
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,margin:"4px 0"}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>MARGEN DE LA FECHA</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:24,color:r.resultado>=0?C.green:C.red}}>{fmtA(r.resultado)}</span></div>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:C.gray,fontSize:13}}>(−) Estructura asignada <span style={{color:C.gray2,fontSize:11}}>(% de ingresos)</span></span><div style={{display:"flex",alignItems:"center",gap:8}}><input value={f.estPct} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setFecha(sub,{estPct:x===""?0:Math.min(100,parseInt(x,10))});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:6,padding:"5px 8px",fontSize:13,width:48,textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none"}}/><span style={{color:C.gray,fontSize:12}}>%</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.orange,minWidth:90,textAlign:"right"}}>{fmtA(r.estFecha)}</span></div></div>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:r.contribucion>=0?"rgba(0,212,170,.08)":"rgba(232,0,29,.08)",borderRadius:8,marginTop:4}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>CONTRIBUCIÓN NETA</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:26,color:r.contribucion>=0?C.green:C.red}}>{fmtA(r.contribucion)}</span></div>
           <div style={{marginTop:8,padding:"10px 12px",background:C.dark4,borderRadius:8,border:`1px solid ${C.border}`}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:2,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,marginBottom:6}}>Posición de IVA (es plata de AFIP, no margen)</div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:C.gray}}>IVA cobrado (débito)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.gray}}>{fmtA(r.ivaDebito)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:C.gray}}>IVA recuperable (crédito)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.gray}}>{fmtA(r.ivaCredito)}</span></div><div style={{display:"flex",justifyContent:"space-between",paddingTop:5,borderTop:`1px dashed ${C.border}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.text,letterSpacing:1}}>IVA A PAGAR (AFIP)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.orange,fontSize:16}}>{fmtA(r.ivaSaldo)}</span></div></div>
           <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:8}}><StatBox label="Margen %" value={r.margenPct.toFixed(0)+"%"} color={r.margenPct>=0?C.green:C.red}/><StatBox label="Cobertura" value={r.coberturaPct.toFixed(0)+"%"} color={r.coberturaPct>=100?C.green:C.orange}/><StatBox label="Aporte goma" value={r.dependPct.toFixed(0)+"%"} color={C.yellow}/></div>
         </div>
       </Card>
     </div>
   </div>
 );})()}

 {sub==="consolidado"&&(
   <div style={{display:"flex",flexDirection:"column",gap:16}}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
       <StatBox label="Ingresos totales" value={fmtA(totIngresos)} color={C.green}/>
       <StatBox label="🎫 Entradas vendidas" value={fmtA(totEntradasBruto)} sub={totEntradasUnid+" entradas"} color="#2b8fd0"/>
       <StatBox label="📋 Inscripciones pagadas" value={fmtA(totInscBruto)} sub={totInscCant+" pilotos"} color={C.yellow}/>
       <StatBox label="🧾 Facturado (transfer.)" value={fmtA(totFact)} color="#2b8fd0"/>
       <StatBox label="💵 No facturado (efvo+USD)" value={fmtA(totNoFact)} color={C.yellow}/>
       <StatBox label="Σ Márgenes de fechas" value={fmtA(totResultado)} color={totResultado>=0?C.green:C.red}/>
       <StatBox label="Estructura período" value={fmtA(totEstructura)} color={C.orange}/>
       <StatBox label="Utilidad neumáticos" value={fmtA(totUtilNeu)} color={C.yellow}/>
     </div>
     <Card style={{border:`2px solid ${totContribucion>=0?C.green:C.red}`}}>
       <div style={{padding:20,textAlign:"center"}}>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:3,color:C.gray,textTransform:"uppercase"}}>Contribución final del campeonato (7 fechas)</div>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:900,color:totContribucion>=0?C.green:C.red,letterSpacing:-2,lineHeight:1.1,margin:"6px 0"}}>{fmtA(totContribucion)}</div>
         <div style={{fontSize:13,color:C.gray,maxWidth:560,margin:"0 auto",lineHeight:1.5}}>{totContribucion>=0?"La operación deja excedente después de cubrir la estructura.":"Tras la estructura el resultado es negativo: hay que mejorar márgenes o ingresos por fecha."}</div>
       </div>
     </Card>
     <Card><CardHeader>Detalle por Fecha</CardHeader>
       <div style={{padding:12,overflowX:"auto"}}>
         <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:680}}>
           <thead><tr>{["Fecha","Ingresos","Util. goma","Costo carrera","Margen","Estructura","Contribución","Cob.%"].map(h=>(<th key={h} style={{padding:"8px",textAlign:h==="Fecha"?"left":"right",fontSize:9,color:C.gray,letterSpacing:1,textTransform:"uppercase",borderBottom:`2px solid ${C.red}`,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
           <tbody>{datos.map(d=>{const r=d.r;if(!r)return null;return(<tr key={d.c.id} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>setSub(d.c.id)}><td style={{padding:"9px 8px",fontWeight:700}}>{d.c.num} {d.c.nombre}</td><td style={{padding:"9px 8px",textAlign:"right",color:C.green,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{fmtA(r.ingresos)}</td><td style={{padding:"9px 8px",textAlign:"right",color:C.yellow,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtA(r.utilidadNeu)}</td><td style={{padding:"9px 8px",textAlign:"right",color:C.gray,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtA(r.costoCarrera)}</td><td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:r.resultado>=0?C.green:C.red}}>{fmtA(r.resultado)}</td><td style={{padding:"9px 8px",textAlign:"right",color:C.orange,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtA(r.estFecha)}</td><td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:r.contribucion>=0?C.green:C.red}}>{fmtA(r.contribucion)}</td><td style={{padding:"9px 8px",textAlign:"right",color:r.coberturaPct>=100?C.green:C.orange,fontFamily:"'Barlow Condensed',sans-serif"}}>{r.coberturaPct.toFixed(0)}%</td></tr>);})}</tbody>
           <tfoot><tr style={{borderTop:`2px solid ${C.red}`}}><td style={{padding:"10px 8px",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,letterSpacing:1}}>TOTAL</td><td style={{padding:"10px 8px",textAlign:"right",color:C.green,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900}}>{fmtA(totIngresos)}</td><td style={{padding:"10px 8px",textAlign:"right",color:C.yellow,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900}}>{fmtA(totUtilNeu)}</td><td/><td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:totResultado>=0?C.green:C.red}}>{fmtA(totResultado)}</td><td style={{padding:"10px 8px",textAlign:"right",color:C.orange,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900}}>{fmtA(totEstructura)}</td><td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:totContribucion>=0?C.green:C.red}}>{fmtA(totContribucion)}</td><td/></tr></tfoot>
         </table>
         <div style={{fontSize:11,color:C.gray,marginTop:8}}>Toca una fila para editar esa fecha.</div>
       </div>
     </Card>
     <Card><CardHeader>Estructura de la Empresa (gastos transversales)</CardHeader>
       <div style={{padding:12}}>
         <div style={{fontSize:11,color:C.gray,marginBottom:10,lineHeight:1.4}}>Gastos de todo el negocio. El % GP3 es cuánto de ese gasto es de esta operación; se reparte entre fechas según el % de cada una.</div>
         <div style={{display:"grid",gridTemplateColumns:"1fr 116px 58px 26px",gap:6,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Gasto</span><span style={{textAlign:"right"}}>Valor ARS</span><span style={{textAlign:"center"}}>% GP3</span><span/></div>
         {adm.estructura.map((e,i)=>(<div key={e.id||i} style={{display:"grid",gridTemplateColumns:"1fr 116px 58px 26px",gap:6,alignItems:"center",marginBottom:6}}><input value={e.nombre} onChange={ev=>setEst(i,{nombre:ev.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 10px",fontSize:13,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/><NumInput value={e.valor} color={C.orange} onChange={v=>setEst(i,{valor:v})}/><input value={e.pctGP3} onChange={ev=>{const x=ev.target.value.replace(/[^\d]/g,"");setEst(i,{pctGP3:x===""?0:Math.min(100,parseInt(x,10))});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 6px",fontSize:13,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none",width:"100%"}}/><button onClick={()=>delEst(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:16}}>×</button></div>))}
         <Btn small outline onClick={addEst} style={{marginTop:6}}>+ Agregar gasto</Btn>
         <div style={{marginTop:12,paddingTop:10,borderTop:`2px solid ${C.red}`,display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>ESTRUCTURA GP3 (ponderada)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.orange,fontSize:18}}>{fmtA(estTotalGP3)}</span></div>
       </div>
     </Card>
   </div>
 )}

 {sub==="banco"&&(
   <div style={{display:"flex",flexDirection:"column",gap:16}}>
     <div style={{fontSize:12,color:C.gray,lineHeight:1.5}}>Conciliación del Banco (Argentina), todo en pesos. Solo <b>transferencias</b>. Las ventas USD se convierten al TC ({tc.toLocaleString("es-AR")}).</div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
       <StatBox label="Esperado: entró" value={fmtA(entradasEsp)} color={C.green}/>
       <StatBox label="Esperado: salió" value={fmtA(gastosTransfARS)} color={C.red}/>
       <StatBox label="Neto esperado" value={fmtA(netoEsperado)} color={netoEsperado>=0?C.green:C.red}/>
       <StatBox label="Neto real (cartola)" value={fmtA(netoReal)} color={netoReal>=0?C.green:C.red}/>
     </div>
     <Card style={{border:`2px solid ${Math.abs(difBanco)<1?C.green:C.orange}`}}>
       <div style={{padding:18,textAlign:"center"}}>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:3,color:C.gray,textTransform:"uppercase"}}>Diferencia (cartola − app)</div>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:40,fontWeight:900,color:Math.abs(difBanco)<1?C.green:C.orange,letterSpacing:-1,margin:"4px 0"}}>{fmtA(difBanco)}</div>
         <div style={{fontSize:13,color:C.gray}}>{Math.abs(difBanco)<1?"✅ Cuadra.":"Hay diferencia: revisá movimientos o ingresos/gastos por transferencia."}</div>
       </div>
     </Card>
     <Card style={{border:`1px solid ${C.green}55`}}><CardHeader>Adjuntar cartola del banco</CardHeader>
       <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
         <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>Bajá la cartola de movimientos (Excel/CSV) y adjuntala. La app la cruza con tus ventas y gastos.</div>
         <label style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",padding:"14px 20px",borderRadius:10,border:`2px dashed ${C.green}`,background:C.green+"11",color:C.green,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15,letterSpacing:1,textTransform:"uppercase"}}>📎 Adjuntar cartola<input type="file" accept=".xls,.xlsx,.csv,.txt,text/csv,application/vnd.ms-excel" style={{display:"none"}} onChange={adjuntarCartola}/></label>
         {adm.cartolaArchivo&&(<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}><span style={{fontSize:18}}>📄</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{adm.cartolaArchivo}</div><div style={{fontSize:11,color:C.gray}}>{cartola.length} movimientos · {adm.cartolaFecha||""}</div></div><button onClick={()=>setAdm({...adm,cartola:[],cartolaArchivo:"",cartolaFecha:""})} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>Quitar</button></div>)}
       </div>
     </Card>
     <Card><CardHeader>Cartola del Banco</CardHeader>
       <div style={{padding:12}}>
         <div style={{display:"grid",gridTemplateColumns:"96px 1fr 92px 120px 22px",gap:6,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Fecha</span><span>Concepto</span><span style={{textAlign:"center"}}>Tipo</span><span style={{textAlign:"right"}}>Monto ARS</span><span/></div>
         {cartola.map((r,i)=>(<div key={r.id||i} style={{display:"grid",gridTemplateColumns:"96px 1fr 92px 120px 22px",gap:6,alignItems:"center",marginBottom:6}}>
           <input value={r.fecha||""} placeholder="01/06" onChange={e=>setCartolaRow(i,{fecha:e.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 8px",fontSize:12,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/>
           <input value={r.concepto||""} placeholder="Concepto" onChange={e=>setCartolaRow(i,{concepto:e.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 10px",fontSize:13,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/>
           <button onClick={()=>setCartolaRow(i,{tipo:r.tipo==="out"?"in":"out"})} style={{padding:"8px 4px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,border:`1px solid ${r.tipo==="out"?C.red:C.green}`,background:(r.tipo==="out"?C.red:C.green)+"22",color:r.tipo==="out"?C.red:C.green}}>{r.tipo==="out"?"− Salida":"+ Entrada"}</button>
           <NumInput value={r.monto||0} color={r.tipo==="out"?C.red:C.green} onChange={v=>setCartolaRow(i,{monto:v})}/>
           <button onClick={()=>delCartolaRow(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:16}}>×</button>
         </div>))}
         <Btn small outline onClick={addCartolaRow} style={{marginTop:6}}>+ Agregar movimiento</Btn>
         <div style={{display:"flex",justifyContent:"space-between",marginTop:12,paddingTop:8,borderTop:`2px solid ${C.text}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>NETO REAL</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:netoReal>=0?C.green:C.red,fontSize:18}}>{fmtA(netoReal)}</span></div>
       </div>
     </Card>
     {cartola.length>0&&(
     <Card style={{border:`2px solid ${cruceRevN===0?C.green:C.orange}`}}><CardHeader>Cruce automático — banco vs app</CardHeader>
       <div style={{padding:12,display:"flex",flexDirection:"column",gap:12}}>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
           <StatBox label="Coinciden" value={cruceOkN} color={C.green}/>
           <StatBox label="Por revisar" value={cruceRevN} color={cruceRevN===0?C.green:C.orange}/>
           <StatBox label="Impuestos" value={fmtA(impTotal)} color={C.gray}/>
         </div>
         <div style={{padding:"10px 12px",borderRadius:8,background:cruceRevN===0?"rgba(0,168,132,.1)":"rgba(239,108,0,.1)",border:`1px solid ${cruceRevN===0?C.green:C.orange}`,fontSize:13,color:C.text,fontWeight:700}}>{cruceRevN===0?"✅ Todo cuadra.":"⚠️ Hay "+cruceRevN+" movimiento(s) por revisar."}</div>
         {cruceIn.filter(x=>x.estado!=="ok").map((x,i)=>(<div key={"i"+i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"8px 10px",background:C.dark4,borderRadius:8,borderLeft:`3px solid ${C.red}`}}><div style={{minWidth:0}}><div style={{fontSize:12,fontWeight:700}}>{x.fecha} · {x.concepto}</div><div style={{fontSize:11,color:C.red}}>{x.det}</div></div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:15}}>{fmtA(x.monto)}</span></div>))}
         {cruceOut.filter(x=>x.estado==="bad").map((x,i)=>(<div key={"o"+i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"8px 10px",background:C.dark4,borderRadius:8,borderLeft:`3px solid ${C.red}`}}><div style={{minWidth:0}}><div style={{fontSize:12,fontWeight:700}}>{x.fecha} · {x.concepto}</div><div style={{fontSize:11,color:C.red}}>{x.det}</div></div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:15}}>{fmtA(x.monto)}</span></div>))}
       </div>
     </Card>
     )}
   </div>
 )}
</div>
);
}

function CierreDiaPanel({ventas,closedIds,eventoActivo,cierresDia,vendedor,onCerrar}){
const fmtA=(n,m)=>fmt(n||0,m);
const hoy=new Date();const Y=hoy.getFullYear(),Mo=hoy.getMonth(),D=hoy.getDate();
const esHoy=id=>{const f=new Date(id);return f.getFullYear()===Y&&f.getMonth()===Mo&&f.getDate()===D;};
const ev=CIRCUITOS_BASE.find(c=>c.id===eventoActivo);
const abiertasHoy=ventas.filter(v=>!closedIds.has(v.id)&&esHoy(v.id)&&v.circ_id===eventoActivo&&(!v.tipo_venta||v.tipo_venta==="neumatico"));
const tot={};let units=0;const metodos={};
abiertasHoy.forEach(v=>{units+=v.total_unidades||0;getPagos(v).forEach(p=>{tot[p.moneda]=(tot[p.moneda]||0)+p.monto;const k=p.metodo||"otro";if(!metodos[k])metodos[k]={usd:0,ars:0,cnt:0};if(p.moneda==="USD")metodos[k].usd+=p.monto;else metodos[k].ars+=p.monto;metodos[k].cnt++;});});
const metLabels={efectivo_usd:"💵 Efectivo USD",transferencia:"🏦 Transferencia",efectivo_ars:"🇦🇷 Efectivo ARS",debito:"💳 Débito/Crédito",otro:"Otro"};
const cierresEvento=cierresDia.filter(c=>c.circ_id===eventoActivo).sort((a,b)=>b.id-a.id);
return(
<Card style={{border:`1px solid ${C.green}55`}}>
 <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
   <div style={{width:3,height:16,background:C.green,borderRadius:2}}/>
   <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text}}>Cierre del Día</span>
   <span style={{marginLeft:"auto",fontSize:11,color:C.gray}}>{ev?ev.nombre:"—"} · {HOY}</span>
 </div>
 <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
     <StatBox label="Total USD hoy" value={fmtA(tot["USD"]||0,"USD")} color={C.green}/>
     <StatBox label="Total ARS hoy" value={fmtA(tot["ARS"]||0,"ARS")} color={C.yellow}/>
     <StatBox label="Neumáticos" value={units} color={C.red}/>
     <StatBox label="Ventas del día" value={abiertasHoy.length} color={C.text}/>
   </div>
   {Object.keys(metodos).length>0&&(
     <div>
       <Label>Medios de pago (hoy)</Label>
       <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>
         {Object.entries(metodos).map(([k,d])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}><span>{metLabels[k]||k} <span style={{color:C.gray,fontSize:11}}>· {d.cnt}</span></span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{d.usd>0?fmtA(d.usd,"USD"):""}{d.usd>0&&d.ars>0?" · ":""}{d.ars>0?fmtA(d.ars,"ARS"):""}</span></div>))}
       </div>
     </div>
   )}
   <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>Al cerrar, estas ventas se archivan y la lista del día queda limpia. <b>No se borran</b>: siguen en el total del evento.</div>
   <Btn full color={C.green} disabled={abiertasHoy.length===0} onClick={()=>onCerrar(abiertasHoy,vendedor)}>{abiertasHoy.length>0?("🏁 Cerrar el día — "+abiertasHoy.length+" venta"+(abiertasHoy.length!==1?"s":"")):"No hay ventas abiertas hoy"}</Btn>
   {cierresEvento.length>0&&(
     <div style={{marginTop:6}}>
       <Label>Cierres de {ev?ev.nombre:"este evento"}</Label>
       <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:6}}>
         {cierresEvento.map((c,i)=>(<div key={c.id||i} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${C.green}`}}>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
             <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14}}>{c.fecha}{c.hora?" · "+c.hora:""}</div><div style={{fontSize:11,color:C.gray}}>{c.vendedor||"—"} · {c.numVentas||0} ventas · {c.unidades||0} u. · {c.inscritos||0} inscritos</div></div>
             <div style={{textAlign:"right"}}>{c.totales&&c.totales["USD"]?<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:15}}>{fmtA(c.totales["USD"],"USD")}</div>:null}{c.totales&&c.totales["ARS"]?<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:15}}>{fmtA(c.totales["ARS"],"ARS")}</div>:null}</div>
           </div>
         </div>))}
       </div>
     </div>
   )}
 </div>
</Card>
);
}

function QRScanner({onScan,color}){
 const videoRef=useRef(null);
 const canvasRef=useRef(null);
 const [estado,setEstado]=useState("init");
 const [manual,setManual]=useState("");
 const [ultimo,setUltimo]=useState("");
 const lastRef=useRef(0);
 const ctrlRef=useRef({stop:false,stream:null,raf:null});
 const loadJsQR=()=>new Promise((res,rej)=>{if(window.jsQR)return res(window.jsQR);const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";s.onload=()=>res(window.jsQR);s.onerror=()=>rej(new Error("nojsqr"));document.head.appendChild(s);});
 const hit=(val)=>{val=(""+(val||"")).trim();const now=Date.now();if(val&&now-lastRef.current>2500){lastRef.current=now;setUltimo(val);onScan(val);}};
 const start=async()=>{
   const ctrl=ctrlRef.current;ctrl.stop=false;
   if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setEstado("nocam");return;}
   try{
     const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});
     ctrl.stream=stream;
     const v=videoRef.current;if(!v){stream.getTracks().forEach(t=>t.stop());return;}
     v.srcObject=stream;v.setAttribute("playsinline","true");v.setAttribute("muted","true");v.muted=true;
     await v.play().catch(()=>{});
     setEstado("scanning");
     let detector=null;
     if("BarcodeDetector" in window){try{detector=new window.BarcodeDetector({formats:["qr_code"]});}catch(e){detector=null;}}
     let jsq=null;
     if(!detector){try{jsq=await loadJsQR();}catch(e){jsq=null;}}
     const tick=async()=>{
       if(ctrl.stop)return;
       try{
         if(detector){const codes=await detector.detect(v);if(codes&&codes.length)hit(codes[0].rawValue);}
         else if(jsq&&v.videoWidth){const w=v.videoWidth,h=v.videoHeight;const cv=canvasRef.current;cv.width=w;cv.height=h;const cx=cv.getContext("2d",{willReadFrequently:true});cx.drawImage(v,0,0,w,h);const img=cx.getImageData(0,0,w,h);const code=jsq(img.data,w,h);if(code&&code.data)hit(code.data);}
       }catch(e){}
       ctrl.raf=requestAnimationFrame(tick);
     };
     ctrl.raf=requestAnimationFrame(tick);
   }catch(e){setEstado("nocam");}
 };
 const stopCam=()=>{const c=ctrlRef.current;c.stop=true;if(c.raf)cancelAnimationFrame(c.raf);if(c.stream){c.stream.getTracks().forEach(t=>t.stop());c.stream=null;}};
 useEffect(()=>{start();return stopCam;},[]);
 const col=color||C.green;
 const activa=estado==="init"||estado==="scanning";
 return(
   <Card><CardHeader>📷 Escanear QR del invitado VIP</CardHeader>
     <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
       {activa&&(
         <div style={{position:"relative",borderRadius:12,overflow:"hidden",background:"#000",aspectRatio:"1/1",maxWidth:340,margin:"0 auto",width:"100%"}}>
           <video ref={videoRef} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>
           <div style={{position:"absolute",inset:"18%",border:`3px solid ${col}`,borderRadius:14,boxShadow:"0 0 0 9999px rgba(0,0,0,.25)"}}/>
         </div>
       )}
       <canvas ref={canvasRef} style={{display:"none"}}/>
       {estado==="scanning"&&<div style={{textAlign:"center",fontSize:12,color:C.gray}}>Apuntá al QR que le llegó por mail. Detecta solo.</div>}
       {ultimo&&<div style={{textAlign:"center",fontSize:12,color:col,fontWeight:700}}>✓ Último leído: {ultimo}</div>}
       {estado==="nocam"&&(
         <div style={{background:C.dark4,border:`1px solid ${C.orange}55`,borderRadius:10,padding:"12px 14px",fontSize:12,color:C.gray,lineHeight:1.4}}>📵 No se pudo abrir la cámara. Tocá <b style={{color:col}}>"Activar cámara"</b> y permití el acceso, o ingresá el código del QR a mano:</div>
       )}
       {(estado==="nocam"||estado==="init")&&(
         <Btn full color={col} onClick={()=>{stopCam();setEstado("init");setTimeout(start,80);}}>📷 Activar cámara</Btn>
       )}
       <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
         <Input placeholder="Código del QR (manual)" value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(onScan(manual.trim()),setUltimo(manual.trim()),setManual(""))}/>
         <Btn color={col} onClick={()=>{if(manual.trim()){onScan(manual.trim());setUltimo(manual.trim());setManual("");}}} disabled={!manual.trim()}>Validar</Btn>
       </div>
     </div>
   </Card>
 );
}

function VipPanel(){
const [sponsors,setSponsors]=useState([]);
const [counts,setCounts]=useState({});
const [estado,setEstado]=useState("cargando");
const [edit,setEdit]=useState(null);
const [monId,setMonId]=useState(null);
const [regs,setRegs]=useState(null);
const [q,setQ]=useState("");
const [tv,setTv]=useState("");
const linkPub=(id)=>location.origin+"/vip.html?id="+encodeURIComponent(id);
const resumen=(rs)=>{let d1=0,d2=0,d3=0;(rs||[]).forEach(r=>{if(r.d1)d1++;if(r.d2)d2++;if(r.d3)d3++;});return{total:(rs||[]).length,d1,d2,d3};};
const toastV=(m)=>{setTv(m);setTimeout(()=>setTv(""),1800);};
const copiar=(t)=>{try{navigator.clipboard.writeText(t);toastV("Link copiado ✓");}catch(e){toastV("Copiá: "+t);}};
const cargar=async()=>{
 try{
  const r=await fetch(withKey(SHEETS_URL+"?tipo=vip_sponsors&t="+Date.now()));
  const j=await r.json();const sp=j.sponsors||[];
  setSponsors(sp);setEstado(sp.length?"ok":"vacio");
  const cs={};
  await Promise.all(sp.map(async s=>{try{const rr=await fetch(withKey(SHEETS_URL+"?tipo=vip_reg&id="+encodeURIComponent(s.id)+"&t="+Date.now()));const jj=await rr.json();cs[s.id]=resumen(jj.registros);}catch(e){cs[s.id]={total:0,d1:0,d2:0,d3:0};}}));
  setCounts(cs);
 }catch(e){setEstado("error");}
};
useEffect(()=>{cargar();},[]);
const abrirNuevo=()=>setEdit({_isEdit:false,id:"",nombre:"",color:"#E3B84B",evento:"",lugar:"",cupo_dia:0,dias:["","",""],activo:true});
const abrirEdit=(s)=>setEdit({_isEdit:true,id:s.id,nombre:s.nombre,color:s.color||"#E3B84B",evento:s.evento||"",lugar:s.lugar||"",cupo_dia:s.cupo_dia||0,dias:(s.dias||[]).concat(["","",""]).slice(0,3),activo:s.activo!==false});
const guardarSp=async()=>{
 const e=edit;
 const id=(e.id||"").trim().toLowerCase().replace(/[^a-z0-9]/g,"");
 if(!id){toastV("Poné un ID");return;}
 if(!(e.nombre||"").trim()){toastV("Poné el nombre");return;}
 if(!e._isEdit&&sponsors.some(s=>s.id===id)){toastV("Ya existe ese ID");return;}
 const sponsor={id,nombre:e.nombre.trim(),color:e.color||"#888888",evento:(e.evento||"").trim(),lugar:(e.lugar||"").trim(),cupo_dia:parseInt(e.cupo_dia||0,10)||0,dias:(e.dias||[]).map(x=>(x||"").trim()).filter(x=>x),activo:!!e.activo};
 await syncSheets("vip_sponsor_save",{sponsor});
 setEdit(null);toastV(e._isEdit?"Sponsor actualizado ✓":"Sponsor creado ✓");
 setTimeout(cargar,1400);
};
const borrarSp=async(s)=>{
 if(!window.confirm('¿Borrar "'+s.nombre+'"? Los invitados ya cargados quedan a salvo.'))return;
 await syncSheets("vip_sponsor_delete",{id:s.id});
 toastV("Sponsor borrado ✓");setTimeout(cargar,1400);
};
const abrirMon=async(id)=>{setMonId(id);setRegs(null);setQ("");try{const r=await fetch(withKey(SHEETS_URL+"?tipo=vip_reg&id="+encodeURIComponent(id)+"&t="+Date.now()));const j=await r.json();setRegs(j.registros||[]);}catch(e){setRegs([]);}};
const recargarMon=async()=>{if(!monId)return;try{const r=await fetch(withKey(SHEETS_URL+"?tipo=vip_reg&id="+encodeURIComponent(monId)+"&t="+Date.now()));const j=await r.json();setRegs(j.registros||[]);setCounts(c=>({...c,[monId]:resumen(j.registros)}));}catch(e){}};
const borrarReg=async(rid)=>{if(!window.confirm("¿Borrar este invitado? Su QR dejará de ser válido."))return;setRegs(prev=>(prev||[]).filter(x=>x.id!==rid));await syncSheets("vip_reg_delete",{sponsor_id:monId,id:rid});toastV("Invitado borrado ✓");};
const Tt=()=>tv?(<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"10px 18px",borderRadius:9,background:C.green,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:1,boxShadow:"0 8px 28px rgba(0,0,0,.25)"}}>{tv}</div>):null;

if(edit){
 const e=edit;const setF=(k,v)=>setEdit({...e,[k]:v});const setD=(i,v)=>{const d=[...e.dias];d[i]=v;setEdit({...e,dias:d});};
 return(<div style={{maxWidth:560}}>
  <Tt/>
  <button onClick={()=>setEdit(null)} style={{background:"none",border:0,color:C.gray,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:8}}>‹ Volver</button>
  <Card>
   <CardHeader>{e._isEdit?"Editar sponsor":"Nuevo sponsor"}</CardHeader>
   <div style={{padding:16}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
     <Field label="ID (sin espacios)"><Input value={e.id} disabled={e._isEdit} placeholder="ej. mobil" onChange={ev=>setF("id",ev.target.value)} style={e._isEdit?{opacity:.6}:{}}/></Field>
     <Field label="Color"><div style={{display:"flex",gap:8,alignItems:"center"}}><input type="color" value={e.color} onChange={ev=>setF("color",ev.target.value)} style={{width:46,height:42,padding:2,borderRadius:8,border:`1px solid ${C.border2}`,cursor:"pointer",flexShrink:0}}/><Input value={e.color} onChange={ev=>setF("color",ev.target.value)}/></div></Field>
    </div>
    <Field label="Nombre del sponsor"><Input value={e.nombre} placeholder="Ej. Mobil" onChange={ev=>setF("nombre",ev.target.value)}/></Field>
    <Field label="Evento"><Input value={e.evento} placeholder="Ej. Mobil — Concordia 2026" onChange={ev=>setF("evento",ev.target.value)}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
     <Field label="Lugar"><Input value={e.lugar} placeholder="Autódromo de..." onChange={ev=>setF("lugar",ev.target.value)}/></Field>
     <Field label="Cupo por día (0 = sin tope)"><Input type="number" value={e.cupo_dia} onChange={ev=>setF("cupo_dia",ev.target.value)}/></Field>
    </div>
    <Label>Días de la fecha</Label>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
     <Input value={e.dias[0]} placeholder="Día 1" onChange={ev=>setD(0,ev.target.value)}/>
     <Input value={e.dias[1]} placeholder="Día 2" onChange={ev=>setD(1,ev.target.value)}/>
     <Input value={e.dias[2]} placeholder="Día 3" onChange={ev=>setD(2,ev.target.value)}/>
    </div>
    <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",marginBottom:14}}><input type="checkbox" checked={e.activo} onChange={ev=>setF("activo",ev.target.checked)}/><span style={{fontSize:14,color:C.text,fontWeight:600}}>Registro abierto (activo)</span></label>
    <Btn full onClick={guardarSp}>{e._isEdit?"Guardar cambios":"Crear sponsor"}</Btn>
   </div>
  </Card>
 </div>);
}

if(monId){
 const sp=sponsors.find(s=>s.id===monId)||{};
 const d=(sp.dias||[]).concat(["Día 1","Día 2","Día 3"]).slice(0,3);
 const r=resumen(regs||[]);
 const qq=q.trim().toLowerCase();
 const filt=regs===null?null:(qq?regs.filter(x=>((x.nombre||"")+" "+(x.email||"")+" "+(x.vip_code||"")).toLowerCase().includes(qq)):regs);
 return(<div>
  <Tt/>
  <button onClick={()=>setMonId(null)} style={{background:"none",border:0,color:C.gray,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:8}}>‹ Volver a sponsors</button>
  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
   <span style={{width:18,height:18,borderRadius:5,background:sp.color,border:"1px solid rgba(0,0,0,.15)"}}/>
   <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20}}>{sp.nombre}</div><div style={{fontSize:10,color:C.red,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Invitados VIP · en vivo</div></div>
   <div style={{marginLeft:"auto",display:"flex",gap:8}}>
    <Btn small outline onClick={()=>copiar(linkPub(sp.id))}>⧉ Link</Btn>
    <Btn small outline onClick={recargarMon}>↻</Btn>
   </div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(86px,1fr))",gap:10,marginBottom:14}}>
   <StatBox label="Invitados" value={r.total} color={sp.color||C.red}/>
   <StatBox label={d[0]} value={r.d1} color={C.text}/>
   <StatBox label={d[1]} value={r.d2} color={C.text}/>
   <StatBox label={d[2]} value={r.d3} color={C.text}/>
  </div>
  <Input placeholder="🔎 Buscar por nombre, email o código..." value={q} onChange={ev=>setQ(ev.target.value)} style={{marginBottom:12}}/>
  <Card>
   {filt===null?(<div style={{padding:24,textAlign:"center",color:C.gray}}>Cargando invitados...</div>):
    filt.length===0?(<div style={{padding:24,textAlign:"center",color:C.gray2}}>{qq?"Sin resultados.":"Todavía no hay invitados cargados."}</div>):
    (<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
     <thead><tr>{["Invitado","Email","Días","Código QR",""].map((h,i)=>(<th key={i} style={{textAlign:"left",fontSize:9,letterSpacing:1,textTransform:"uppercase",color:C.gray,fontFamily:"'Barlow Condensed',sans-serif",padding:"8px 10px",borderBottom:`1px solid ${C.border}`}}>{h}</th>))}</tr></thead>
     <tbody>{filt.map(x=>{const dd=[x.d1?d[0]:"",x.d2?d[1]:"",x.d3?d[2]:""].filter(Boolean).join(", ");return(<tr key={x.id}>
      <td style={{padding:"9px 10px",fontSize:13,borderBottom:`1px solid ${C.border}`,fontWeight:700}}>{x.nombre}</td>
      <td style={{padding:"9px 10px",fontSize:12,borderBottom:`1px solid ${C.border}`,color:C.gray}}>{x.email||"—"}</td>
      <td style={{padding:"9px 10px",fontSize:12,borderBottom:`1px solid ${C.border}`}}>{dd||"—"}</td>
      <td style={{padding:"9px 10px",borderBottom:`1px solid ${C.border}`}}><span style={{fontFamily:"monospace",fontSize:11,color:C.gray,background:C.dark4,padding:"2px 6px",borderRadius:5}}>{x.vip_code||"—"}</span></td>
      <td style={{padding:"9px 10px",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}><span onClick={()=>borrarReg(x.id)} style={{cursor:"pointer",color:C.gray2,fontWeight:900,padding:"2px 7px"}}>✕</span></td>
     </tr>);})}</tbody>
    </table></div>)}
  </Card>
 </div>);
}

return(<div>
 <Tt/>
 <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
  <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20}}>⭐ Sponsors VIP</div><div style={{fontSize:10,color:C.red,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Autoadministrable</div></div>
  <div style={{marginLeft:"auto",display:"flex",gap:8}}>
   <Btn small outline onClick={cargar}>↻ Actualizar</Btn>
   <Btn small onClick={abrirNuevo}>+ Nuevo sponsor</Btn>
  </div>
 </div>
 {estado==="cargando"&&<Card><div style={{padding:24,textAlign:"center",color:C.gray}}>Cargando sponsors...</div></Card>}
 {estado==="error"&&<Card><div style={{padding:24,textAlign:"center",color:C.gray}}>No se pudo conectar.<div style={{marginTop:10}}><Btn small outline onClick={cargar}>Reintentar</Btn></div></div></Card>}
 {estado==="vacio"&&<Card><div style={{padding:24,textAlign:"center",color:C.gray2}}>Todavía no hay sponsors. Creá el primero. 👇</div></Card>}
 {sponsors.map(s=>{const c=counts[s.id]||{total:0};const cupo=(s.cupo_dia&&s.cupo_dia>0)?(s.cupo_dia+" por día"):"Sin tope";return(
  <Card key={s.id} style={{marginBottom:12}}>
   <div style={{padding:"12px 15px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
    <span style={{width:14,height:14,borderRadius:4,background:s.color,border:"1px solid rgba(0,0,0,.15)"}}/>
    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:800}}>{s.nombre}</span>
    <Badge color={s.activo?C.green:C.gray2} small>{s.activo?"Activo":"Inactivo"}</Badge>
    <span style={{marginLeft:"auto",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,color:s.color}}>{c.total}</span>
    <span style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:1}}>invit.</span>
   </div>
   <div style={{padding:"13px 15px",fontSize:13,color:C.gray,lineHeight:1.7}}>
    <b style={{color:C.text}}>Evento:</b> {s.evento||"—"} · <b style={{color:C.text}}>Lugar:</b> {s.lugar||"—"}<br/>
    <b style={{color:C.text}}>Cupo:</b> {cupo} · <b style={{color:C.text}}>Días:</b> {s.dias&&s.dias.length?s.dias.join(" · "):"—"} · <b style={{color:C.text}}>ID:</b> <span style={{fontFamily:"monospace",fontSize:11,background:C.dark4,padding:"2px 6px",borderRadius:5}}>{s.id}</span>
   </div>
   <div style={{padding:"11px 15px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
    <div style={{flex:1,minWidth:180,background:C.dark4,border:`1px dashed ${C.border2}`,borderRadius:8,padding:"8px 11px",fontSize:12,color:C.gray,wordBreak:"break-all"}}>{linkPub(s.id)}</div>
    <Btn small outline onClick={()=>copiar(linkPub(s.id))}>⧉ Copiar link</Btn>
   </div>
   <div style={{padding:"0 15px 13px",display:"flex",gap:8,flexWrap:"wrap"}}>
    <Btn small onClick={()=>abrirMon(s.id)}>👥 Ver invitados</Btn>
    <Btn small outline onClick={()=>abrirEdit(s)}>✎ Editar</Btn>
    <Btn small outline color={C.red} style={{marginLeft:"auto"}} onClick={()=>borrarSp(s)}>🗑 Borrar</Btn>
   </div>
  </Card>
 );})}
</div>);
}

/* ===== STAFF GP3 — pases anuales de staff con foto (tarjeta plateada) ===== */
function StaffPanel(){
const [lista,setLista]=useState(null);
const [edit,setEdit]=useState(null);
const [tv,setTv]=useState("");
const [fotoVer,setFotoVer]=useState(0);
const [fotoEstado,setFotoEstado]=useState("");
const fotoRef=useRef(null);
const toastV=(m)=>{setTv(m);setTimeout(()=>setTv(""),2400);};
const cargar=async()=>{
 try{
  const r=await fetch(withKey(SHEETS_URL+"?tipo=staff_list&t="+Date.now()));
  const j=await r.json();
  setLista(j.staff||[]);
 }catch(e){setLista([]);}
};
useEffect(()=>{cargar();},[]);
const dniLimpio=(x)=>((x||"").toString().replace(/\D/g,""));
const fotoSrc=(dni)=>dni?(FOTO_URL+"?id="+dni+"&v="+fotoVer):"";
const elegirFoto=()=>{if(fotoRef.current)fotoRef.current.click();};
const subirFotoStaff=async(ev)=>{
 const file=ev.target.files&&ev.target.files[0];ev.target.value="";
 if(!file||!edit)return;
 const id=dniLimpio(edit.dni);
 if(!id){setFotoEstado("error");alert("Carga primero el DNI: la foto se guarda con ese número.");return;}
 if(file.size>8*1024*1024){setFotoEstado("error");alert("La foto es muy grande (máx 8 MB).");return;}
 setFotoEstado("subiendo");
 const rd=new FileReader();
 rd.onload=async()=>{
  try{
   const res=await fetch(FOTO_URL+"?id="+id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({b64:String(rd.result)})});
   const j=await res.json().catch(()=>({}));
   if(res.ok&&j.ok){setFotoEstado("ok");setFotoVer(v=>v+1);toastV("Foto guardada ✓");}
   else{setFotoEstado("error");alert("No se pudo guardar la foto.");}
  }catch(e){setFotoEstado("error");alert("Error de red al subir la foto.");}
 };
 rd.readAsDataURL(file);
};
const borrarFotoStaff=async()=>{
 if(!edit)return;const id=dniLimpio(edit.dni);if(!id)return;
 if(!window.confirm("¿Borrar la foto? El pase saldrá sin foto hasta que cargues otra."))return;
 setFotoEstado("subiendo");
 try{
  const res=await fetch(FOTO_URL+"?id="+id,{method:"DELETE"});
  if(res.ok){setFotoEstado("vacia");setFotoVer(v=>v+1);}else{setFotoEstado("error");}
 }catch(e){setFotoEstado("error");}
};
const abrirNuevo=()=>{setFotoEstado("");setEdit({id:"",nombre:"",apellido:"",cargo:"",dni:"",email:""});};
const abrirEdit=(x)=>{setFotoEstado("");setEdit({id:x.id,nombre:x.nombre||"",apellido:x.apellido||"",cargo:x.cargo||"",dni:x.dni||"",email:x.email||""});};
const guardar=async()=>{
 const e=edit;
 if(!(e.nombre||"").trim()){toastV("Falta el nombre");return;}
 if(!(e.cargo||"").trim()){toastV("Falta el cargo");return;}
 if(!dniLimpio(e.dni)){toastV("Falta el DNI (con él se guarda la foto)");return;}
 if(!(e.email||"").trim()||e.email.indexOf("@")<0){toastV("Falta un email válido");return;}
 await syncSheets("staff_save",{staff:{id:e.id||"",nombre:e.nombre.trim(),apellido:(e.apellido||"").trim(),cargo:e.cargo.trim(),dni:dniLimpio(e.dni),email:e.email.trim()}});
 setEdit(null);
 toastV(e.id?"Staff actualizado ✓ · el pase sale por correo":"Staff creado ✓ · el pase sale por correo");
 setTimeout(cargar,2500);
};
const reenviar=async(x)=>{
 await syncSheets("staff_enviar",{id:x.id});
 toastV("Pase reenviado a "+(x.email||"su correo"));
 setTimeout(cargar,2500);
};
const borrar=async(x)=>{
 if(!window.confirm('¿Borrar a "'+((x.nombre||"")+" "+(x.apellido||"")).trim()+'"? Su QR dejará de ser válido.'))return;
 setLista(prev=>(prev||[]).filter(y=>y.id!==x.id));
 await syncSheets("staff_delete",{id:x.id});
 toastV("Staff borrado ✓");
 setTimeout(cargar,2000);
};
const Tt=()=>tv?(<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"10px 18px",borderRadius:9,background:C.green,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:1,boxShadow:"0 8px 28px rgba(0,0,0,.25)"}}>{tv}</div>):null;
const estBadge=(x)=>{
 const s=(x.estado||"").toLowerCase();
 if(s==="enviado")return <Badge color={C.green} small>Enviado</Badge>;
 if(s==="error")return <Badge color={C.red} small>Error de envío</Badge>;
 if(s==="sin_email")return <Badge color={C.orange} small>Sin email</Badge>;
 return <Badge color={C.gray2} small>Pendiente</Badge>;
};

if(edit){
 const e=edit;const setF=(k,v)=>setEdit({...e,[k]:v});
 const dni=dniLimpio(e.dni);
 return(<div style={{maxWidth:560}}>
  <Tt/>
  <button onClick={()=>setEdit(null)} style={{background:"none",border:0,color:C.gray,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:8}}>‹ Volver</button>
  <Card>
   <CardHeader>{e.id?"Editar staff":"Nuevo staff GP3"}</CardHeader>
   <div style={{padding:16}}>
    <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:4}}>
     <div style={{flexShrink:0,textAlign:"center"}}>
      <div style={{width:92,height:92,borderRadius:12,background:C.dark4,border:`1px solid ${C.border2}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
       {dni?(<img key={fotoVer} src={fotoSrc(dni)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={ev=>{ev.target.style.display="none";}}/>):(<span style={{fontSize:28}}>🪪</span>)}
      </div>
      <input ref={fotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={subirFotoStaff}/>
      <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:7}}>
       <Btn small outline onClick={elegirFoto} disabled={!dni}>📷 {fotoEstado==="subiendo"?"Subiendo...":"Foto"}</Btn>
       <Btn small outline color={C.gray} onClick={borrarFotoStaff} disabled={!dni}>🗑 Borrar</Btn>
      </div>
      {!dni&&<div style={{fontSize:9,color:C.gray2,marginTop:5,maxWidth:92}}>Carga el DNI para poder subir la foto</div>}
     </div>
     <div style={{flex:1}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
       <Field label="Nombre"><Input value={e.nombre} placeholder="Ej. Ivonne" onChange={ev=>setF("nombre",ev.target.value)}/></Field>
       <Field label="Apellido"><Input value={e.apellido} placeholder="Apellido" onChange={ev=>setF("apellido",ev.target.value)}/></Field>
      </div>
      <Field label="Cargo"><Input value={e.cargo} placeholder="Ej. Coordinación · Prensa · Seguridad" onChange={ev=>setF("cargo",ev.target.value)}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
       <Field label="DNI (clave de la foto)"><Input value={e.dni} inputMode="numeric" placeholder="Solo números" onChange={ev=>setF("dni",ev.target.value)}/></Field>
       <Field label="Email (recibe el pase)"><Input value={e.email} type="email" placeholder="correo@..." onChange={ev=>setF("email",ev.target.value)}/></Field>
      </div>
     </div>
    </div>
    <div style={{fontSize:11,color:C.gray,background:C.dark4,border:`1px dashed ${C.border2}`,borderRadius:8,padding:"9px 12px",marginBottom:14,lineHeight:1.5}}>
     Al guardar, el sistema genera el QR y le envía el <b>pase plateado de STAFF</b> por correo (con botón para Apple/Google Wallet). Es <b>anual</b>: vale toda la temporada. Sube la foto antes de guardar para que salga en el pase.
    </div>
    <Btn full onClick={guardar}>{e.id?"Guardar y reenviar pase":"Crear staff y enviar pase"}</Btn>
   </div>
  </Card>
 </div>);
}

return(<div>
 <Tt/>
 <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
  <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20}}>🪪 Staff GP3</div><div style={{fontSize:10,color:C.red,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Pases anuales · con foto · tarjeta plateada</div></div>
  <div style={{marginLeft:"auto",display:"flex",gap:8}}>
   <Btn small outline onClick={cargar}>↻ Actualizar</Btn>
   <Btn small onClick={abrirNuevo}>+ Nuevo staff</Btn>
  </div>
 </div>
 {lista===null&&<Card><div style={{padding:24,textAlign:"center",color:C.gray}}>Cargando staff...</div></Card>}
 {lista!==null&&lista.length===0&&<Card><div style={{padding:24,textAlign:"center",color:C.gray2}}>Todavía no hay staff cargado. Crea el primero. 👇</div></Card>}
 {lista!==null&&lista.length>0&&(
  <Card>
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
    <thead><tr>{["","Nombre","Cargo","DNI","Código QR","Estado",""].map((h,i)=>(<th key={i} style={{textAlign:"left",fontSize:9,letterSpacing:1,textTransform:"uppercase",color:C.gray,fontFamily:"'Barlow Condensed',sans-serif",padding:"8px 10px",borderBottom:`1px solid ${C.border}`}}>{h}</th>))}</tr></thead>
    <tbody>{lista.map(x=>{const d=dniLimpio(x.dni);return(<tr key={x.id}>
     <td style={{padding:"7px 10px",borderBottom:`1px solid ${C.border}`,width:44}}>
      <div style={{width:38,height:38,borderRadius:8,background:C.dark4,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
       {d?(<img src={fotoSrc(d)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={ev=>{ev.target.style.display="none";}}/>):(<span style={{fontSize:15}}>🪪</span>)}
      </div>
     </td>
     <td style={{padding:"9px 10px",fontSize:13,borderBottom:`1px solid ${C.border}`,fontWeight:700}}>{((x.nombre||"")+" "+(x.apellido||"")).trim()}<div style={{fontSize:11,color:C.gray,fontWeight:400}}>{x.email||"—"}</div></td>
     <td style={{padding:"9px 10px",fontSize:12,borderBottom:`1px solid ${C.border}`}}>{x.cargo||"—"}</td>
     <td style={{padding:"9px 10px",fontSize:12,borderBottom:`1px solid ${C.border}`,color:C.gray}}>{x.dni||"—"}</td>
     <td style={{padding:"9px 10px",borderBottom:`1px solid ${C.border}`}}><span style={{fontFamily:"monospace",fontSize:11,color:C.gray,background:C.dark4,padding:"2px 6px",borderRadius:5}}>{x.codigo||"—"}</span></td>
     <td style={{padding:"9px 10px",borderBottom:`1px solid ${C.border}`}}>{estBadge(x)}{x.ingreso?(<div style={{fontSize:9,color:C.gray2,marginTop:3}}>Último ingreso: {x.ingreso.split(" | ").slice(-1)[0]}</div>):null}</td>
     <td style={{padding:"9px 10px",borderBottom:`1px solid ${C.border}`,textAlign:"right",whiteSpace:"nowrap"}}>
      <Btn small outline onClick={()=>reenviar(x)} style={{display:"inline-flex",marginRight:6}}>✉ Reenviar</Btn>
      <Btn small outline onClick={()=>abrirEdit(x)} style={{display:"inline-flex",marginRight:6}}>✎</Btn>
      <span onClick={()=>borrar(x)} style={{cursor:"pointer",color:C.gray2,fontWeight:900,padding:"2px 7px"}}>✕</span>
     </td>
    </tr>);})}</tbody>
   </table></div>
  </Card>
 )}
 <div style={{fontSize:11,color:C.gray2,marginTop:12,lineHeight:1.6}}>
  El pase de staff es <b>anual con foto</b> (tarjeta plateada). En la puerta se escanea el QR con el escáner de siempre: un ingreso por día, válido toda la temporada.
 </div>
</div>);
}

/* Envoltorio: la pestaña VIP ahora tiene dos cuadros — Sponsors VIP y Staff GP3 */
function VipStaffPanel(){
const [sec,setSec]=useState("vip");
return(<div>
 <div style={{display:"flex",gap:8,marginBottom:16}}>
  {[["vip","⭐ Sponsors VIP"],["staff","🪪 Staff GP3"]].map(([id,lbl])=>(
   <button key={id} onClick={()=>setSec(id)} style={{padding:"10px 18px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,letterSpacing:1,border:`1px solid ${sec===id?C.red:C.border2}`,borderRadius:9,background:sec===id?C.red:"transparent",color:sec===id?"#fff":C.gray,textTransform:"uppercase",transition:"all .2s"}}>{lbl}</button>
  ))}
 </div>
 {sec==="vip"?<VipPanel/>:<StaffPanel/>}
</div>);
}

export default function App(){
const [modo,setModo]=useState(null);
const [mostrarAccesos,setMostrarAccesos]=useState(false);
useEffect(()=>{try{document.title="GP3 Sports LATAM — CAV 2026";}catch(e){}},[]);
const [pinVendedor,setPinVendedor]=useState("");
const [pinErrorVendedor,setPinErrorVendedor]=useState(false);
const [pinAdmin,setPinAdmin]=useState("");
const [pinErrorAdmin,setPinErrorAdmin]=useState(false);
const [pinEntradas,setPinEntradas]=useState("");
const [pinErrorEntradas,setPinErrorEntradas]=useState(false);
const [pinInscripcion,setPinInscripcion]=useState("");
const [pinErrorInscripcion,setPinErrorInscripcion]=useState(false);
const [pinPresentacion,setPinPresentacion]=useState("");
const [pinErrorPresentacion,setPinErrorPresentacion]=useState(false);
// ---- MODO MOTO4 (backend con PIN server-side) ----
const [m4,setM4]=useState({on:false,pin:"",err:"",cargando:false,data:null,tab:"resumen",evSel:"",temporada:"",gEv:"",gItem:"",gMonto:"",gMon:"CLP",pilSel:0});
const m4Set=(o)=>setM4(prev=>({...prev,...o}));
const m4Cache=useRef({}).current;
const m4Get=async(tipo,extra)=>{
  const r=await fetch(MOTO4_URL+"?pin="+encodeURIComponent(m4.pin)+"&tipo="+tipo+(extra||""));
  return await r.json();
};
const m4Reload=async(temp)=>{
  const t=temp||m4.temporada;
  if(t&&m4Cache[t])m4Set({data:m4Cache[t],temporada:t,on:true,cargando:false,err:""});
  try{
    const j=await m4Get("todo",t?"&temporada="+t:"");
    if(j.ok){m4Cache[j.data.temporada]=j.data;m4Set({data:j.data,temporada:j.data.temporada,on:true,cargando:false,err:""});}
    else if(!(t&&m4Cache[t]))m4Set({err:j.error||"error",cargando:false});
  }catch(e){if(!(t&&m4Cache[t]))m4Set({err:"Sin conexión con el backend",cargando:false});}
};
const m4Post=async(accion,body,optimista)=>{
  if(optimista&&m4.data){try{const d=JSON.parse(JSON.stringify(m4.data));optimista(d);m4Cache[m4.temporada]=d;m4Set({data:d});}catch(e){}}
  try{
    await fetch(MOTO4_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({pin:m4.pin,accion,temporada:m4.temporada,usuario:"panel",...body})});
  }catch(e){}
  m4Reload();
};
const m4Entrar=async()=>{
  if(!MOTO4_URL){m4Set({err:"El backend Moto4 aún no está conectado. Ejecuta moto4Setup() y pásale la URL a Claude."});return;}
  m4Set({cargando:true,err:""});
  try{
    const j=await m4Get("login");
    if(j.ok&&j.data){m4Cache[j.data.temporada]=j.data;m4Set({data:j.data,temporada:j.data.temporada,on:true,cargando:false,err:""});}
    else if(j.ok){await m4Reload();}
    else m4Set({err:"PIN incorrecto",cargando:false});
  }catch(e){m4Set({err:"Sin conexión con el backend",cargando:false});}
};
const m4F=n=>"$"+Math.round(n||0).toLocaleString("es-CL");
const m4FM=n=>"$"+((n||0)/1000000).toFixed(1).replace(".",",")+"M";
const m4RealEvento=(ev)=>((m4.data&&m4.data.gastos)||[]).filter(g=>g.evento===ev&&String(g.anulado)!=="SI").reduce((s,g)=>s+(parseFloat(g.monto_clp)||0),0);
const m4TieneAjuste=(ev)=>((m4.data&&m4.data.gastos)||[]).some(g=>g.evento===ev&&g.item==="AJUSTE AL REAL"&&String(g.anulado)!=="SI");
const m4PonerReal=(ev,realActual)=>{
  const n=prompt("¿Cuánto pagaste EN TOTAL por "+ev+"? Escribe el monto final en CLP y el sistema cuadra la diferencia solo:",realActual||"");
  if(n===null||n==="")return;
  const tot=parseFloat(String(n).replace(/\./g,""))||0;
  m4Post("real_fijar",{evento:ev,total:tot},d=>{
    d.gastos.forEach(g=>{if(g.evento===ev&&g.item==="AJUSTE AL REAL")g.anulado="SI";});
    const base=d.gastos.filter(g=>g.evento===ev&&String(g.anulado)!=="SI").reduce((s,g)=>s+(parseFloat(g.monto_clp)||0),0);
    const dif=Math.round(tot-base);
    if(dif!==0)d.gastos.push({temporada:m4.temporada,evento:ev,item:"AJUSTE AL REAL",monto_clp:dif,moneda:"CLP",monto_original:dif,fecha:"",usuario:"panel",nota:"Real fijado en "+tot,_fila:"nuevo"});
  });
};
const m4Estado=(pres,real)=>{
  if(!real)return["#c9c9d4","Programado","#eceef3","#5c5c70"];
  const d=(real-pres)/(pres||1);
  if(d>0.10||real-pres>3000000)return["#E8001D","Desvío "+(d*100).toFixed(1)+"%","rgba(232,0,29,.1)","#E8001D"];
  if(d>0.05)return["#c8920a","Atención +"+(d*100).toFixed(1)+"%","rgba(200,146,10,.15)","#c8920a"];
  return["#00a884",(d>=0?"+":"")+(d*100).toFixed(1)+"% OK","rgba(0,168,132,.13)","#00a884"];
};
const [tab,setTab]=useState("venta");
const [toast,setToast]=useState(null);
const [filtro,setFiltro]=useState("todos");
const [busqStats,setBusqStats]=useState("");
const [editVenta,setEditVenta]=useState(null);
const [busqPiloto,setBusqPiloto]=useState("");

const [ventas,setVentasRaw]=useState(()=>lsGet("gp3_ventas",[]));
const [pending,setPendingRaw]=useState(()=>lsGet("gp3_ventas_pending",[]));
const [eventoForzado,setEventoForzado]=useState(()=>lsGet("gp3_evento_forzado",""));
const [cierresDia,setCierresDiaRaw]=useState(()=>lsGet("gp3_cierres_dia",[]));
const [stock,setStockRaw]=useState(()=>{const saved=lsGet("gp3_stock",null);if(!saved)return STOCK0;return{...STOCK0,...saved};});
const [pilotos,setPilotosRaw]=useState(()=>lsGet("gp3_pilotos",[]));
const [cats,setCatsRaw]=useState(()=>lsGet("gp3_cats",[]));
const [precios,setPreciosRaw]=useState(()=>lsGet("gp3_precios",Object.fromEntries(PRODUCTOS.map(p=>[p.id,{...p.precios}]))));
const [costosNeu,setCostosNeuRaw]=useState(()=>{const saved=lsGet("gp3_costos",null);return saved?{...COSTOS_DEFAULT,...saved}:COSTOS_DEFAULT;});
const [cierres,setCierresRaw]=useState(()=>lsGet("gp3_cierres",[]));
const [productosExtra,setProductosExtraRaw]=useState(()=>{const extras=lsGet("gp3_productos_extra",[]);const fixedIds=new Set(PRODUCTOS.map(p=>p.id));const clean=extras.filter(e=>!fixedIds.has(e.id)&&e.label&&!e.id.match(/extra_\d{13}/));if(clean.length!==extras.length){lsSet("gp3_productos_extra",clean);}return clean;});
const [nombresEdit,setNombresEditRaw]=useState(()=>lsGet("gp3_nombres",{}));
const [stockDraft,setStockDraft]=useState(null);
const [eventoACerrar,setEventoACerrar]=useState("");
const [preciosCostosEstado,setPreciosCostosEstado]=useState("idle");

const setVentas=v=>{lsSet("gp3_ventas",v);setVentasRaw(v);};
const setPending=v=>{lsSet("gp3_ventas_pending",v);setPendingRaw(v);};
const marcarBorradoLocal=id=>{const lb=lsGet("gp3_borrados_local",[]).filter(x=>x!==id);lsSet("gp3_borrados_local",[id,...lb]);stockDirtyRef.current=0;};
const setCierresDia=v=>{lsSet("gp3_cierres_dia",v);setCierresDiaRaw(v);};
const closedIds=useMemo(()=>{const s=new Set();(cierresDia||[]).forEach(c=>(c.ids||[]).forEach(id=>s.add(Number(id))));return s;},[cierresDia]);
const ventasAbiertas=useMemo(()=>ventas.filter(v=>!closedIds.has(v.id)),[ventas,closedIds]);
const stockDirtyRef=useRef(0);
const setStock=v=>{lsSet("gp3_stock",v);setStockRaw(v);stockDirtyRef.current=Date.now();};
const setPilotos=v=>{lsSet("gp3_pilotos",v);setPilotosRaw(v);};
const setCats=v=>{lsSet("gp3_cats",v);setCatsRaw(v);};
const setPrecios=v=>{lsSet("gp3_precios",v);setPreciosRaw(v);setPreciosCostosEstado("idle");};
const setCostosNeu=v=>{lsSet("gp3_costos",v);setCostosNeuRaw(v);setPreciosCostosEstado("idle");};
// Guarda precios_json y costos_json juntos (comparten una sola tarjeta/botón en Gestión) y verifica que hayan quedado.
const guardarPreciosCostosAhora=async()=>{
  setPreciosCostosEstado("guardando");
  const tsP=Date.now();lsSet("gp3_precios_ts",tsP);
  const tsC=Date.now();lsSet("gp3_costos_ts",tsC);
  const [r1,r2]=await Promise.all([
    guardarConfigVerificado("precios_json",{precios,_ts:tsP}),
    guardarConfigVerificado("costos_json",{costos:costosNeu,_ts:tsC}),
  ]);
  setPreciosCostosEstado((r1.ok&&r2.ok)?"ok":"error");
};
const setCierres=v=>{lsSet("gp3_cierres",v);setCierresRaw(v);};
const setProductosExtra=v=>{lsSet("gp3_productos_extra",v);setProductosExtraRaw(v);};
const setNombresEdit=v=>{lsSet("gp3_nombres",v);setNombresEditRaw(v);};

const todosLosProductos=useMemo(()=>[...PRODUCTOS.map(p=>({...p,label:nombresEdit[p.id]||p.label})),...productosExtra],[productosExtra,nombresEdit]);

const boom=(msg,err=false)=>{setToast({msg,err});setTimeout(()=>setToast(null),3000);};
const isAdmin=modo==="admin";
const todosLosPilotos=useMemo(()=>[...PILOTOS_BASE,...pilotos],[pilotos]);
const todasLasCats=useMemo(()=>[...new Set([...CATS_BASE,...cats])],[cats]);
const circActivo=getCircuitoActivo();
const eventoActivo=(eventoForzado&&CIRCUITOS_BASE.find(c=>c.id===eventoForzado))?eventoForzado:circActivo.id;
useEffect(()=>{setFiltro(eventoActivo);},[eventoActivo]);
const circuitos=isAdmin?CIRCUITOS_BASE:[...new Set([eventoActivo,...getCircuitosVendedor().map(c=>c.id)])].map(id=>CIRCUITOS_BASE.find(c=>c.id===id)).filter(Boolean);

const FORM0={circ_id:eventoActivo,fecha:HOY,piloto:"",num_piloto:"",categoria:todasLasCats[0]||"",moneda:"USD",metodo:"efectivo_usd",email_cliente:"",tipo_factura:"CF",cuit:"",empresa:""};
const [form,setForm]=useState(FORM0);
const [pilotoQ,setPilotoQ]=useState("");
const [showSug,setShowSug]=useState(false);
const [carrito,setCarrito]=useState([]);
const [cantSel,setCantSel]=useState(Object.fromEntries(todosLosProductos.map(p=>[p.id,0])));
const [pagos,setPagos]=useState([]);
const [pagoSplit,setPagoSplit]=useState(false);
const subVenta=tab==="entradas"?"entradas":"neumaticos";
const ENTRADAS_DEFAULT=[
 {id:"gen",  nombre:"General",        precio:0, cat:"general"},
 {id:"pc",   nombre:"Parque Cerrado", precio:0, cat:"parque_cerrado"},
 {id:"viph", nombre:"VIP Honda",      precio:0, cat:"general", vip:true, free:true},
 {id:"vipm", nombre:"VIP Mobil",      precio:0, cat:"general", vip:true, free:true},
 {id:"vipg", nombre:"VIP GP3 Sports", precio:0, cat:"general", vip:true, free:true},
];
const mergeEntradas=saved=>{if(!Array.isArray(saved))return ENTRADAS_DEFAULT;const byId={};saved.forEach(t=>{if(t&&t.id)byId[t.id]=t;});return ENTRADAS_DEFAULT.map(def=>{const s=byId[def.id];return s?{...def,precio:(s.precio!=null?s.precio:def.precio),free:(s.free!=null?s.free:def.free),moneda:s.moneda||def.moneda}:def;});};
const [tiposEntrada,setTiposEntradaRaw]=useState(()=>mergeEntradas(lsGet("gp3_tipos_entrada",null)));
const [tiposEntradaEstado,setTiposEntradaEstado]=useState("idle");
const setTiposEntrada=v=>{lsSet("gp3_tipos_entrada",v);setTiposEntradaRaw(v);setTiposEntradaEstado("idle");};
const guardarTiposEntradaAhora=async()=>{
  setTiposEntradaEstado("guardando");
  const ts=Date.now();lsSet("gp3_tipos_entrada_ts",ts);
  const r=await guardarConfigVerificado("tipos_entrada_json",{tipos:tiposEntrada,_ts:ts});
  setTiposEntradaEstado(r.ok?"ok":"error");
};
const [aranceles,setArancelesRaw]=useState(()=>lsGet("gp3_aranceles",{}));
const [arancelesEstado,setArancelesEstado]=useState("idle");
const setAranceles=v=>{lsSet("gp3_aranceles",v);setArancelesRaw(v);setArancelesEstado("idle");};
const guardarArancelesAhora=async()=>{
  setArancelesEstado("guardando");
  const ts=Date.now();lsSet("gp3_aranceles_ts",ts);
  const r=await guardarConfigVerificado("aranceles_json",{aranceles,_ts:ts});
  setArancelesEstado(r.ok?"ok":"error");
};
const [entrTipo,setEntrTipo]=useState(null);
const [entrCant,setEntrCant]=useState(1);
const [entrCatPulsera,setEntrCatPulsera]=useState("");
const [entrFoto,setEntrFoto]=useState(null);
const [entrCliente,setEntrCliente]=useState({nombre:"",email:""});
const [editEntradaId,setEditEntradaId]=useState(null);
const [entrEstadoEd,setEntrEstadoEd]=useState(null);
const tcApp=(lsGet("gp3_admin",{})||{}).tc||1400;
const convAmoneda=(monto,moneda,destino)=>{if(moneda===destino)return monto||0;return destino==="ARS"?(monto||0)*tcApp:(monto||0)/tcApp;};
const toggleMoneda=(valor,moneda)=>{const nm=moneda==="USD"?"ARS":"USD";const v=convAmoneda(Number(valor)||0,moneda,nm);return {moneda:nm,valor:nm==="USD"?Math.round(v*100)/100:Math.round(v)};};
useEffect(()=>{if(carrito.length===0&&!editVenta){setForm(f=>f.circ_id===eventoActivo?f:{...f,circ_id:eventoActivo});}},[eventoActivo]);
const forzarEvento=(id)=>{setEventoForzado(id);lsSet("gp3_evento_forzado",id);syncSheets("set_config",{key:"evento_forzado",value:id});setForm(f=>({...f,circ_id:id||circActivo.id}));setTimeout(cargarDesdeSheet,2000);boom(id?("📍 Evento forzado: "+(CIRCUITOS_BASE.find(c=>c.id===id)?.nombre||id)):"🔄 Evento automático por fecha");};
const cerrarDia=async(abiertasHoy,vendedorLabel)=>{
 if(!abiertasHoy||abiertasHoy.length===0){boom("No hay ventas abiertas hoy",true);return;}
 if(!window.confirm("¿Cerrar el día?\n\nSe archivan "+abiertasHoy.length+" venta(s). No se borran: siguen en el total del evento."))return;
 const tot={};let units=0;const metodos={};
 abiertasHoy.forEach(v=>{units+=v.total_unidades||0;getPagos(v).forEach(p=>{tot[p.moneda]=(tot[p.moneda]||0)+p.monto;const k=p.metodo||"otro";if(!metodos[k])metodos[k]={usd:0,ars:0,cnt:0};if(p.moneda==="USD")metodos[k].usd+=p.monto;else metodos[k].ars+=p.monto;metodos[k].cnt++;});});
 let inscritos=0;
 try{const r=await fetch(SHEETS_URL+"?tipo=inscripciones&t="+Date.now());const j=await r.json();const arr=Array.isArray(j)?j:(j.inscripciones||j.data||[]);const evx=CIRCUITOS_BASE.find(c=>c.id===eventoActivo);inscritos=arr.filter(p=>(p.circ_id===eventoActivo)||(evx&&p.circuito===evx.nombre)).length;}catch(e){}
 const evx=CIRCUITOS_BASE.find(c=>c.id===eventoActivo);
 const cierre={id:Date.now(),fecha:HOY,hora:new Date().toLocaleTimeString("es-AR"),evento:evx?evx.nombre:eventoActivo,circ_id:eventoActivo,vendedor:vendedorLabel||(isAdmin?"Administración":"Francisca"),totales:tot,unidades:units,numVentas:abiertasHoy.length,metodos,inscritos,ids:abiertasHoy.map(v=>v.id)};
 setCierresDia([cierre,...cierresDia]);
 syncSheets("cierre_dia",{cierre});
 setTimeout(cargarDesdeSheet,2500);
 boom("✅ Día cerrado — "+abiertasHoy.length+" venta(s) · "+inscritos+" inscritos");
};
const cerrarEvento=async(targetId)=>{
 const tid=targetId||eventoActivo;
 const abiertas=ventas.filter(v=>!closedIds.has(v.id)&&v.circ_id===tid);
 const evx=CIRCUITOS_BASE.find(c=>c.id===tid);
 const nombre=evx?evx.nombre:tid;
 if(abiertas.length===0){boom("No hay ventas abiertas en "+nombre,true);return;}
 if(!window.confirm("¿Cerrar el evento "+nombre+"?\n\nSe archivan "+abiertas.length+" venta(s). NO se borran: siguen sumando en el consolidado (utilidad y ventas)."))return;
 const tot={};let units=0;const metodos={};
 abiertas.forEach(v=>{units+=v.total_unidades||0;getPagos(v).forEach(p=>{tot[p.moneda]=(tot[p.moneda]||0)+p.monto;const k=p.metodo||"otro";if(!metodos[k])metodos[k]={usd:0,ars:0,cnt:0};if(p.moneda==="USD")metodos[k].usd+=p.monto;else metodos[k].ars+=p.monto;metodos[k].cnt++;});});
 let inscritos=0;
 try{const r=await fetch(SHEETS_URL+"?tipo=inscripciones&t="+Date.now());const j=await r.json();const arr=Array.isArray(j)?j:(j.inscripciones||j.data||[]);inscritos=arr.filter(p=>(p.circ_id===tid)||(evx&&p.circuito===nombre)).length;}catch(e){}
 const cierre={id:Date.now(),fecha:HOY,hora:new Date().toLocaleTimeString("es-AR"),evento:nombre,circ_id:tid,vendedor:isAdmin?"Administración":"Francisca",tipo:"evento",totales:tot,unidades:units,numVentas:abiertas.length,metodos,inscritos,ids:abiertas.map(v=>v.id)};
 setCierresDia([cierre,...cierresDia]);
 syncSheets("cierre_dia",{cierre});
 if(eventoForzado===tid)forzarEvento("");
 setTimeout(cargarDesdeSheet,2500);
 boom("🏁 Evento "+nombre+" archivado — "+abiertas.length+" venta(s). Sigue en el consolidado.");
};

const sugerencias=useMemo(()=>{
 if(!showSug)return[];
 if(pilotoQ.length===0)return todosLosPilotos.slice(0,12);
 const q=pilotoQ.toLowerCase();
 return todosLosPilotos.filter(p=>p.nombre.toLowerCase().includes(q)||p.num.includes(q)).slice(0,12);
},[pilotoQ,todosLosPilotos,showSug]);

const selPiloto=p=>{setForm(f=>({...f,piloto:p.nombre,num_piloto:p.num,categoria:p.cat}));setPilotoQ(p.nombre);setShowSug(false);};

const carritoConPrecios=carrito.map(item=>{const p=todosLosProductos.find(x=>x.id===item.prod_id);const pu=getPrecio(p,form.moneda,precios);return{...item,prod:p,precio_unit:pu,total:pu*item.cantidad};});
const carritoTotal=carritoConPrecios.reduce((s,i)=>s+i.total,0);
const carritoUnits=carrito.reduce((s,i)=>s+i.cantidad,0);
const entrTipoObj=tiposEntrada.find(t=>t.id===entrTipo)||null;
const entrMoneda=entrTipoObj?(entrTipoObj.moneda||"ARS"):"ARS";
const entrPrecioU=entrTipoObj?(entrTipoObj.free?0:(entrTipoObj.precio||0)):0;
const entrTotal=entrPrecioU*(entrCant||0);
const entrEsGratis=!!(entrTipoObj&&(entrTipoObj.free||entrPrecioU===0));
const ventaTotal=subVenta==="entradas"?entrTotal:carritoTotal;
const ventaMoneda=subVenta==="entradas"?entrMoneda:form.moneda;
const metodoDefault=ventaMoneda==="USD"?"efectivo_usd":"efectivo_ars";
useEffect(()=>{if(!pagoSplit){setPagos([{metodo:ventaMoneda==="USD"?"efectivo_usd":"efectivo_ars",moneda:ventaMoneda,monto:ventaTotal}]);}},[ventaTotal,ventaMoneda,pagoSplit]);
const pagosCubierto=pagos.reduce((s,p)=>s+convAmoneda(p.monto||0,p.moneda,ventaMoneda),0);
const pagosFalta=Math.round((ventaTotal-pagosCubierto)*100)/100;
const pagosMixto=pagos.some(p=>p.moneda!==ventaMoneda);const pagosTol=ventaMoneda==="USD"?0.5:(pagosMixto?Math.max(2,Math.ceil((tcApp||1400)*0.01)):1);const pagosOk=ventaTotal>0&&Math.abs(pagosFalta)<=pagosTol;
const setPago=(idx,patch)=>setPagos(prev=>prev.map((p,i)=>i===idx?{...p,...patch}:p));
const addPago=()=>{setPagoSplit(true);setPagos(prev=>[...prev,{metodo:"efectivo_ars",moneda:ventaMoneda,monto:Math.max(0,pagosFalta>0?pagosFalta:0)}]);};
const delPago=idx=>setPagos(prev=>{const n=prev.filter((_,i)=>i!==idx);if(n.length<=1)setPagoSplit(false);return n.length?n:[{metodo:metodoDefault,moneda:ventaMoneda,monto:ventaTotal}];});

const agregarProducto=prodId=>{
 const cant=cantSel[prodId]??0;
 if(cant<=0){boom("Ingresa una cantidad mayor a 0",true);return;}
 const flotDisp=stock[prodId]?.flotante??0;
 const enCar=carrito.find(i=>i.prod_id===prodId)?.cantidad??0;
 if(cant+enCar>flotDisp){boom("Stock flotante insuficiente — solo hay "+flotDisp,true);return;}
 setCarrito(prev=>{const idx=prev.findIndex(i=>i.prod_id===prodId);if(idx>=0){const u=[...prev];u[idx]={...u[idx],cantidad:u[idx].cantidad+cant};return u;}return[...prev,{prod_id:prodId,cantidad:cant}];});
 boom(todosLosProductos.find(x=>x.id===prodId)?.label+" ×"+cant+" → carrito");
 setCantSel(c=>({...c,[prodId]:0}));
};

const registrar=()=>{
 if(!form.piloto.trim()){boom("Ingresa el nombre del piloto",true);return;}
 if(!form.email_cliente.trim()){boom("Ingresa el email del cliente",true);return;}
 if(form.tipo_factura==="FAC"&&!form.cuit.trim()){boom("Ingresa el CUIT",true);return;}
 if(carrito.length===0){boom("Agrega al menos un neumático",true);return;}
 if(!pagosOk){boom(pagosFalta>0?("Falta cubrir "+fmt(Math.abs(pagosFalta),form.moneda)):("Sobra "+fmt(Math.abs(pagosFalta),form.moneda)+" en los pagos"),true);return;}
 const pagosClean=pagos.filter(p=>(p.monto||0)>0).map(p=>({metodo:p.metodo,moneda:p.moneda,monto:Math.round((p.monto||0)*100)/100}));
 const metodosDistintos=[...new Set(pagosClean.map(p=>p.metodo))];
 const metodoField=encodeMetodo(pagosClean);
 const nuevaVenta={id:Date.now(),tipo_venta:"neumatico",circ_id:form.circ_id,fecha:form.fecha,piloto:form.piloto,num_piloto:form.num_piloto,categoria:form.categoria,email_cliente:form.email_cliente,tipo_factura:form.tipo_factura,cuit:form.cuit,empresa:form.empresa,metodo:metodoField,moneda:form.moneda,pagos:pagosClean,items:carritoConPrecios.map(i=>({prod_id:i.prod_id,cantidad:i.cantidad,precio_unit:i.precio_unit,total:i.total})),total_monto:carritoTotal,total_unidades:carritoUnits};
 setVentas([nuevaVenta,...ventas]);
 setPending([nuevaVenta,...pending]);
 syncSheets("venta",{venta:nuevaVenta});
 const nuevoStock={...stock};
 carrito.forEach(item=>{nuevoStock[item.prod_id]={...nuevoStock[item.prod_id],flotante:Math.max(0,(nuevoStock[item.prod_id]?.flotante??0)-item.cantidad)};});
 setStock(nuevoStock);
 syncSheets("stock_bulk",{stock:nuevoStock});
 setTimeout(cargarDesdeSheet,2500);
 boom("✓ Venta registrada — "+carritoUnits+" neumático"+(carritoUnits!==1?"s":"")+(pagosClean.length>1?" · "+pagosClean.length+" pagos":""));
 setCarrito([]);setForm({...FORM0});setPilotoQ("");setShowSug(false);setEditVenta(null);setPagoSplit(false);setPagos([]);
 setCantSel(Object.fromEntries(todosLosProductos.map(p=>[p.id,0])));
};

const cargarFotoEntrada=ev=>{const file=ev.target.files&&ev.target.files[0];if(!file)return;if(file.size>6*1024*1024){boom("La foto es muy grande (máx 6 MB)",true);ev.target.value="";return;}const r=new FileReader();r.onload=()=>setEntrFoto({name:file.name,dataUrl:String(r.result)});r.readAsDataURL(file);ev.target.value="";};
const registrarEntrada=()=>{
 if(!entrTipoObj){boom("Elegí el tipo de entrada",true);return;}
 if((entrCant||0)<=0){boom("Ingresá la cantidad",true);return;}
 const nom=entrTipoObj.nombre.toLowerCase();
 const esTercOMenor=nom.includes("tercera")||nom.includes("menor");
 const esInvitado=nom.includes("invitado");
 const esDiaAnterior=nom.includes("anterior");
 const esTicketera=nom.includes("ticketera");
 const necesitaCat=esTercOMenor||esInvitado||esDiaAnterior;
 if(necesitaCat&&!entrCatPulsera){boom("Elegí la categoría de pulsera (General o Parque Cerrado)",true);return;}
 let catPulsera=entrCatPulsera;
 if(!catPulsera){if(nom.includes("general"))catPulsera="general";else if(nom.includes("parque"))catPulsera="parque_cerrado";else catPulsera=entrTipoObj.cat||"";}
 let medioFinal,estadoFinal,pagosClean,metodoField;
 if(entrEsGratis){
   medioFinal=esTicketera?"ticketera":esInvitado?"invitado":(esTercOMenor||esDiaAnterior)?"gratuito":"gratuito";
   estadoFinal="confirmada";
   pagosClean=[{metodo:medioFinal,moneda:entrMoneda,monto:0}];
   metodoField=medioFinal;
 }else{
   if(!pagosOk){boom(pagosFalta>0?("Falta cubrir "+fmt(Math.abs(pagosFalta),entrMoneda)):("Sobra "+fmt(Math.abs(pagosFalta),entrMoneda)),true);return;}
   const transf=pagos.some(p=>p.metodo==="transferencia"&&(p.monto||0)>0);
   if(transf&&!entrFoto){boom("La foto del comprobante es obligatoria para transferencias",true);return;}
   pagosClean=pagos.filter(p=>(p.monto||0)>0).map(p=>({metodo:p.metodo,moneda:p.moneda,monto:Math.round((p.monto||0)*100)/100}));
   medioFinal=pagosClean.length>1?"mixto":(pagosClean[0]?.metodo||"otro");
   estadoFinal=(editEntradaId&&entrEstadoEd)?entrEstadoEd:(transf?"pendiente":"confirmada");
   metodoField=encodeMetodo(pagosClean);
 }
 const nuevaVenta={id:Date.now(),tipo_venta:"entrada",circ_id:eventoActivo,fecha:HOY,piloto:entrCliente.nombre||"—",num_piloto:"",categoria:entrTipoObj.nombre,email_cliente:entrCliente.email||"",tipo_factura:"CF",cuit:"",empresa:"",metodo:metodoField,moneda:entrMoneda,pagos:pagosClean,estado_entrada:estadoFinal,categoria_pulsera:catPulsera||"",foto_comprobante:entrFoto?entrFoto.dataUrl:"",items:[{prod_id:"entrada_"+entrTipoObj.id,cantidad:entrCant,precio_unit:entrPrecioU,total:entrTotal}],total_monto:entrTotal,total_unidades:entrCant};
 if(editEntradaId){const old=editEntradaId;marcarBorradoLocal(old);setVentas(prev=>[nuevaVenta,...prev.filter(x=>x.id!==old)]);setPending(prev=>[nuevaVenta,...prev.filter(x=>x.id!==old)]);syncSheets("venta_delete",{id:old});setTimeout(()=>syncSheets("venta",{venta:nuevaVenta}),600);}
 else{setVentas(prev=>[nuevaVenta,...prev]);setPending(prev=>[nuevaVenta,...prev]);syncSheets("venta",{venta:nuevaVenta});}
 setTimeout(cargarDesdeSheet,editEntradaId?3200:2500);
 const txtEstado=entrEsGratis?(esTicketera?"Ticketera (sin cobro)":"Sin cobro"):estadoFinal==="pendiente"?"Pendiente (transferencia)":"Confirmada";
 boom((editEntradaId?"✏️ Entrada actualizada — ":"🎫 "+entrCant+" entrada(s) — ")+txtEstado+(pagosClean.length>1?" · "+pagosClean.length+" pagos":""));
 setEntrTipo(null);setEntrCant(1);setEntrCatPulsera("");setEntrFoto(null);setEntrCliente({nombre:"",email:""});setPagoSplit(false);setPagos([]);setEditEntradaId(null);setEntrEstadoEd(null);
};

const abrirEditarEntrada=(v)=>{
 const pid=(v.items&&v.items[0]&&v.items[0].prod_id)||"";
 const tid=pid.replace("entrada_","");
 setEditEntradaId(v.id);
 setEntrEstadoEd(v.estado_entrada||"confirmada");
 setEntrTipo(tid);
 setEntrCant(v.total_unidades||1);
 setEntrCatPulsera(v.categoria_pulsera||"");
 setEntrCliente({nombre:(v.piloto&&v.piloto!=="—")?v.piloto:"",email:v.email_cliente||""});
 setEntrFoto(v.foto_comprobante?{name:"comprobante.jpg",dataUrl:v.foto_comprobante}:null);
 const ps=(Array.isArray(v.pagos)&&v.pagos.length)?v.pagos.map(p=>({metodo:p.metodo,moneda:p.moneda||v.moneda||"ARS",monto:Number(p.monto)||0})):[{metodo:v.metodo||"efectivo_ars",moneda:v.moneda||"ARS",monto:Number(v.total_monto)||0}];
 setPagos(ps);setPagoSplit(ps.length>1);
 try{window.scrollTo({top:0,behavior:"smooth"});}catch(e){}
};
const cancelarEditEntrada=()=>{setEditEntradaId(null);setEntrEstadoEd(null);setEntrTipo(null);setEntrCant(1);setEntrCatPulsera("");setEntrFoto(null);setEntrCliente({nombre:"",email:""});setPagoSplit(false);setPagos([]);};
const _normNom=s=>(""+(s||"")).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const registrarVIPEntrada=async(tipo,code)=>{
 const cod=(""+(code||"")).trim();if(!cod)return;
 if(ventas.some(v=>v.vip_code&&v.vip_code===cod)){boom("⚠️ Ese QR ya ingresó",true);return;}
 const vc=await fetchVipCodes();
 if(vc.set&&vc.set.size>0&&!vc.set.has(cod)){boom("❌ QR no reconocido — no fue emitido",true);return;}
 const meta=(vc.info&&vc.info[cod])||{};
 const sponsor=meta.sponsor||tipo.nombre;
 const nuevaVenta={id:Date.now(),tipo_venta:"entrada",circ_id:eventoActivo,fecha:HOY,piloto:meta.nombre||"",num_piloto:"",categoria:"vip",email_cliente:meta.email||"",empresa:"VIP "+sponsor,tipo_factura:"CF",cuit:cod,metodo:"vip_qr",moneda:"ARS",pagos:[{metodo:"vip_qr",monto:0,moneda:"ARS"}],items:[{prod_id:"entrada_"+tipo.id,cantidad:1,precio_unit:0,total:0}],total_monto:0,total_unidades:1,vip_code:cod};
 setVentas([nuevaVenta,...ventas]);setPending([nuevaVenta,...pending]);
 syncSheets("venta",{venta:nuevaVenta});
 boom("✓ "+sponsor+" ingresado · QR "+cod.slice(0,14));
};
const inscPagadas=useMemo(()=>{const m={};ventas.filter(v=>v.tipo_venta==="inscripcion").forEach(v=>{const k=_normNom(v.piloto)+"|"+(v.circ_id||"");m[k]=v;const k2=_normNom(v.piloto);m[k2]=v;});return m;},[ventas]);
const registrarPilotoNuevo=(pil)=>{
 const nom=(pil.nombre||"").trim();if(!nom)return;
 const existe=todosLosPilotos.some(p=>(p.nombre||"").trim().toLowerCase()===nom.toLowerCase());
 if(existe)return;
 setPilotos([...pilotos,{num:((pil.numero||pil.num||"")+"").trim(),nombre:nom,cat:pil.categoria||pil.cat||""}]);
};
const registrarPreinscripcion=(d)=>{
 const c=CIRCUITOS_BASE.find(x=>x.id===d.circ_id);
 syncSheets("inscripcion",{nombre:d.nombre||"",apellido:d.apellido||"",dni:d.dni||"",nacimiento:d.nacimiento||"",provincia:d.provincia||"",localidad:d.localidad||"",domicilio:d.domicilio||"",telefono:d.telefono||"",telefono_acomp:d.telefono_acomp||"",email:d.email||"",categoria:d.categoria||"",numero:d.numero||"",marca:d.marca||"",modelo:d.modelo||"",equipo:d.equipo||"",sponsor:d.sponsor||"",jefe_equipo:d.jefe_equipo||"",carpa:d.carpa||"",jueves:d.jueves||"",circ_id:d.circ_id||"",circuito:c?c.nombre:"",fecha_registro:new Date().toLocaleString("es-AR")});
 boom("✓ Piloto cargado como preinscripción — "+((d.nombre||"")+" "+(d.apellido||"")).trim());
};
const registrarInscripcion=async(pilot,pagosClean,total,moneda,extra={})=>{
 const cat=pilot.categoria||"";
 const circId=pilot.circ_id||(CIRCUITOS_BASE.find(c=>c.nombre===pilot.circuito)?.id)||eventoActivo;
 const nombre=((pilot.nombre||"")+" "+(pilot.apellido||"")).trim()||"—";
 const metodoField=encodeMetodo(pagosClean);
 const _pp=extra.pulsera_piloto||"";const _pa=Array.isArray(extra.pulseras_acomp)?extra.pulseras_acomp:[];const _com=(extra.comentario||"").trim();const _c2=(extra.cat2&&extra.cat2.categoria)?{c:extra.cat2.categoria,v:Number(extra.cat2.valor)||0,m:extra.cat2.moneda||moneda}:null;
 const _man=!!extra.manual;const _eo={};if(_pp)_eo.pp=_pp;if(_pa.length)_eo.pa=_pa;if(_com)_eo.com=_com;if(_c2)_eo.c2=_c2;if(_man)_eo.man=1;const empresaData=Object.keys(_eo).length?JSON.stringify(_eo):"";
 const nuevaVenta={id:Date.now(),tipo_venta:"inscripcion",circ_id:circId,fecha:HOY,piloto:nombre,num_piloto:pilot.numero||"",categoria:cat,email_cliente:pilot.email||"",tipo_factura:extra.tipo_factura==="FAC"?"FAC":"CF",cuit:extra.cuit||"",empresa:empresaData,metodo:metodoField,moneda,pagos:pagosClean,pulsera_piloto:_pp,pulseras_acomp:_pa,comentario:_com,insc_cat2:_c2,insc_manual:_man,items:[{prod_id:"inscripcion_"+cat.replace(/\s+/g,"-"),cantidad:1,precio_unit:total,total}],total_monto:total,total_unidades:1};
 setVentas([nuevaVenta,...ventas]);
 setPending([nuevaVenta,...pending]);
 boom("Guardando cobro de "+nombre+"…");
 await syncSheets("venta",{venta:nuevaVenta});
 await new Promise(r=>setTimeout(r,900));
 const ok=await verificarVentaGuardada(nuevaVenta.id);
 cargarDesdeSheet();
 if(ok){boom("✓ Inscripción pagada — "+nombre+(pagosClean.length>1?" · "+pagosClean.length+" pagos":""));}
 else{boom("✗ No se pudo confirmar el guardado de "+nombre+" — revisá conexión / PANEL_KEY y volvé a intentar",true);}
};
const editarPagoInscripcion=async(ventaVieja,pilot,pagosClean,total,moneda,extra={})=>{
 const cat=pilot.categoria||"";
 const circId=pilot.circ_id||(CIRCUITOS_BASE.find(c=>c.nombre===pilot.circuito)?.id)||eventoActivo;
 const nombre=((pilot.nombre||"")+" "+(pilot.apellido||"")).trim()||"—";
 const _pp=extra.pulsera_piloto||"";const _pa=Array.isArray(extra.pulseras_acomp)?extra.pulseras_acomp:[];const _com=(extra.comentario||"").trim();const _c2=(extra.cat2&&extra.cat2.categoria)?{c:extra.cat2.categoria,v:Number(extra.cat2.valor)||0,m:extra.cat2.moneda||moneda}:null;
 const _man=!!extra.manual;const _eo={};if(_pp)_eo.pp=_pp;if(_pa.length)_eo.pa=_pa;if(_com)_eo.com=_com;if(_c2)_eo.c2=_c2;if(_man)_eo.man=1;const empresaData=Object.keys(_eo).length?JSON.stringify(_eo):"";
 const nv={id:Date.now(),tipo_venta:"inscripcion",circ_id:circId,fecha:HOY,piloto:nombre,num_piloto:pilot.numero||"",categoria:cat,email_cliente:pilot.email||"",tipo_factura:extra.tipo_factura==="FAC"?"FAC":"CF",cuit:extra.cuit||"",empresa:empresaData,metodo:encodeMetodo(pagosClean),moneda,pagos:pagosClean,pulsera_piloto:_pp,pulseras_acomp:_pa,comentario:_com,insc_cat2:_c2,insc_manual:_man,items:[{prod_id:"inscripcion_"+cat.replace(/\s+/g,"-"),cantidad:1,precio_unit:total,total}],total_monto:total,total_unidades:1};
 marcarBorradoLocal(ventaVieja.id);
 setVentas(prev=>[nv,...prev.filter(x=>x.id!==ventaVieja.id)]);
 setPending(prev=>[nv,...prev.filter(x=>x.id!==ventaVieja.id)]);
 boom("Guardando cambios del pago de "+nombre+"…");
 await syncSheets("venta_delete",{id:ventaVieja.id});
 await syncSheets("venta",{venta:nv});
 await new Promise(r=>setTimeout(r,900));
 const ok=await verificarVentaGuardada(nv.id);
 cargarDesdeSheet();
 if(ok){boom("✓ Pago actualizado — "+nombre+(pagosClean.length>1?" · "+pagosClean.length+" pagos":""));}
 else{boom("✗ No se pudo confirmar el guardado del pago de "+nombre+" — revisá conexión / PANEL_KEY y volvé a intentar",true);}
};
const borrarVentaInsc=(id)=>{setVentas(prev=>prev.filter(x=>x.id!==id));setPending(prev=>prev.filter(x=>x.id!==id));marcarBorradoLocal(id);syncSheets("venta_delete",{id});setTimeout(cargarDesdeSheet,1500);boom("✓ Cobro borrado");};

const esNeu=v=>!v.tipo_venta||v.tipo_venta==="neumatico";
const totales=useMemo(()=>{const t={};ventas.filter(esNeu).forEach(v=>{t[v.moneda]=(t[v.moneda]||0)+v.total_monto;});return t;},[ventas]);
const headerVentas=useMemo(()=>{
 const evt=eventoActivo;
 if(modo==="entradas")return ventasAbiertas.filter(v=>v.tipo_venta==="entrada"&&v.circ_id===evt);
 if(modo==="inscripcion")return ventas.filter(v=>v.tipo_venta==="inscripcion"&&v.circ_id===evt);
 return ventasAbiertas.filter(v=>esNeu(v)&&v.circ_id===evt);
},[ventas,ventasAbiertas,modo,eventoActivo]);
const totalesAbiertas=useMemo(()=>{const t={};headerVentas.forEach(v=>{t[v.moneda]=(t[v.moneda]||0)+v.total_monto;});return t;},[headerVentas]);
const vF=useMemo(()=>{let r=(filtro==="todos"?ventas:ventas.filter(v=>v.circ_id===filtro)).filter(esNeu);if(busqStats.trim().length>1){const q=busqStats.toLowerCase();r=r.filter(v=>v.piloto.toLowerCase().includes(q)||v.num_piloto.includes(q)||v.categoria.toLowerCase().includes(q));}return r;},[ventas,filtro,busqStats]);

const cargarDesdeSheet=async()=>{try{
 const res=await fetch(withKey(SHEETS_URL+"?t="+Date.now()));
 const json=await res.json();
 if(!json||!json.ok)return;
 const ef=(json.config&&json.config.evento_forzado)?json.config.evento_forzado.toString():"";
 setEventoForzado(ef);lsSet("gp3_evento_forzado",ef);
 if(json.config&&json.config.precios_json){try{const rp=JSON.parse(json.config.precios_json);const rts=rp._ts||0;const lts=Number(lsGet("gp3_precios_ts",0))||0;if(rp.precios&&rts>lts){lsSet("gp3_precios",rp.precios);lsSet("gp3_precios_ts",rts);setPreciosRaw(rp.precios);}}catch(e){}}
 if(json.config&&json.config.costos_json){try{const rc=JSON.parse(json.config.costos_json);const rts=rc._ts||0;const lts=Number(lsGet("gp3_costos_ts",0))||0;if(rc.costos&&rts>lts){const merged={...COSTOS_DEFAULT,...rc.costos};lsSet("gp3_costos",merged);lsSet("gp3_costos_ts",rts);setCostosNeuRaw(merged);}}catch(e){}}
 if(json.config&&json.config.tipos_entrada_json){try{const re=JSON.parse(json.config.tipos_entrada_json);const rts=re._ts||0;const lts=Number(lsGet("gp3_tipos_entrada_ts",0))||0;if(Array.isArray(re.tipos)&&re.tipos.length&&rts>lts){const mer=mergeEntradas(re.tipos);lsSet("gp3_tipos_entrada",mer);lsSet("gp3_tipos_entrada_ts",rts);setTiposEntradaRaw(mer);}}catch(e){}}
 if(json.config&&json.config.aranceles_json){try{const ra=JSON.parse(json.config.aranceles_json);const rts=ra._ts||0;const lts=Number(lsGet("gp3_aranceles_ts",0))||0;if(ra.aranceles&&rts>lts){lsSet("gp3_aranceles",ra.aranceles);lsSet("gp3_aranceles_ts",rts);setArancelesRaw(ra.aranceles);}}catch(e){}}
 if(Array.isArray(json.cierresDia)){const cds=[];for(let i=1;i<json.cierresDia.length;i++){const row=json.cierresDia[i];if(!row||!row[4])continue;try{cds.push(JSON.parse(row[4]));}catch(e){}}setCierresDiaRaw(cds);lsSet("gp3_cierres_dia",cds);}
 if(Array.isArray(json.stock)){const fromSheet={};for(let i=1;i<json.stock.length;i++){const row=json.stock[i];const id=(row&&row[0]!=null)?row[0].toString().trim():"";if(!id)continue;fromSheet[id]={bodega:Number(row[3])||0,transito:Number(row[4])||0,flotante:Number(row[5])||0};}if(Object.keys(fromSheet).length>0&&(Date.now()-stockDirtyRef.current>60000)){const ns={...STOCK0,...fromSheet};lsSet("gp3_stock",ns);setStockRaw(ns);}}
 if(Array.isArray(json.ventas)){
   const remoto=[];
   for(let i=1;i<json.ventas.length;i++){
     const row=json.ventas[i];if(!row||row[0]==null||row[0]==="")continue;
     const id=Number(row[0]);if(!id)continue;
     const moneda=(row[11]||"USD").toString();
     const items=(row[12]||"").toString().split("|").map(s=>s.trim()).filter(Boolean).map(tok=>{const m=tok.match(/^(.+)x(\d+)$/);return m?{prod_id:m[1],cantidad:parseInt(m[2],10)}:null;}).filter(Boolean);
     const totalMonto=Number(row[13])||0;
     const unidades=items.reduce((s,it)=>s+it.cantidad,0);
     const brutos=items.map(it=>{const p=todosLosProductos.find(x=>x.id===it.prod_id);return (p?getPrecio(p,moneda,precios):0)*it.cantidad;});
     const sumaBrutos=brutos.reduce((a,b)=>a+b,0);
     const factor=sumaBrutos>0?totalMonto/sumaBrutos:0;
     const itemsFull=items.map((it,k)=>({prod_id:it.prod_id,cantidad:it.cantidad,precio_unit:it.cantidad>0?Math.round(brutos[k]*factor/it.cantidad):0,total:Math.round(brutos[k]*factor)}));
     const _dec=decodeMetodo((row[10]||"").toString(),moneda,totalMonto);
     const _pid0=(items[0]&&items[0].prod_id)||"";
     const _tv=(""+_pid0).indexOf("entrada_")===0?"entrada":(""+_pid0).indexOf("inscripcion_")===0?"inscripcion":"neumatico";
     let _pp="",_pa=[],_com="",_c2=null,_man=false;if(_tv==="inscripcion"){const _emp=(row[9]||"").toString();if(_emp.indexOf("{")===0){try{const _o=JSON.parse(_emp);_pp=_o.pp||"";_pa=Array.isArray(_o.pa)?_o.pa:[];_com=_o.com||"";_c2=_o.c2||null;_man=!!_o.man;}catch(e){}}}
     remoto.push({id,tipo_venta:_tv,fecha:(row[1]||"").toString(),circ_id:(row[2]||"").toString(),num_piloto:(row[3]||"").toString(),piloto:(row[4]||"").toString(),categoria:(row[5]||"").toString(),email_cliente:(row[6]||"").toString(),tipo_factura:row[7]==="Factura"?"FAC":"CF",cuit:(row[8]||"").toString(),empresa:(row[9]||"").toString(),metodo:_dec.metodo,vip_code:(_dec.metodo==="vip_qr"?(row[8]||"").toString():undefined),pulsera_piloto:_pp,pulseras_acomp:_pa,comentario:_com,insc_cat2:_c2,insc_manual:_man,pagos:_dec.pagos,moneda,items:itemsFull,total_monto:totalMonto,total_unidades:unidades});
   }
   const serverBorr=new Set((json.borrados||[]).map(x=>Number(x)).filter(Boolean));
   const localBorr=lsGet("gp3_borrados_local",[]).map(Number).filter(Boolean);
   const localBorrClean=localBorr.filter(id=>!serverBorr.has(id));
   if(localBorrClean.length!==localBorr.length)lsSet("gp3_borrados_local",localBorrClean);
   const borradosSet=new Set([...serverBorr,...localBorrClean]);
   const remotoOk=remoto.filter(v=>!borradosSet.has(v.id));
   const pend=lsGet("gp3_ventas_pending",[]);
   const remotoIds=new Set(remotoOk.map(v=>v.id));
   const stillPending=pend.filter(p=>!remotoIds.has(p.id)&&!borradosSet.has(p.id));
   if(stillPending.length!==pend.length){lsSet("gp3_ventas_pending",stillPending);setPendingRaw(stillPending);}
   stillPending.forEach(p=>{syncSheets("venta",{venta:p});});
   const byId=new Map();remotoOk.forEach(v=>byId.set(v.id,v));stillPending.forEach(v=>byId.set(v.id,v));
   const merged=[...byId.values()].sort((a,b)=>b.id-a.id);
   lsSet("gp3_ventas",merged);setVentasRaw(merged);
 }
}catch(e){}};
useEffect(()=>{cargarDesdeSheet();const id=setInterval(cargarDesdeSheet,12000);return()=>clearInterval(id);},[]);
// (Antes había acá un efecto que, al iniciar sesión como admin, empujaba precios_json al
// servidor sin verificar ni comparar versiones — podía pisar datos reales del servidor con
// una copia local vieja solo por abrir el panel. Se quitó: ahora precios/costos solo se
// guardan con el botón "Guardar precios y costos", que sí verifica el guardado.)

const tabs=modo==="admin"?[["venta","🛒 Neumáticos"],["entradas","🎫 Entradas"],["stock","📦 Stock"],["estadisticas","📊 Stats"],["cierre","🗂 Cierre"],["gestion","⚙️ Gestión"],["admin","📈 Administración"],["vip","⭐ VIP"],["inscripciones","📋 Inscripciones"],["calendario","📅 Calendario"]]
 :modo==="entradas"?[["entradas","🎫 Entradas"]]
 :modo==="inscripcion"?[["inscripciones","📋 Inscripciones"]]
 :[["venta","🛒 Neumáticos"],["mis_stats","📊 Mi Resumen"]];

// ==================== VISTA MODO MOTO4 ====================
if(m4.on&&m4.data){
 const D=m4.data;
 const tcTemp=(D.temporadas.find(x=>String(x.anio)===String(m4.temporada))||{}).tc||920;
 const presTotal=D.bloques.reduce((s,b)=>s+(parseFloat(b.presupuesto)||0),0);
 const realTot=D.gastos.filter(g=>String(g.anulado)!=="SI").reduce((s,g)=>s+(parseFloat(g.monto_clp)||0),0);
 const ingTotal=D.sponsors.reduce((s,x)=>s+(parseFloat(x.comprometido)||0),0);
 const cobrado=D.sponsors.reduce((s,x)=>s+(parseFloat(x.cobrado)||0),0);
 const cuotasDe=(pid)=>D.cuotas.filter(c=>c.piloto_id===pid).sort((a,b)=>a.numero-b.numero);
 const hoyM4=new Date();hoyM4.setHours(0,0,0,0);
 const diasM4=(v)=>Math.round((new Date(v)-hoyM4)/86400000);
 const fFechaM4=(v)=>{const d=new Date(v);return isNaN(d)?"—":d.toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"});};
 const tabsM4=[["resumen","📊 Resumen"],["eventos","🏁 Eventos"],["sponsors","🤝 Sponsors"],["gasto","📱 Cargar gasto"],["pilotos","💰 Pilotos"]];
 const th={background:"#16161d",color:"#fff",textAlign:"left",padding:"8px 10px",fontSize:11,letterSpacing:1,textTransform:"uppercase"};
 const td={padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:13.5};
 const tdn={...td,textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600};
 const kpi=(n,l,extra)=>(<div style={{background:C.dark3,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",flex:1,minWidth:170}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:26,lineHeight:1}}>{n}</div><div style={{fontSize:10.5,color:C.gray,letterSpacing:1,textTransform:"uppercase",marginTop:5}}>{l}</div>{extra}</div>);
 const pill=(bg,col,txt)=>(<span style={{background:bg,color:col,borderRadius:12,padding:"1px 10px",fontSize:11,fontWeight:700}}>{txt}</span>);
 const mini={fontSize:12,fontWeight:700,background:"#fff",border:`1px dashed ${C.gray2}`,color:C.gray,borderRadius:8,padding:"5px 11px",cursor:"pointer"};
 const evActivos=D.eventos;
 const evSel=m4.evSel||((evActivos[0]||{}).evento||"");
 const itemsDe=(ev)=>D.items.filter(i=>i.evento===ev);
 const realItem=(ev,it)=>D.gastos.filter(g=>g.evento===ev&&g.item===it&&String(g.anulado)!=="SI").reduce((s,g)=>s+(parseFloat(g.monto_clp)||0),0);
 const pilotoPag=(pid)=>cuotasDe(pid).filter(c=>String(c.pagada)==="SI").reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
 const pilSel=D.pilotos[Math.min(m4.pilSel,Math.max(0,D.pilotos.length-1))];
 return(
 <><style>{GS}</style>
 <div style={{minHeight:"100vh",background:C.dark}}>
  <div style={{height:3,background:`linear-gradient(90deg,${C.red},#ff6b6b,${C.red})`}}/>
  <header style={{background:C.dark2,borderBottom:`1px solid ${C.border}`,padding:"10px 16px"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,maxWidth:1200,margin:"0 auto",flexWrap:"wrap"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><Logo size="sm"/><Badge color="#3E86C6">MOTO4</Badge></div>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
     <select value={m4.temporada} onChange={e=>{m4Set({temporada:e.target.value,cargando:true});m4Reload(e.target.value);}} style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15,padding:"6px 10px",border:`2px solid ${C.red}`,borderRadius:8,color:C.red,background:"#fff"}}>
      {D.temporadas.map(x=>(<option key={x.anio} value={x.anio}>TEMPORADA {x.anio}</option>))}
     </select>
     <button style={mini} onClick={()=>{const y=prompt("¿Qué año? (ej: 2027)");if(!y)return;m4Post("temporada_nueva",{anio:y,desde:m4.temporada}).then(()=>m4Reload(y));}}>+ Nueva temporada</button>
     <span style={{fontSize:12,color:C.gray}}>Dólar: <b>${tcTemp}</b> <span style={{cursor:"pointer"}} onClick={()=>{const v=prompt("Tipo de cambio USD→CLP:",tcTemp);if(v)m4Post("tc",{tc:v});}}>✏️</span></span>
     <button onClick={()=>m4Set({on:false,pin:"",data:null})} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,padding:"8px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>SALIR</button>
    </div>
   </div>
  </header>
  <div style={{maxWidth:1200,margin:"0 auto",padding:"12px 16px 40px"}}>
   <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
    {tabsM4.map(([k,l])=>(<button key={k} onClick={()=>m4Set({tab:k})} style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,letterSpacing:1,padding:"8px 16px",border:`1px solid ${m4.tab===k?C.red:C.border}`,background:m4.tab===k?C.red:C.dark3,color:m4.tab===k?"#fff":C.gray,borderRadius:9,cursor:"pointer",textTransform:"uppercase"}}>{l}</button>))}
   </div>

   {m4.tab==="resumen"&&(<>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
     {kpi(m4FM(presTotal),"Presupuesto temporada")}
     {kpi(m4FM(realTot),"Gasto real acumulado",<div style={{fontSize:11.5,fontWeight:700,marginTop:3}}>{presTotal?(realTot/presTotal*100).toFixed(0):0}% del presupuesto</div>)}
     {kpi(m4FM(ingTotal-presTotal),"Margen si se cumple presupuesto",<div style={{fontSize:11.5,fontWeight:700,marginTop:3,color:cobrado-realTot>=0?C.green:C.red}}>Real a la fecha: {m4FM(cobrado-realTot)}</div>)}
     {kpi(m4FM(cobrado),"Cobrado (sponsors + pilotos)",<div style={{fontSize:11.5,fontWeight:700,marginTop:3}}>{ingTotal?(cobrado/ingTotal*100).toFixed(0):0}% de lo comprometido · Por cobrar: {m4FM(ingTotal-cobrado)}</div>)}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0 8px"}}><b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,letterSpacing:1}}>SEMÁFORO POR EVENTO</b><button style={mini} onClick={()=>{const n=prompt("Nombre del evento nuevo:");if(!n)return;const p=prompt("Presupuesto CLP:","9000000");m4Post("evento_nuevo",{nombre:n,presupuesto:p});}}>+ Agregar evento</button></div>
    <table style={{width:"100%",borderCollapse:"collapse",background:C.dark3,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
     <thead><tr><th style={th}>Evento</th><th style={th}>Estado</th><th style={{...th,textAlign:"right"}}>Presupuesto</th><th style={{...th,textAlign:"right"}}>Real</th><th style={{...th,textAlign:"right"}}>Desvío</th></tr></thead>
     <tbody>{evActivos.map((e,i)=>{const real=m4RealEvento(e.evento);const pres=parseFloat(e.presupuesto)||0;const[col,txt,bg,fg]=m4Estado(pres,real);
      return(<tr key={i}><td style={td}><b>{e.evento}</b> <span style={{cursor:"pointer",opacity:.5}} onClick={()=>{const n=prompt("Nuevo nombre / locación:",e.evento);if(n&&n!==e.evento)m4Post("evento_ren",{viejo:e.evento,nuevo:n},d=>{d.eventos.forEach(v=>{if(v.evento===e.evento)v.evento=n;});d.items.forEach(v=>{if(v.evento===e.evento)v.evento=n;});d.gastos.forEach(v=>{if(v.evento===e.evento)v.evento=n;});});}}>✏️</span></td>
      <td style={td}><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:col,marginRight:6}}/>{pill(bg,fg,txt)}</td>
      <td style={tdn}>{m4F(pres)} <span style={{cursor:"pointer",opacity:.5}} onClick={()=>{const n=prompt("Nuevo presupuesto CLP de "+e.evento+":",pres);if(n===null||n==="")return;m4Post("evento_edit",{evento:e.evento,presupuesto:n},d=>{const x=d.eventos.find(v=>v.evento===e.evento);if(x)x.presupuesto=parseFloat(n)||0;});}}>✏️</span></td><td style={tdn}>{real?m4F(real):"—"}{m4TieneAjuste(e.evento)&&<span title="Incluye valor puesto a mano" style={{fontSize:10,opacity:.55}}> ✍️</span>} <span style={{cursor:"pointer",opacity:.5}} title="Poner gasto real" onClick={()=>m4PonerReal(e.evento,real)}>✏️</span></td><td style={{...tdn,color:real>pres?C.red:C.green}}>{real?m4F(real-pres):"—"}</td></tr>);})}
     </tbody></table>
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0 8px"}}><b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,letterSpacing:1}}>BLOQUES DE TEMPORADA</b><button style={mini} onClick={()=>{const n=prompt("Nombre del bloque nuevo:");if(!n)return;const p=prompt("Presupuesto CLP:","0");m4Post("bloque_nuevo",{nombre:n,presupuesto:p});}}>+ Agregar bloque</button></div>
    <table style={{width:"100%",borderCollapse:"collapse",background:C.dark3,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
     <thead><tr><th style={th}>Bloque</th><th style={{...th,textAlign:"right"}}>Presupuesto</th><th style={th}>Nota</th></tr></thead>
     <tbody>{D.bloques.map((b,i)=>(<tr key={i}><td style={td}>{b.bloque} <span style={{cursor:"pointer",opacity:.5}} onClick={()=>{const n=prompt("Nombre:",b.bloque);if(!n)return;const p=prompt("Presupuesto CLP:",b.presupuesto);m4Post("bloque_edit",{viejo:b.bloque,nuevo:n,presupuesto:p});}}>✏️</span></td><td style={tdn}>{m4F(b.presupuesto)}</td><td style={{...td,color:C.gray,fontSize:12}}>{b.nota}</td></tr>))}
      <tr><td style={{...td,fontWeight:800}}>Total temporada {m4.temporada}</td><td style={{...tdn,fontWeight:800}}>{m4F(presTotal)}</td><td style={td}></td></tr>
     </tbody></table>
   </>)}

   {m4.tab==="eventos"&&(<>
    <select value={evSel} onChange={e=>m4Set({evSel:e.target.value})} style={{fontSize:15,padding:"9px 12px",border:`1px solid ${C.border2}`,borderRadius:9,marginBottom:12,width:"100%",maxWidth:420}}>
     {evActivos.map(e=>(<option key={e.evento} value={e.evento}>{e.evento}</option>))}
    </select>
    <table style={{width:"100%",borderCollapse:"collapse",background:C.dark3,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
     <thead><tr><th style={th}>Ítem</th><th style={{...th,textAlign:"right"}}>Presupuesto</th><th style={{...th,textAlign:"right"}}>Real</th><th style={{...th,textAlign:"right"}}>Desvío</th><th style={th}>Estado</th></tr></thead>
     <tbody>{itemsDe(evSel).map((it,i)=>{const r=realItem(evSel,it.item);const p=parseFloat(it.presupuesto)||0;const[col,txt,bg,fg]=m4Estado(p,r);
      return(<tr key={i}><td style={td}>{it.item}</td><td style={tdn}>{m4F(p)}</td><td style={tdn}>{r?m4F(r):"—"}</td><td style={{...tdn,color:r>p?C.red:C.green}}>{r?m4F(r-p):"—"}</td><td style={td}>{pill(bg,fg,txt)}</td></tr>);})}
     </tbody></table>
    <button style={{...mini,marginTop:10}} onClick={()=>{const n=prompt("Ítem nuevo para "+evSel+":");if(!n)return;const p=prompt("Presupuesto CLP:","0");m4Post("item_nuevo",{evento:evSel,item:n,presupuesto:p});}}>+ Agregar ítem a este evento</button>
   </>)}

   {m4.tab==="sponsors"&&(
    <table style={{width:"100%",borderCollapse:"collapse",background:C.dark3,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
     <thead><tr><th style={th}>Sponsor</th><th style={{...th,textAlign:"right"}}>Comprometido</th><th style={{...th,textAlign:"right"}}>Facturado</th><th style={{...th,textAlign:"right"}}>Cobrado</th><th style={th}>% cobrado</th><th style={th}></th></tr></thead>
     <tbody>{D.sponsors.map((x,i)=>{const c=parseFloat(x.comprometido)||0,fa=parseFloat(x.facturado)||0,co=parseFloat(x.cobrado)||0;const pct=c?co/c*100:0;
      return(<tr key={i}><td style={td}><b>{x.sponsor}</b></td><td style={tdn}>{m4F(c)}</td><td style={tdn}>{m4F(fa)}</td><td style={{...tdn,color:C.green}}>{m4F(co)}</td>
      <td style={td}><div style={{height:8,background:"#eceef3",borderRadius:5,overflow:"hidden",minWidth:90}}><div style={{width:Math.min(100,pct)+"%",height:"100%",background:pct>=100?C.green:"#3E86C6"}}/></div><span style={{fontSize:11,color:C.gray}}>{pct.toFixed(0)}%</span></td>
      <td style={td}><button style={mini} onClick={()=>{const fN=prompt("Facturado CLP de "+x.sponsor+":",fa);const cN=prompt("Cobrado CLP:",co);m4Post("sponsor_edit",{sponsor:x.sponsor,facturado:fN===null?undefined:fN,cobrado:cN===null?undefined:cN},d=>{const s=d.sponsors.find(v=>v.sponsor===x.sponsor);if(s){if(fN!==null&&fN!=="")s.facturado=parseFloat(fN)||0;if(cN!==null&&cN!=="")s.cobrado=parseFloat(cN)||0;}});}}>✏️ Actualizar</button></td></tr>);})}
     </tbody></table>
   )}

   {m4.tab==="gasto"&&(<>
    <div style={{maxWidth:460,background:C.dark3,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
     <b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,letterSpacing:1}}>CARGAR GASTO REAL</b>
     {[["Evento",<select key="e" value={m4.gEv||evSel} onChange={e=>m4Set({gEv:e.target.value})} style={{width:"100%",fontSize:15,padding:"9px 12px",border:`1px solid ${C.border2}`,borderRadius:9}}>{evActivos.map(e=>(<option key={e.evento} value={e.evento}>{e.evento}</option>))}</select>],
       ["Ítem",<select key="i" value={m4.gItem} onChange={e=>m4Set({gItem:e.target.value})} style={{width:"100%",fontSize:15,padding:"9px 12px",border:`1px solid ${C.border2}`,borderRadius:9}}><option value="">— elegir —</option>{itemsDe(m4.gEv||evSel).map(it=>(<option key={it.item} value={it.item}>{it.item}</option>))}<option value="OTRO">OTRO</option></select>],
       ["Monto",<input key="m" type="number" value={m4.gMonto} onChange={e=>m4Set({gMonto:e.target.value})} placeholder="0" style={{width:"100%",fontSize:15,padding:"9px 12px",border:`1px solid ${C.border2}`,borderRadius:9}}/>],
       ["Moneda",<select key="mo" value={m4.gMon} onChange={e=>m4Set({gMon:e.target.value})} style={{width:"100%",fontSize:15,padding:"9px 12px",border:`1px solid ${C.border2}`,borderRadius:9}}><option>CLP</option><option>USD</option><option>BRL</option><option>ARS</option></select>]
     ].map(([l,inp],i)=>(<div key={i}><div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase",color:C.gray,fontWeight:700,margin:"12px 0 4px"}}>{l}</div>{inp}</div>))}
     <button onClick={()=>{if(!m4.gMonto||!(m4.gItem)){alert("Elige ítem y monto");return;}{const evG=m4.gEv||evSel;if(m4TieneAjuste(evG)&&!confirm("Ojo: el real de "+evG+" lo pusiste a mano. Este gasto se sumará encima; si quieres dejarlo cuadrado, vuelve a usar Poner gasto real después. ¿Cargar igual?"))return;const mo=m4.gMon,or=parseFloat(m4.gMonto)||0,clp=mo==="USD"?or*tcTemp:mo==="BRL"?or*170:mo==="ARS"?or*0.75:or;m4Post("gasto",{evento:m4.gEv||evSel,item:m4.gItem,monto:m4.gMonto,moneda:m4.gMon},d=>{d.gastos.push({temporada:m4.temporada,evento:m4.gEv||evSel,item:m4.gItem,monto_clp:Math.round(clp),moneda:mo,monto_original:or,fecha:"",usuario:"panel",_fila:"nuevo"});});m4Set({gMonto:""});}}} style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:16,letterSpacing:2,background:C.red,color:"#fff",border:0,borderRadius:9,padding:"12px 24px",cursor:"pointer",textTransform:"uppercase",marginTop:16,width:"100%"}}>GUARDAR GASTO</button>
     <div style={{fontSize:12,color:C.gray,marginTop:10}}>Queda en la planilla con fecha, moneda, dólar del día (${tcTemp}) y usuario. USD se convierte automático.</div>
    </div>
    {(D.gastos||[]).filter(g=>String(g.anulado)!=="SI").length>0&&(<div style={{marginTop:16}}>
     <b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,letterSpacing:1}}>ÚLTIMOS GASTOS CARGADOS</b>
     <table style={{width:"100%",maxWidth:760,borderCollapse:"collapse",background:C.dark3,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`,marginTop:8}}>
      <thead><tr><th style={th}>Evento</th><th style={th}>Ítem</th><th style={{...th,textAlign:"right"}}>Monto CLP</th><th style={th}>Fecha</th><th style={th}></th></tr></thead>
      <tbody>{(D.gastos||[]).filter(g=>String(g.anulado)!=="SI").slice(-10).reverse().map((g,i)=>(<tr key={i}>
       <td style={td}>{g.evento}</td><td style={td}>{g.item==="AJUSTE AL REAL"?<span style={{color:C.gray}}>✍️ Ajuste al real</span>:g.item}</td><td style={tdn}>{m4F(g.monto_clp)}{g.moneda&&g.moneda!=="CLP"?<span style={{fontSize:11,color:C.gray}}> ({g.moneda} {g.monto_original})</span>:null}</td>
       <td style={{...td,fontSize:12,color:C.gray}}>{g.fecha?String(g.fecha).slice(0,10):"recién"}</td>
       <td style={td}>{typeof g._fila==="number"?<button style={{...mini,color:C.red,borderColor:C.red}} onClick={()=>{if(!confirm("¿Anular este gasto de "+m4F(g.monto_clp)+" en "+g.evento+"? Se descuenta del Real (queda registrado como anulado en la planilla)."))return;m4Post("gasto_anular",{fila:g._fila},d=>{const x=d.gastos.find(v=>v._fila===g._fila);if(x)x.anulado="SI";});}}>✖ Anular</button>:<span style={{fontSize:11,color:C.gray}}>guardando…</span>}</td></tr>))}
      </tbody></table>
     <div style={{fontSize:12,color:C.gray,marginTop:6}}>Anular no borra: el gasto queda marcado en la planilla y deja de sumar al Real.</div>
    </div>)}
   </>)}

   {m4.tab==="pilotos"&&(<>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,letterSpacing:1}}>COBRO PILOTOS</b><button style={mini} onClick={()=>{const n=prompt("Nombre del piloto:");if(!n)return;const em=prompt("Correo:","");const to=prompt("Total a pagar CLP:","10000000");const nc=prompt("¿En cuántas cuotas?","4");m4Post("piloto_nuevo",{nombre:n,email:em,total:to,cuotas:nc});}}>+ Agregar piloto</button></div>
    <table style={{width:"100%",borderCollapse:"collapse",background:C.dark3,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
     <thead><tr><th style={th}>Piloto</th><th style={{...th,textAlign:"right"}}>Total</th><th style={{...th,textAlign:"right"}}>Pagado</th><th style={{...th,textAlign:"right"}}>Pendiente</th><th style={th}>Estado</th></tr></thead>
     <tbody>{D.pilotos.map((p,i)=>{const pag=pilotoPag(p.id);const tot=parseFloat(p.total)||0;const pend=cuotasDe(p.id).filter(c=>String(c.pagada)!=="SI");
      const prox=pend[0];const dv=prox?diasM4(prox.vence):null;
      const est=!pend.length?pill("rgba(0,168,132,.13)",C.green,"✔ Pagado completo"):dv<0?pill("rgba(232,0,29,.1)",C.red,"⚠ Vencida hace "+(-dv)+" días"):dv<=5?pill("rgba(200,146,10,.15)","#c8920a","Vence en "+dv+" días · 📧"):pill("#eceef3",C.gray,"Próxima: "+fFechaM4(prox.vence));
      return(<tr key={p.id} style={{cursor:"pointer",background:i===m4.pilSel?"#eef4fb":"transparent"}} onClick={()=>m4Set({pilSel:i})}>
       <td style={td}><b>{p.nombre}</b> {p.pais} <span style={{cursor:"pointer",opacity:.5}} onClick={ev=>{ev.stopPropagation();const n=prompt("Nombre:",p.nombre);const em=prompt("Correo:",p.email);m4Post("piloto_edit",{id:p.id,nombre:n||undefined,email:em===null?undefined:em});}}>✏️</span></td>
       <td style={tdn}>{m4F(tot)}</td><td style={{...tdn,color:C.green}}>{m4F(pag)}</td><td style={{...tdn,color:tot-pag>0?C.red:C.green}}>{m4F(tot-pag)}</td><td style={td}>{est}</td></tr>);})}
     </tbody></table>
    {pilSel&&(<div style={{marginTop:14,background:C.dark3,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
     <b style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,letterSpacing:1}}>CUOTAS DE {String(pilSel.nombre).toUpperCase()}</b> <span style={{fontSize:12,color:C.gray}}>· {pilSel.email||"sin correo"} · recordatorio automático 5 días antes {String((D.config.find(c=>c.clave==="ENVIO_REAL")||{}).valor).toUpperCase()==="SI"?"(envío real ✅)":"(modo prueba → antonio@)"}</span>
     <table style={{width:"100%",borderCollapse:"collapse",marginTop:10}}>
      <thead><tr><th style={th}>Cuota</th><th style={{...th,textAlign:"right"}}>Monto</th><th style={th}>Vence</th><th style={th}>Estado</th><th style={th}></th></tr></thead>
      <tbody>{cuotasDe(pilSel.id).map((c,j)=>(<tr key={j}><td style={td}>{c.numero} de {cuotasDe(pilSel.id).length}</td><td style={tdn}>{m4F(c.monto)}</td>
       <td style={td}>{fFechaM4(c.vence)} <span style={{cursor:"pointer",opacity:.5}} onClick={()=>{const m=prompt("Monto CLP:",c.monto);const v=prompt("Vence (AAAA-MM-DD):",String(c.vence).slice(0,10));m4Post("cuota_edit",{piloto_id:pilSel.id,numero:c.numero,monto:m||undefined,vence:v||undefined});}}>✏️</span></td>
       <td style={td}>{String(c.pagada)==="SI"?pill("rgba(0,168,132,.13)",C.green,"Pagada"):diasM4(c.vence)<0?pill("rgba(232,0,29,.1)",C.red,"Vencida"):pill("#eceef3",C.gray,"Pendiente")}</td>
       <td style={td}>{String(c.pagada)!=="SI"&&(<button style={mini} onClick={()=>m4Post("cuota_pagar",{piloto_id:pilSel.id,numero:c.numero},d=>{const q=d.cuotas.find(v=>String(v.piloto_id)===String(pilSel.id)&&String(v.numero)===String(c.numero));if(q)q.pagada="SI";})}>✔ Marcar pagada</button>)}</td></tr>))}
      </tbody></table>
    </div>)}
   </>)}
  </div>
 </div></>
 );
}

if(!modo)return(
 <><style>{GS}</style>
 <div style={{minHeight:"100vh",background:C.dark,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:28}}>
   <div style={{position:"fixed",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.red},#ff6b6b,${C.red})`}}/>
   <div className="slide-up" style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
     <Logo size="lg"/>
     <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:4,color:C.red,textTransform:"uppercase",fontWeight:700}}>CAV — Campeonato Argentino de Velocidad 2026</span>
   </div>
   {!mostrarAccesos?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><Btn color={C.red} onClick={()=>setMostrarAccesos(true)} style={{padding:"15px 60px",fontSize:19,letterSpacing:4}}>ENTRAR</Btn><span style={{fontSize:11,color:C.gray2,letterSpacing:2,textTransform:"uppercase"}}>Elegí tu modo de acceso</span></div>):(
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,width:"100%",maxWidth:760}}>
     {(()=>{const accesos=[
       {key:"vendedor",ico:"🛞",titulo:"MODO NEUMÁTICOS",desc:"Vender neumáticos en pista",col:C.green,pin:pinVendedor,setPin:setPinVendedor,err:pinErrorVendedor,setErr:setPinErrorVendedor,ok:VENDEDOR_PIN,tab:"venta",ph:"PIN vendedor"},
       {key:"entradas",ico:"🎫",titulo:"MODO ENTRADAS",desc:"Vender entradas al público",col:"#2b8fd0",pin:pinEntradas,setPin:setPinEntradas,err:pinErrorEntradas,setErr:setPinErrorEntradas,ok:ENTRADAS_PIN,tab:"entradas",ph:"PIN entradas"},
       {key:"inscripcion",ico:"📋",titulo:"MODO INSCRIPCIÓN",desc:"Gestionar pilotos inscritos",col:C.yellow,pin:pinInscripcion,setPin:setPinInscripcion,err:pinErrorInscripcion,setErr:setPinErrorInscripcion,ok:INSCRIPCION_PIN,tab:"inscripciones",ph:"PIN inscripción"},
       {key:"admin",ico:"📈",titulo:"MODO ADMIN",desc:"Maneja y ve todo",col:C.red,pin:pinAdmin,setPin:setPinAdmin,err:pinErrorAdmin,setErr:setPinErrorAdmin,ok:ADMIN_PIN,tab:"venta",ph:"PIN de acceso"},
     ];const entrar=a=>{if(a.pin===a.ok){setModo(a.key);setTab(a.tab);a.setPin("");a.setErr(false);}else{a.setErr(true);}};
     return accesos.map(a=>(
       <div key={a.key} className="anim-in" style={{background:C.dark3,border:`1px solid ${C.border}`,borderRadius:14,padding:22,textAlign:"center",borderTop:`3px solid ${a.col}`,display:"flex",flexDirection:"column"}}>
         <div style={{fontSize:30,marginBottom:8}}>{a.ico}</div>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:C.text,letterSpacing:1,marginBottom:3}}>{a.titulo}</div>
         <div style={{fontSize:11,color:C.gray,marginBottom:12,minHeight:30}}>{a.desc}</div>
         <Input type="password" inputMode="numeric" placeholder={a.ph} value={a.pin} onChange={e=>{a.setPin(e.target.value);a.setErr(false);}} onKeyDown={e=>e.key==="Enter"&&entrar(a)} style={{marginBottom:8,textAlign:"center"}}/>
         {a.err&&<div style={{fontSize:11,color:C.red,marginBottom:8,fontWeight:600}}>PIN incorrecto</div>}
         <Btn full color={a.col} onClick={()=>entrar(a)} style={{marginTop:"auto"}}>INGRESAR</Btn>
       </div>
     ));})()}
     {(()=>{const entrarPres=()=>{if(pinPresentacion===PRESENTACION_PIN){setPinPresentacion("");setPinErrorPresentacion(false);window.open("https://gp3sports.lat/presentaciones.html?k=PRESENTA2026","_blank");}else{setPinErrorPresentacion(true);}};
     return(
     <div className="anim-in" style={{background:C.dark3,border:`1px solid ${C.border}`,borderRadius:14,padding:22,textAlign:"center",borderTop:`3px solid #6CACE4`,display:"flex",flexDirection:"column"}}>
       <div style={{fontSize:30,marginBottom:8}}>📊</div>
       <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:C.text,letterSpacing:1,marginBottom:3}}>MODO PRESENTACIÓN</div>
       <div style={{fontSize:11,color:C.gray,marginBottom:12,minHeight:30}}>Dossiers y material comercial para el equipo de ventas</div>
       <Input type="password" inputMode="numeric" placeholder="PIN presentación" value={pinPresentacion} onChange={e=>{setPinPresentacion(e.target.value);setPinErrorPresentacion(false);}} onKeyDown={e=>e.key==="Enter"&&entrarPres()} style={{marginBottom:8,textAlign:"center"}}/>
       {pinErrorPresentacion&&<div style={{fontSize:11,color:C.red,marginBottom:8,fontWeight:600}}>PIN incorrecto</div>}
       <Btn full color={"#6CACE4"} onClick={entrarPres} style={{marginTop:"auto"}}>INGRESAR</Btn>
     </div>);})()}
     <div className="anim-in" style={{background:C.dark3,border:`1px solid ${C.border}`,borderRadius:14,padding:22,textAlign:"center",borderTop:`3px solid #3E86C6`,display:"flex",flexDirection:"column"}}>
       <div style={{fontSize:30,marginBottom:8}}>🏍️</div>
       <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:C.text,letterSpacing:1,marginBottom:3}}>MODO MOTO4</div>
       <div style={{fontSize:11,color:C.gray,marginBottom:12,minHeight:30}}>Presupuesto, costos, sponsors y cobro de pilotos</div>
       <Input type="password" inputMode="numeric" placeholder="PIN Moto4" value={m4.pin} onChange={e=>m4Set({pin:e.target.value,err:""})} onKeyDown={e=>e.key==="Enter"&&m4Entrar()} style={{marginBottom:8,textAlign:"center"}}/>
       {m4.err&&<div style={{fontSize:11,color:C.red,marginBottom:8,fontWeight:600}}>{m4.err}</div>}
       <Btn full color={"#3E86C6"} onClick={m4Entrar} style={{marginTop:"auto"}}>{m4.cargando?"VERIFICANDO…":"INGRESAR"}</Btn>
       <div style={{fontSize:9.5,color:C.gray2,marginTop:8,letterSpacing:.5}}>PIN verificado en el servidor 🔒</div>
     </div>
   </div>)}
   <div style={{fontSize:10,color:C.gray2,letterSpacing:2,textTransform:"uppercase"}}>GP3 Sports LATAM · Pirelli Official Partner</div>
   <div style={{fontSize:10,color:C.gray2,letterSpacing:1,opacity:.7}}>{VERSION}</div>
 </div></>
);

return(
 <><style>{GS}</style>
 <div style={{minHeight:"100vh",background:C.dark,display:"flex",flexDirection:"column"}}>
   <div style={{height:3,background:`linear-gradient(90deg,${C.red} 0%,#ff4444 50%,${C.red} 100%)`,flexShrink:0}}/>
   <header style={{background:C.dark2,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",flexShrink:0}}>
     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,maxWidth:1200,margin:"0 auto"}}>
       <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
         <Logo size="sm"/>
         <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><Badge color={modo==="admin"?C.red:modo==="entradas"?"#2b8fd0":modo==="inscripcion"?C.yellow:C.green}>{modo==="admin"?"ADMIN":modo==="entradas"?"ENTRADAS":modo==="inscripcion"?"INSCRIPCIÓN":"VENDEDOR"}</Badge><span style={{fontSize:11,color:C.gray2,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>{HOY}</span></div>
       </div>
       <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
         {["USD","ARS"].map(m=>totalesAbiertas[m]?(<div key={m} style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:m==="USD"?C.green:C.yellow,letterSpacing:-0.5}}>{fmt(totalesAbiertas[m],m)}</div><div style={{fontSize:9,color:C.gray,letterSpacing:1}}>{m}</div></div>):null)}
         <div style={{textAlign:"center",background:C.dark3,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:C.text}}>{headerVentas.length}</div><div style={{fontSize:9,color:C.gray,letterSpacing:1,textTransform:"uppercase"}}>{modo==="entradas"?"Entradas":modo==="inscripcion"?"Inscrip.":"Ventas"}</div></div>
         <button onClick={()=>{setModo(null);setMostrarAccesos(false);setPinVendedor("");setPinAdmin("");setPinEntradas("");setPinInscripcion("");setPinErrorVendedor(false);setPinErrorAdmin(false);setPinErrorEntradas(false);setPinErrorInscripcion(false);}} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,padding:"8px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>SALIR</button>
       </div>
     </div>
   </header>
   <nav style={{background:C.dark2,borderBottom:`1px solid ${C.border}`,padding:"0 16px",flexShrink:0,overflowX:"auto"}}>
     <div style={{display:"flex",gap:2,maxWidth:1200,margin:"0 auto",minWidth:"max-content"}}>
       {tabs.map(([id,lbl])=>(<button key={id} onClick={()=>setTab(id)} style={{padding:"12px 16px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,border:"none",borderBottom:`3px solid ${tab===id?C.red:"transparent"}`,background:"transparent",color:tab===id?C.text:C.gray,transition:"all .2s",whiteSpace:"nowrap"}}>{lbl}</button>))}
       {isAdmin&&(<button onClick={()=>exportCSV(ventas,stock,todosLosProductos)} style={{marginLeft:"auto",padding:"12px 16px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,border:"none",borderBottom:"3px solid transparent",background:"transparent",color:C.red,whiteSpace:"nowrap"}}>⬇ EXCEL</button>)}
     </div>
   </nav>
   {toast&&<Toast msg={toast.msg} err={toast.err}/>}
   <main style={{flex:1,overflowY:"auto",padding:"16px",maxWidth:1200,margin:"0 auto",width:"100%"}}>

     {tab==="venta"&&(
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:16}}>
         <div style={{display:"flex",flexDirection:"column",gap:12}}>
           <Card><CardHeader>Fecha del Campeonato</CardHeader>
             <div style={{padding:"10px 12px 0"}}>
               <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",background:C.dark4,border:`1px solid ${C.green}55`,borderRadius:8,padding:"8px 12px"}}>
                 <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:2,color:C.green,fontWeight:700}}>● EVENTO ACTIVO</span>
                 <span style={{fontWeight:700,fontSize:14}}>{CIRCUITOS_BASE.find(c=>c.id===eventoActivo)?.nombre||"—"}</span>
                 <span style={{fontSize:10,color:C.gray,letterSpacing:1}}>{eventoForzado?"(forzado)":"(automático)"}</span>
               </div>
               {isAdmin&&(<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:8}}><Label>Forzar evento:</Label><select value={eventoForzado} onChange={e=>forzarEvento(e.target.value)} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"7px 10px",fontSize:13,outline:"none",fontFamily:"'Barlow',sans-serif"}}><option value="">Automático</option>{CIRCUITOS_BASE.map(c=>(<option key={c.id} value={c.id}>{c.num} {c.nombre}</option>))}</select>{eventoForzado&&<Btn small outline onClick={()=>forzarEvento("")}>🔄 Auto</Btn>}</div>)}
             </div>
             <div style={{padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
               {circuitos.map(c=>(<button key={c.id} onClick={()=>setForm(f=>({...f,circ_id:c.id,fecha:c.inicio}))} style={{padding:"10px 12px",borderRadius:8,cursor:"pointer",textAlign:"left",border:`1px solid ${form.circ_id===c.id?C.red:(c.id===eventoActivo?C.green:C.border)}`,background:form.circ_id===c.id?"rgba(232,0,29,.1)":C.dark4,transition:"all .2s"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:form.circ_id===c.id?C.red:C.gray,fontWeight:700,letterSpacing:1}}>{c.num}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:C.text,marginTop:2,lineHeight:1.2}}>{c.nombre}</div><div style={{fontSize:10,color:C.gray,marginTop:4}}>{c.inicio}</div>{c.id===eventoActivo&&<div style={{fontSize:9,color:C.green,fontWeight:700,marginTop:2,letterSpacing:1}}>● ACTIVO</div>}</button>))}
             </div>
           </Card>
           <Card><CardHeader>Piloto</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
               <div style={{position:"relative"}}>
                 <Input type="text" placeholder="Buscar por nombre o número..." value={pilotoQ} onChange={e=>{setPilotoQ(e.target.value);setShowSug(true);setForm(f=>({...f,piloto:e.target.value,num_piloto:""}));}} onFocus={()=>setShowSug(true)}/>
                 {showSug&&sugerencias.length>0&&(<div style={{position:"absolute",top:"100%",left:0,right:0,background:C.dark3,border:`1px solid ${C.red}`,borderRadius:"0 0 8px 8px",zIndex:100,maxHeight:220,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,.6)"}}>{sugerencias.map((p,i)=>(<div key={i} onMouseDown={()=>selPiloto(p)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,fontSize:14}}><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,minWidth:40}}>#{p.num}</span><span style={{fontWeight:600,flex:1}}>{p.nombre}</span><Badge small>{p.cat}</Badge></div>))}</div>)}
               </div>
               {form.piloto&&(<div style={{display:"flex",alignItems:"center",gap:10,background:C.dark4,border:`1px solid ${C.red}`,borderRadius:8,padding:"10px 14px",flexWrap:"wrap"}}><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18}}>#{form.num_piloto||"—"}</span><span style={{fontWeight:700,fontSize:15}}>{form.piloto}</span><Badge>{form.categoria}</Badge><button onClick={()=>{setForm(f=>({...f,piloto:"",num_piloto:""}));setPilotoQ("");}} style={{marginLeft:"auto",background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:20,lineHeight:1}}>×</button></div>)}
               <Field label="Categoría"><Select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>{todasLasCats.map(c=><option key={c}>{c}</option>)}</Select></Field>
             </div>
           </Card>
           <Card><CardHeader>Moneda</CardHeader>
             <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
               {[["USD","💵","Dólares",C.green],["ARS","🇦🇷","Pesos ARS",C.yellow]].map(([m,ico,lbl,col])=>(<button key={m} onClick={()=>setForm(f=>({...f,moneda:m,metodo:m==="USD"?"efectivo_usd":"efectivo_ars"}))} style={{padding:"14px 10px",borderRadius:10,cursor:"pointer",textAlign:"center",border:`2px solid ${form.moneda===m?col:C.border}`,background:form.moneda===m?col+"22":C.dark4,transition:"all .2s"}}><div style={{fontSize:24,marginBottom:4}}>{ico}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:form.moneda===m?C.text:C.gray}}>{m}</div><div style={{fontSize:10,color:form.moneda===m?col:C.gray2,letterSpacing:1}}>{lbl}</div></button>))}
             </div>
           </Card>
           <Card><CardHeader>Neumáticos — Stock Flotante</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
               {todosLosProductos.map(p=>{const precio=getPrecio(p,form.moneda,precios);const enCarrito=carrito.find(i=>i.prod_id===p.id)?.cantidad??0;const flotante=stock[p.id]?.flotante??0;const sinStock=flotante<=0;return(<div key={p.id} style={{background:C.dark4,border:`1px solid ${enCarrito>0?C.green:sinStock?"rgba(200,0,0,.3)":C.border}`,borderRadius:10,padding:"12px 14px",opacity:sinStock?.55:1}}>
                 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><Badge color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.text,fontSize:15}}>{p.label}</span>{enCarrito>0&&<span style={{fontSize:11,color:C.green,fontWeight:700}}>✓{enCarrito}</span>}</div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:precio>0?C.green:C.gray2,fontSize:16}}>{precio>0?fmt(precio,form.moneda):"—"}</span></div>
                 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                   <span style={{fontSize:11,color:sinStock?C.red:C.gray}}>Flotante: <b style={{color:sinStock?C.red:C.green,fontFamily:"'Barlow Condensed',sans-serif"}}>{flotante}</b></span>
                   <div style={{display:"flex",alignItems:"center",gap:6}}>
                     <button onClick={()=>setCantSel(c=>({...c,[p.id]:Math.max(0,(c[p.id]??0)-1)}))} disabled={sinStock} style={{width:34,height:34,borderRadius:8,border:`1px solid ${C.border2}`,background:C.dark3,color:C.text,cursor:sinStock?"not-allowed":"pointer",fontSize:18,fontWeight:700}}>−</button>
                     <input value={cantSel[p.id]??0} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setCantSel(c=>({...c,[p.id]:x===""?0:Math.min(flotante,parseInt(x,10))}));}} style={{width:48,textAlign:"center",background:C.dark3,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"7px 4px",fontSize:15,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none"}}/>
                     <button onClick={()=>setCantSel(c=>({...c,[p.id]:Math.min(flotante,(c[p.id]??0)+1)}))} disabled={sinStock} style={{width:34,height:34,borderRadius:8,border:`1px solid ${C.border2}`,background:C.dark3,color:C.text,cursor:sinStock?"not-allowed":"pointer",fontSize:18,fontWeight:700}}>+</button>
                     <Btn small color={C.green} disabled={sinStock||(cantSel[p.id]??0)<=0} onClick={()=>agregarProducto(p.id)}>Agregar</Btn>
                   </div>
                 </div>
               </div>);})}
             </div>
           </Card>
         </div>
         <div style={{display:"flex",flexDirection:"column",gap:12}}>
           <Card style={{border:`1px solid ${pagosOk?C.green:C.border}`}}><CardHeader>Pago{pagos.length>1?"s":""} {pagos.length>1?"— dividido":""}</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
               <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>Un pago cubre el total. Si el cliente paga de varias formas (efectivo + transferencia, o USD + ARS), agregá más líneas: cada una con su método, moneda y monto. Deben cubrir el total.</div>
               {pagos.map((p,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 64px 100px 26px",gap:6,alignItems:"center"}}>
                 <Select value={p.metodo} onChange={e=>setPago(i,{metodo:e.target.value})} style={{padding:"9px 10px",fontSize:13}}>
                   <option value="efectivo_usd">💵 Efectivo USD</option>
                   <option value="efectivo_ars">🇦🇷 Efectivo ARS</option>
                   <option value="transferencia">🏦 Transferencia</option>
                   <option value="debito">💳 Débito/Crédito</option>
                   <option value="post">🧾 Post de pago</option>
                   <option value="otro">💰 Otro</option>
                 </Select>
                 <button onClick={()=>(()=>{const nm=p.moneda==="USD"?"ARS":"USD";const otras=pagos.reduce((s,q,j)=>j===i?s:s+convAmoneda(Number(q.monto)||0,q.moneda,ventaMoneda),0);const faltaT=Math.max(0,Math.round((ventaTotal-otras)*100)/100);setPago(i,{moneda:nm,monto:Math.round(convAmoneda(faltaT,ventaMoneda,nm)*100)/100});})()} style={{padding:"9px 4px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,border:`1px solid ${p.moneda==="USD"?C.green:C.yellow}`,background:(p.moneda==="USD"?C.green:C.yellow)+"22",color:p.moneda==="USD"?C.green:C.yellow}}>{p.moneda==="USD"?"USD":"ARS"}</button>
                 <NumInput value={p.monto} color={p.moneda==="USD"?C.green:C.yellow} onChange={v=>{setPagoSplit(true);setPago(i,{monto:v});}}/>
                 {pagos.length>1?<button onClick={()=>delPago(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button>:<span/>}
               </div>))}
               <Btn small outline onClick={addPago}>+ Agregar forma de pago</Btn>
               <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:8,background:pagosOk?"rgba(0,168,132,.1)":pagosFalta>0?C.dark4:"rgba(239,108,0,.1)",border:`1px solid ${pagosOk?C.green:pagosFalta>0?C.border:C.orange}`}}>
                 <span style={{fontSize:12,color:C.gray}}>Total venta: <b style={{color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmt(carritoTotal,form.moneda)}</b></span>
                 <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:14,color:pagosOk?C.green:pagosFalta>0?C.orange:C.red}}>{pagosOk?"✓ Cubierto":pagosFalta>0?("Falta "+fmt(Math.abs(pagosFalta),form.moneda)):("Sobra "+fmt(Math.abs(pagosFalta),form.moneda))}</span>
               </div>
               {pagos.some(p=>p.moneda!==form.moneda)&&<div style={{fontSize:10,color:C.gray}}>Conversión a {form.moneda} con TC {tcApp.toLocaleString("es-AR")} (configurable en Administración).</div>}
             </div>
           </Card>
           <Card><CardHeader>Datos del Cliente</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
               <Field label="Email (obligatorio)"><Input type="email" placeholder="cliente@email.com" value={form.email_cliente} onChange={e=>setForm(f=>({...f,email_cliente:e.target.value}))}/></Field>
               <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                 {[["CF","Consumidor Final"],["FAC","Factura A/Empresa"]].map(([t,lbl])=>(<button key={t} onClick={()=>setForm(f=>({...f,tipo_factura:t}))} style={{padding:"11px 8px",borderRadius:8,cursor:"pointer",border:`2px solid ${form.tipo_factura===t?C.red:C.border}`,background:form.tipo_factura===t?"rgba(232,0,29,.1)":C.dark4,color:form.tipo_factura===t?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1}}>{lbl}</button>))}
               </div>
               {form.tipo_factura==="FAC"&&(<><Field label="CUIT"><Input placeholder="30-12345678-9" value={form.cuit} onChange={e=>setForm(f=>({...f,cuit:e.target.value}))}/></Field><Field label="Razón Social / Empresa"><Input placeholder="Nombre de la empresa" value={form.empresa} onChange={e=>setForm(f=>({...f,empresa:e.target.value}))}/></Field></>)}
             </div>
           </Card>
           <Card style={{border:`1px solid ${carrito.length>0?C.green:C.border}`}}><CardHeader>Carrito</CardHeader>
             <div style={{padding:12}}>
               {carrito.length===0?(<div style={{textAlign:"center",color:C.gray,padding:"20px 0",fontSize:13}}>Sin neumáticos. Agregá arriba.</div>):(<div style={{display:"flex",flexDirection:"column",gap:8}}>
                 {carritoConPrecios.map((item,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"8px 10px",background:C.dark4,borderRadius:8}}>
                   <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13}}>{item.prod?.label}</div><div style={{fontSize:11,color:C.gray}}>{fmt(item.precio_unit,form.moneda)} × {item.cantidad}</div></div>
                   <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green}}>{fmt(item.total,form.moneda)}</span><button onClick={()=>setCarrito(prev=>prev.filter((_,x)=>x!==i))} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button></div>
                 </div>))}
                 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,marginTop:4,borderTop:`2px solid ${C.green}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1,fontSize:15}}>TOTAL ({carritoUnits} u.)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:24}}>{fmt(carritoTotal,form.moneda)}</span></div>
               </div>)}
               <Btn full color={C.green} onClick={registrar} disabled={carrito.length===0} style={{marginTop:12}}>✓ Confirmar Venta</Btn>
             </div>
           </Card>
         </div>
       </div>
     )}

     {tab==="entradas"&&(
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:16}}>
         <div style={{display:"flex",flexDirection:"column",gap:12}}>
           <Card>
             <div style={{padding:"10px 12px 0"}}>
               <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",background:C.dark4,border:`1px solid ${C.green}55`,borderRadius:8,padding:"8px 12px"}}>
                 <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:2,color:C.green,fontWeight:700}}>● EVENTO ACTIVO</span>
                 <span style={{fontWeight:700,fontSize:14}}>{CIRCUITOS_BASE.find(c=>c.id===eventoActivo)?.nombre||"—"}</span>
               </div>
             </div>
             <CardHeader>Tipo de Entrada</CardHeader>
             <div style={{padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
               {tiposEntrada.map(t=>{const free=t.free||(t.precio||0)===0;const sel=entrTipo===t.id;return(<button key={t.id} onClick={()=>{setEntrTipo(t.id);setEntrCatPulsera("");setPagoSplit(false);setPagos([]);}} style={{padding:"10px 12px",borderRadius:8,cursor:"pointer",textAlign:"left",border:`2px solid ${sel?C.red:C.border}`,background:sel?"rgba(232,0,29,.1)":C.dark4,transition:"all .2s"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:C.text,lineHeight:1.2}}>{t.nombre}</div><div style={{fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:free?C.gray2:C.green,marginTop:3}}>{free?"Sin cobro":fmt(t.precio||0,t.moneda||"ARS")}</div></button>);})}
             </div>
           </Card>
           {entrTipoObj&&(()=>{const nom=entrTipoObj.nombre.toLowerCase();const necesitaCat=nom.includes("tercera")||nom.includes("menor")||nom.includes("invitado")||nom.includes("anterior");if(!necesitaCat)return null;return(
           <Card><CardHeader>Categoría de Pulsera</CardHeader>
             <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
               {[["general","🟢 General",C.green],["parque_cerrado","🔵 Parque Cerrado","#4a90d9"]].map(([v,lbl,col])=>(<button key={v} onClick={()=>setEntrCatPulsera(v)} style={{padding:"12px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,border:`2px solid ${entrCatPulsera===v?col:C.border}`,background:entrCatPulsera===v?col+"22":C.dark4,color:entrCatPulsera===v?C.text:C.gray}}>{lbl}</button>))}
             </div>
           </Card>);})()}
           {!(entrTipoObj&&entrTipoObj.vip)&&(<Card><CardHeader>Cantidad</CardHeader>
             <div style={{padding:12,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
               <button onClick={()=>setEntrCant(c=>Math.max(1,(c||1)-1))} style={{width:44,height:44,borderRadius:10,border:`1px solid ${C.border2}`,background:C.dark3,color:C.text,cursor:"pointer",fontSize:22,fontWeight:700}}>−</button>
               <input value={entrCant} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setEntrCant(x===""?0:Math.min(50,parseInt(x,10)));}} style={{width:80,textAlign:"center",background:C.dark3,border:`1px solid ${C.border2}`,color:C.text,borderRadius:10,padding:"10px",fontSize:22,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,outline:"none"}}/>
               <button onClick={()=>setEntrCant(c=>Math.min(50,(c||0)+1))} style={{width:44,height:44,borderRadius:10,border:`1px solid ${C.border2}`,background:C.dark3,color:C.text,cursor:"pointer",fontSize:22,fontWeight:700}}>+</button>
             </div>
           </Card>)}
           {entrTipoObj&&!entrEsGratis&&(
           <div style={{fontSize:12,color:C.gray,background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>Moneda de cobro: <b style={{color:entrMoneda==="USD"?C.green:C.yellow,fontFamily:"'Barlow Condensed',sans-serif"}}>{entrMoneda==="USD"?"USD (dólares)":"ARS (pesos)"}</b> — definida en el precio de este tipo. Podés cobrar en otra moneda dividiendo el pago (convierte al TC).</div>)}
         </div>
         <div style={{display:"flex",flexDirection:"column",gap:12}}>
           {entrTipoObj&&entrTipoObj.vip?(
             <><div style={{background:C.dark4,border:`1px solid ${C.yellow}55`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.gray,lineHeight:1.4}}>⭐ <b style={{color:C.yellow}}>{entrTipoObj.nombre}</b> — ingreso solo por QR. El invitado recibe su QR por mail; escaneálo acá y queda registrado el ingreso. Cada QR entra una sola vez.</div>
             <QRScanner color={C.yellow} onScan={code=>registrarVIPEntrada(entrTipoObj,code)}/></>
           ):(<>
           {!entrEsGratis&&(
           <Card style={{border:`1px solid ${pagosOk?C.green:C.border}`}}><CardHeader>Pago{pagos.length>1?"s — dividido":""}</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
               <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>Un pago cubre el total. Si pagan de varias formas, agregá líneas: cada una con método, moneda y monto.</div>
               {pagos.map((p,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 64px 100px 26px",gap:6,alignItems:"center"}}>
                 <Select value={p.metodo} onChange={e=>setPago(i,{metodo:e.target.value})} style={{padding:"9px 10px",fontSize:13}}>
                   <option value="efectivo_ars">🇦🇷 Efectivo ARS</option>
                   <option value="efectivo_usd">💵 Efectivo USD</option>
                   <option value="transferencia">🏦 Transferencia</option>
                   <option value="debito">💳 Débito/Crédito</option>
                   <option value="post">🧾 Post de pago</option>
                   <option value="otro">💰 Otro</option>
                 </Select>
                 <button onClick={()=>(()=>{const nm=p.moneda==="USD"?"ARS":"USD";const otras=pagos.reduce((s,q,j)=>j===i?s:s+convAmoneda(Number(q.monto)||0,q.moneda,ventaMoneda),0);const faltaT=Math.max(0,Math.round((ventaTotal-otras)*100)/100);setPago(i,{moneda:nm,monto:Math.round(convAmoneda(faltaT,ventaMoneda,nm)*100)/100});})()} style={{padding:"9px 4px",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,border:`1px solid ${p.moneda==="USD"?C.green:C.yellow}`,background:(p.moneda==="USD"?C.green:C.yellow)+"22",color:p.moneda==="USD"?C.green:C.yellow}}>{p.moneda==="USD"?"USD":"ARS"}</button>
                 <NumInput value={p.monto} color={p.moneda==="USD"?C.green:C.yellow} onChange={v=>{setPagoSplit(true);setPago(i,{monto:v});}}/>
                 {pagos.length>1?<button onClick={()=>delPago(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button>:<span/>}
               </div>))}
               <Btn small outline onClick={addPago}>+ Agregar forma de pago</Btn>
               <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:8,background:pagosOk?"rgba(0,168,132,.1)":pagosFalta>0?C.dark4:"rgba(239,108,0,.1)",border:`1px solid ${pagosOk?C.green:pagosFalta>0?C.border:C.orange}`}}>
                 <span style={{fontSize:12,color:C.gray}}>Total: <b style={{color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmt(entrTotal,entrMoneda)}</b></span>
                 <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:14,color:pagosOk?C.green:pagosFalta>0?C.orange:C.red}}>{pagosOk?"✓ Cubierto":pagosFalta>0?("Falta "+fmt(Math.abs(pagosFalta),entrMoneda)):("Sobra "+fmt(Math.abs(pagosFalta),entrMoneda))}</span>
               </div>
               {pagos.some(p=>p.moneda!==entrMoneda)&&<div style={{fontSize:10,color:C.gray}}>Conversión a {entrMoneda} con TC {tcApp.toLocaleString("es-AR")}.</div>}
               {pagos.some(p=>p.metodo==="transferencia"&&(p.monto||0)>0)&&(
                 <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                   <Label>Foto del comprobante (obligatoria para transferencia)</Label>
                   {entrFoto?(<div style={{display:"flex",alignItems:"center",gap:8,background:C.dark4,border:`1px solid ${C.green}`,borderRadius:8,padding:"8px 12px"}}><span style={{fontSize:18}}>📎</span><span style={{flex:1,fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entrFoto.name}</span><button onClick={()=>setEntrFoto(null)} style={{background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:16}}>✕</button></div>):(<label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",padding:"12px",borderRadius:8,border:`2px dashed ${C.orange}`,background:C.orange+"11",color:C.orange,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,letterSpacing:1}}>📎 Adjuntar comprobante<input type="file" accept="image/*" style={{display:"none"}} onChange={cargarFotoEntrada}/></label>)}
                 </div>
               )}
             </div>
           </Card>)}
           <Card><CardHeader>Datos del Cliente (opcional)</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
               <Field label="Nombre"><Input placeholder="Nombre del cliente" value={entrCliente.nombre} onChange={e=>setEntrCliente(c=>({...c,nombre:e.target.value}))}/></Field>
               <Field label="Email"><Input type="email" placeholder="cliente@email.com" value={entrCliente.email} onChange={e=>setEntrCliente(c=>({...c,email:e.target.value}))}/></Field>
             </div>
           </Card>
           <Card style={{border:`1px solid ${entrTipoObj?C.green:C.border}`}}><CardHeader>Resumen</CardHeader>
             <div style={{padding:12}}>
               {!entrTipoObj?(<div style={{textAlign:"center",color:C.gray,padding:"20px 0",fontSize:13}}>Elegí un tipo de entrada arriba.</div>):(
                 <div style={{display:"flex",flexDirection:"column",gap:6}}>
                   <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:C.gray}}>{entrTipoObj.nombre} × {entrCant}</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.text}}>{entrEsGratis?"Sin cobro":fmt(entrPrecioU,entrMoneda)}</span></div>
                   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,marginTop:4,borderTop:`2px solid ${C.green}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1,fontSize:15}}>TOTAL</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:entrEsGratis?C.gray2:C.green,fontSize:24}}>{entrEsGratis?"Gratis":fmt(entrTotal,entrMoneda)}</span></div>
                 </div>
               )}
               {editEntradaId&&<div style={{display:"flex",alignItems:"center",gap:8,background:C.orange+"15",border:`1px solid ${C.orange}`,borderRadius:8,padding:"8px 11px",marginTop:12,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.orange,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>✏️ EDITANDO</span><div style={{marginLeft:"auto",display:"flex",gap:6}}><button onClick={()=>setEntrEstadoEd("confirmada")} style={{padding:"5px 9px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${entrEstadoEd==="confirmada"?C.green:C.border2}`,background:entrEstadoEd==="confirmada"?"rgba(0,168,132,.15)":"transparent",color:entrEstadoEd==="confirmada"?C.green:C.gray}}>Confirmada</button><button onClick={()=>setEntrEstadoEd("pendiente")} style={{padding:"5px 9px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,border:`1px solid ${entrEstadoEd==="pendiente"?C.orange:C.border2}`,background:entrEstadoEd==="pendiente"?"rgba(239,108,0,.15)":"transparent",color:entrEstadoEd==="pendiente"?C.orange:C.gray}}>Pendiente</button></div></div>}
               <Btn full color={C.green} onClick={registrarEntrada} disabled={!entrTipoObj} style={{marginTop:12}}>{editEntradaId?"💾 Guardar cambios":"🎫 Registrar Entrada"}</Btn>
               {editEntradaId&&<Btn full outline onClick={cancelarEditEntrada} style={{marginTop:8}}>Cancelar edición</Btn>}
             </div>
           </Card>
           </>)}
         </div>
         {(()=>{
           const evN=CIRCUITOS_BASE.find(c=>c.id===eventoActivo)?.nombre||"—";
           const arr=ventas.filter(v=>v.circ_id===eventoActivo&&v.tipo_venta==="entrada");
           const toA=(m,mon)=>mon==="USD"?(m||0)*tcApp:(m||0);
           const totUni=arr.reduce((s,v)=>s+(v.total_unidades||0),0);
           const totARS=arr.reduce((s,v)=>s+toA(v.total_monto,v.moneda),0);
           const porTipo={};
           arr.forEach(v=>{(v.items||[]).forEach(it=>{const pid=it.prod_id||"";const t=tiposEntrada.find(x=>("entrada_"+x.id)===pid);const nom=t?t.nombre:pid.replace("entrada_","");porTipo[nom]=(porTipo[nom]||0)+(it.cantidad||0);});});
           const tipos=Object.entries(porTipo).sort((a,b)=>b[1]-a[1]);
           const ult=[...arr].sort((a,b)=>b.id-a.id).slice(0,15);
           const FF="'Barlow Condensed',sans-serif";
           return(<Card style={{gridColumn:"1 / -1",border:`1px solid ${C.green}55`}}>
             <CardHeader>🎫 Entradas vendidas — {evN}</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:12}}>
               <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                 <div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{fontFamily:FF,fontWeight:900,fontSize:30,color:C.text,lineHeight:1}}>{totUni}</div><div style={{fontSize:11,color:C.gray,letterSpacing:1,marginTop:4}}>ENTRADAS</div></div>
                 <div style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{fontFamily:FF,fontWeight:900,fontSize:26,color:C.green,lineHeight:1}}>{fmt(totARS,"ARS")}</div><div style={{fontSize:11,color:C.gray,letterSpacing:1,marginTop:4}}>RECAUDADO (ARS)</div></div>
               </div>
              {arr.length>0&&<DesglosePagos ventas={arr} tc={tcApp} titulo="💰 Entradas — cómo ingresó la plata"/>}
              {tipos.length>0&&(<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tipos.map(([n,c])=>(<span key={n} style={{fontFamily:FF,fontSize:12,fontWeight:700,background:C.dark4,border:`1px solid ${C.border}`,borderRadius:999,padding:"5px 11px",color:C.text}}>{n}: <b style={{color:C.green}}>{c}</b></span>))}</div>)}
               <div>
                 <div style={{fontSize:11,color:C.gray,letterSpacing:1,marginBottom:4,fontWeight:700}}>ÚLTIMAS VENTAS</div>
                 {ult.length===0?(<div style={{textAlign:"center",color:C.gray,padding:"16px 0",fontSize:13}}>Todavía no se vendió ninguna entrada en este evento. Cuando cobres una, aparece acá al instante.</div>):ult.map(v=>{
                   const pid=(v.items&&v.items[0]&&v.items[0].prod_id)||"";const t=tiposEntrada.find(x=>("entrada_"+x.id)===pid);const nom=t?t.nombre:(v.categoria||"Entrada");
                   const hora=new Date(v.id).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
                   const met=v.metodo==="vip_qr"?"VIP · QR":(getPagos(v).map(p=>metLabel(p.metodo)).join(" + ")||metLabel(v.metodo));
                   const gratis=(v.total_monto||0)===0;
                   return(<div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                     <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🎫 {nom}{(v.total_unidades||1)>1?" ×"+v.total_unidades:""}{v.estado_entrada==="pendiente"?<span style={{marginLeft:6,fontSize:10,color:C.orange,fontWeight:700}}>● pend.</span>:null}</div><div style={{fontSize:11,color:C.gray}}>{met} · {hora}</div></div>
                     <div style={{display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                       <span style={{fontFamily:FF,fontWeight:900,fontSize:14,color:gratis?C.gray2:C.green}}>{gratis?"Sin cobro":fmt(v.total_monto,v.moneda)}</span>
                       <button onClick={()=>abrirEditarEntrada(v)} title="Editar" style={{background:"transparent",border:`1px solid ${C.orange}`,color:C.orange,borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:11,fontFamily:FF,fontWeight:700}}>✏️</button>
                       <button onClick={()=>{const pin=prompt("PIN admin para borrar:");if(pin!==ADMIN_PIN){if(pin!=null)boom("PIN incorrecto",true);return;}if(!window.confirm("¿Borrar esta entrada?"))return;setVentas(prev=>prev.filter(x=>x.id!==v.id));marcarBorradoLocal(v.id);syncSheets("venta_delete",{id:v.id});setTimeout(cargarDesdeSheet,1500);boom("Entrada borrada");}} title="Borrar" style={{background:"transparent",border:"1px solid #cc1133",color:"#cc1133",borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:11,fontFamily:FF,fontWeight:700}}>🗑</button>
                     </div>
                   </div>);
                 })}
               </div>
               <div style={{fontSize:10,color:C.gray,textAlign:"center",lineHeight:1.4}}>Se sincroniza solo con la planilla cada pocos segundos. Lo mismo se ve en 📈 Administración y en la pantalla en vivo.</div>
             </div>
           </Card>);
         })()}
       </div>
     )}

     {tab==="mis_stats"&&(()=>{
       const hoy=new Date();const Y=hoy.getFullYear(),Mo=hoy.getMonth(),D=hoy.getDate();
       const esHoy=id=>{const f=new Date(id);return f.getFullYear()===Y&&f.getMonth()===Mo&&f.getDate()===D;};
       const misHoy=ventasAbiertas.filter(v=>esHoy(v.id)&&esNeu(v)&&v.circ_id===eventoActivo);
       const evNom=CIRCUITOS_BASE.find(c=>c.id===eventoActivo)?.nombre||"—";
       const t={};let u=0;misHoy.forEach(v=>{t[v.moneda]=(t[v.moneda]||0)+v.total_monto;u+=v.total_unidades||0;});
       return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
         <Card><CardHeader>Mi Resumen de Hoy · {evNom}</CardHeader>
           <div style={{padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
             <StatBox label="Total USD" value={fmt(t["USD"]||0,"USD")} color={C.green}/>
             <StatBox label="Total ARS" value={fmt(t["ARS"]||0,"ARS")} color={C.yellow}/>
             <StatBox label="Neumáticos" value={u} color={C.red}/>
             <StatBox label="Ventas" value={misHoy.length} color={C.text}/>
           </div>
         </Card>
         <Card><CardHeader>Mis Ventas de Hoy</CardHeader>
           <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
             {misHoy.length===0?<div style={{textAlign:"center",color:C.gray,padding:"20px 0"}}>Sin ventas hoy.</div>:misHoy.map((v,i)=>{const c=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);return(<div key={v.id||i} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}><div><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,marginRight:6}}>#{v.num_piloto||"—"}</span><span style={{fontWeight:700}}>{v.piloto}</span><div style={{fontSize:11,color:C.gray}}>{c?.nombre} · {v.total_unidades} u.</div></div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmt(v.total_monto,v.moneda)}</span></div></div>);})}
           </div>
         </Card>
       </div>);
     })()}

     {tab==="stock"&&isAdmin&&(()=>{
       const sd=stockDraft||stock;
       const setSD=(pid,campo,val)=>{setStockDraft({...sd,[pid]:{...sd[pid],[campo]:Math.max(0,val)}});};
       const mover=(pid,desde,hacia,cant)=>{const s=sd[pid]||{bodega:0,transito:0,flotante:0};const disp=s[desde]||0;const real=Math.min(disp,cant);if(real<=0)return;setStockDraft({...sd,[pid]:{...s,[desde]:disp-real,[hacia]:(s[hacia]||0)+real}});};
       const guardar=()=>{setStock(sd);syncSheets("stock",{stock:sd});setStockDraft(null);boom("✓ Stock guardado");setTimeout(cargarDesdeSheet,2500);};
       return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
         <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
           <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,letterSpacing:1}}>Gestión de Stock</span>
           {stockDraft&&<Badge color={C.orange}>cambios sin guardar</Badge>}
           <div style={{marginLeft:"auto",display:"flex",gap:8}}>{stockDraft&&<Btn small outline onClick={()=>setStockDraft(null)}>Descartar</Btn>}<Btn small color={C.green} onClick={guardar} disabled={!stockDraft}>💾 Guardar stock</Btn></div>
         </div>
         <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>Flujo: <b>Bodega</b> → <b>Tránsito</b> → <b>Flotante</b> (lo único vendible en pista). Movés con los botones o editás los números a mano.</div>
         {todosLosProductos.map(p=>{const s=sd[p.id]||{bodega:0,transito:0,flotante:0};const tot=(s.bodega||0)+(s.transito||0)+(s.flotante||0);return(<Card key={p.id}>
           <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><Badge color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{p.label}</span><span style={{marginLeft:"auto",fontSize:11,color:C.gray}}>Total: <b style={{color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{tot}</b></span></div>
           <div style={{padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(96px,1fr))",gap:10}}>
             {[["bodega","Bodega",C.gray],["transito","Tránsito",C.yellow],["flotante","Flotante",C.green]].map(([k,lbl,col])=>(<div key={k}><Label>{lbl}</Label><NumInput value={s[k]||0} color={col} align="center" onChange={v=>setSD(p.id,k,v)}/></div>))}
           </div>
           <div style={{padding:"0 12px 12px",display:"flex",gap:6,flexWrap:"wrap"}}>
             <Btn small outline color={C.yellow} onClick={()=>mover(p.id,"bodega","transito",1)}>B→T 1</Btn>
             <Btn small outline color={C.green} onClick={()=>mover(p.id,"transito","flotante",1)}>T→F 1</Btn>
             <Btn small outline color={C.green} onClick={()=>mover(p.id,"bodega","flotante",1)}>B→F 1</Btn>
             <Btn small outline color={C.gray} onClick={()=>mover(p.id,"flotante","transito",1)}>F→T 1</Btn>
             <Btn small outline color={C.green} onClick={()=>mover(p.id,"transito","flotante",(s.transito||0))}>Todo T→F</Btn>
             <Btn small outline color={C.green} onClick={()=>mover(p.id,"bodega","flotante",(s.bodega||0))}>Todo B→F</Btn>
           </div>
         </Card>);})}
       </div>);
     })()}

     {tab==="estadisticas"&&isAdmin&&(
       <div style={{display:"flex",flexDirection:"column",gap:16}}>
         <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
           <Pill active={filtro==="todos"} onClick={()=>setFiltro("todos")}>Todos</Pill>
           {CIRCUITOS_BASE.map(c=>(<Pill key={c.id} active={filtro===c.id} onClick={()=>setFiltro(c.id)}>{c.num}</Pill>))}
           <Input placeholder="Buscar piloto..." value={busqStats} onChange={e=>setBusqStats(e.target.value)} style={{maxWidth:200,marginLeft:"auto"}}/>
         </div>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
           <StatBox label="Total USD" value={fmt(totales["USD"]||0,"USD")} color={C.green}/>
           <StatBox label="Total ARS" value={fmt(totales["ARS"]||0,"ARS")} color={C.yellow}/>
           <StatBox label="Ventas" value={ventas.length} color={C.text}/>
           <StatBox label="Neumáticos" value={ventas.reduce((s,v)=>s+(v.total_unidades||0),0)} color={C.red}/>
         </div>
{vF.length>0&&<DesglosePagos ventas={vF} tc={tcApp} titulo="💰 Neumáticos — cómo ingresó la plata"/>}
        <Card><CardHeader>Ventas — {vF.length}</CardHeader>
           <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
             {vF.length===0?<div style={{textAlign:"center",color:C.gray,padding:"20px 0"}}>Sin ventas.</div>:vF.map((v,i)=>{const c=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);const cerrada=closedIds.has(v.id);return(<div key={v.id||i} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",opacity:cerrada?.7:1}}>
               <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                 <div style={{minWidth:0}}><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,marginRight:6}}>#{v.num_piloto||"—"}</span><span style={{fontWeight:700}}>{v.piloto}</span>{cerrada&&<Badge small color={C.gray}>cerrada</Badge>}{getPagos(v).length>1&&<Badge small color={C.orange}>{getPagos(v).length} pagos</Badge>}<div style={{fontSize:11,color:C.gray,marginTop:2}}>{c?.nombre} · {v.fecha} · {v.tipo_factura==="FAC"?"Factura":"CF"} · {(v.items||[]).map(it=>{const p=todosLosProductos.find(x=>x.id===it.prod_id);return (p?.label||it.prod_id)+"×"+it.cantidad;}).join(", ")}</div><div style={{fontSize:10,color:C.gray2,marginTop:2}}>💰 {getPagos(v).map(pg=>metLabel(pg.metodo)+" "+fmt(pg.monto,pg.moneda)).join("  +  ")}</div></div>
                 <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmt(v.total_monto,v.moneda)}</div><div style={{fontSize:10,color:C.gray}}>{v.total_unidades} u.</div>
                   <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
                     <button onClick={()=>{const pin=prompt("PIN admin para borrar:");if(pin!==ADMIN_PIN){if(pin!=null)boom("PIN incorrecto",true);return;}if(!window.confirm("¿Borrar la venta de "+v.piloto+"?"))return;setVentas(ventas.filter(x=>x.id!==v.id));marcarBorradoLocal(v.id);syncSheets("venta_delete",{id:v.id});setTimeout(cargarDesdeSheet,1500);boom("Venta borrada");}} style={{background:"transparent",border:"1px solid #cc1133",color:"#cc1133",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>🗑</button>
                   </div>
                 </div>
               </div>
             </div>);})}
           </div>
         </Card>
       </div>
     )}

     {tab==="cierre"&&isAdmin&&(
       <div style={{display:"flex",flexDirection:"column",gap:16}}>
         <CierreDiaPanel ventas={ventas} closedIds={closedIds} eventoActivo={eventoActivo} cierresDia={cierresDia} vendedor={"Administración"} onCerrar={cerrarDia}/>
         <Card style={{border:`1px solid ${C.red}44`}}><CardHeader>Archivar Evento Completo</CardHeader>
           <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
             <div style={{fontSize:12,color:C.gray,lineHeight:1.5}}>Archiva las ventas abiertas de un evento (lo saca de la vista del día). <b style={{color:C.green}}>NO se borran</b>: siguen sumando en el consolidado de utilidad y ventas. Cada evento es completo y aparte; el activo avanza solo.</div>
             {(()=>{const ec=eventoACerrar||eventoActivo;const ab=ventas.filter(v=>!closedIds.has(v.id)&&v.circ_id===ec);const nom=CIRCUITOS_BASE.find(c=>c.id===ec)?.nombre||"—";return(<>
               <div><Label>Evento a archivar</Label>
                 <Select value={ec} onChange={e=>setEventoACerrar(e.target.value)}>
                   {CIRCUITOS_BASE.map(c=>{const n=ventas.filter(v=>!closedIds.has(v.id)&&v.circ_id===c.id).length;return(<option key={c.id} value={c.id}>{c.num} {c.nombre} — {n} venta(s) abierta(s){c.id===eventoActivo?" · ACTIVO":""}</option>);})}
                 </Select>
               </div>
               <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}><span style={{fontSize:13,color:C.gray}}>Ventas abiertas en {nom}</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,color:ab.length>0?C.text:C.gray2}}>{ab.length}</span></div>
               <Btn color={C.red} disabled={ab.length===0} onClick={()=>cerrarEvento(ec)}>{ab.length>0?("🏁 Archivar "+nom+" — "+ab.length+" venta(s)"):("Sin ventas abiertas en "+nom)}</Btn>
             </>);})()}
           </div>
         </Card>
         {cierresDia.filter(c=>c.tipo==="evento").length>0&&(
           <Card><CardHeader>Eventos Archivados</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
               {cierresDia.filter(c=>c.tipo==="evento").sort((a,b)=>b.id-a.id).map((c,i)=>(<div key={c.id||i} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${C.red}`}}>
                 <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                   <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{c.evento}</div><div style={{fontSize:11,color:C.gray}}>{c.fecha}{c.hora?" · "+c.hora:""} · {c.numVentas||0} ventas · {c.unidades||0} u. · {c.inscritos||0} inscritos</div></div>
                   <div style={{textAlign:"right"}}>{c.totales&&c.totales["USD"]?<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:15}}>{fmt(c.totales["USD"],"USD")}</div>:null}{c.totales&&c.totales["ARS"]?<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:15}}>{fmt(c.totales["ARS"],"ARS")}</div>:null}</div>
                 </div>
                 <div style={{fontSize:10,color:C.green,marginTop:4,letterSpacing:1}}>● Sigue sumando en el consolidado</div>
               </div>))}
             </div>
           </Card>
         )}
       </div>
     )}

     {tab==="gestion"&&isAdmin&&(
       <div style={{display:"flex",flexDirection:"column",gap:16}}>
         <Card><CardHeader>Agregar Piloto</CardHeader>
           <GestionPiloto pilotos={pilotos} setPilotos={setPilotos} cats={todasLasCats} boom={boom}/>
         </Card>
         <Card><CardHeader>Editar Precios y Costos</CardHeader>
           <div style={{padding:12}}>
             <div style={{fontSize:11,color:C.gray,lineHeight:1.4,marginBottom:10}}>El <b>precio</b> es lo que paga el piloto (IVA incluido). El <b>costo neto</b> es lo de la factura Pirelli (sin IVA). Elegí $ (pesos clavados) o USD (se multiplica por el TC).</div>
             <div style={{display:"grid",gridTemplateColumns:"1fr 92px 92px 130px",gap:6,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Modelo</span><span style={{textAlign:"right"}}>Precio USD</span><span style={{textAlign:"right"}}>Precio ARS</span><span style={{textAlign:"right"}}>Costo neto</span></div>
             {todosLosProductos.map(p=>{const pr=precios[p.id]||{USD:0,ARS:0};const co=costosNeu[p.id]||{valor:0,moneda:"ARS"};return(<div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 92px 92px 130px",gap:6,alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
               <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13}}>{p.label}</div><div style={{fontSize:10,color:C.gray}}>{p.tipo}</div></div>
               <NumInput value={pr.USD} color={C.green} onChange={v=>setPrecios({...precios,[p.id]:{...pr,USD:v}})}/>
               <NumInput value={pr.ARS} color={C.yellow} onChange={v=>setPrecios({...precios,[p.id]:{...pr,ARS:v}})}/>
               <div style={{display:"flex",gap:4,alignItems:"center"}}>
                 <NumInput value={co.valor} color={C.red} onChange={v=>setCostosNeu({...costosNeu,[p.id]:{...co,valor:v}})}/>
                 <button onClick={()=>{const c=toggleMoneda(co.valor,co.moneda);setCostosNeu({...costosNeu,[p.id]:{...co,...c}});}} title="Moneda del costo" style={{padding:"8px 6px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,border:`1px solid ${co.moneda==="USD"?C.green:C.yellow}`,background:(co.moneda==="USD"?C.green:C.yellow)+"22",color:co.moneda==="USD"?C.green:C.yellow,whiteSpace:"nowrap"}}>{co.moneda==="USD"?"USD":"$"}</button>
               </div>
             </div>);})}
             <div style={{fontSize:11,color:C.gray,marginTop:4}}>La última factura cargada manda — editá el costo cuando llegue una nueva.</div>
             <GuardarBar estado={preciosCostosEstado} onGuardar={guardarPreciosCostosAhora} label="precios y costos"/>
           </div>
         </Card>
         <Card><CardHeader>🎫 Precios de Entradas</CardHeader>
           <div style={{padding:12}}>
             <div style={{fontSize:11,color:C.gray,lineHeight:1.4,marginBottom:10}}>Definí el <b>precio</b> de cada tipo de entrada (lo que paga el público). Los tipos marcados <b>Sin cobro</b> (ticketera, invitado, tercera edad/menor, día anterior) van siempre en cero. Cambiá la moneda con el botón $/USD. Tocá <b>💾 Guardar</b> abajo para sincronizarlo a todos los dispositivos.</div>
             <div style={{display:"grid",gridTemplateColumns:"1fr 64px 110px 70px",gap:6,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Tipo de entrada</span><span style={{textAlign:"center"}}>Cobra</span><span style={{textAlign:"right"}}>Precio</span><span style={{textAlign:"center"}}>Moneda</span></div>
             {tiposEntrada.map((t,i)=>{const cobra=!t.free;return(<div key={t.id} style={{display:"grid",gridTemplateColumns:"1fr 64px 110px 70px",gap:6,alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
               <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13}}>{t.nombre}</div><div style={{fontSize:10,color:C.gray}}>{t.cat==="parque_cerrado"?"🔵 Parque Cerrado":"🟢 General"}</div></div>
               <button onClick={()=>{const u=tiposEntrada.map((x,j)=>j===i?{...x,free:!cobra?x.free:true,...(cobra?{free:true,precio:0}:{free:false})}:x);setTiposEntrada(u);}} title="Cobra o sin cobro" style={{padding:"8px 4px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,border:`1px solid ${cobra?C.green:C.gray2}`,background:(cobra?C.green:C.gray2)+"22",color:cobra?C.green:C.gray}}>{cobra?"COBRA":"GRATIS"}</button>
               {cobra?<NumInput value={t.precio||0} color={t.moneda==="USD"?C.green:C.yellow} onChange={v=>{const u=tiposEntrada.map((x,j)=>j===i?{...x,precio:v}:x);setTiposEntrada(u);}}/>:<div style={{textAlign:"right",fontSize:12,color:C.gray2,fontFamily:"'Barlow Condensed',sans-serif"}}>Sin cobro</div>}
               {cobra?<button onClick={()=>{const c=toggleMoneda(t.precio,t.moneda);const u=tiposEntrada.map((x,j)=>j===i?{...x,moneda:c.moneda,precio:c.valor}:x);setTiposEntrada(u);}} style={{padding:"8px 4px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,border:`1px solid ${t.moneda==="USD"?C.green:C.yellow}`,background:(t.moneda==="USD"?C.green:C.yellow)+"22",color:t.moneda==="USD"?C.green:C.yellow}}>{t.moneda==="USD"?"USD":"$ ARS"}</button>:<span/>}
             </div>);})}
             <div style={{fontSize:11,color:C.gray,marginTop:4}}>El vendedor ve estos precios al instante en el modo 🎫 Entradas, después de guardar.</div>
             <GuardarBar estado={tiposEntradaEstado} onGuardar={guardarTiposEntradaAhora} label="tipos de entrada"/>
           </div>
         </Card>
         <Card><CardHeader>📋 Aranceles de Inscripción por Categoría</CardHeader>
           <div style={{padding:12}}>
             <div style={{fontSize:11,color:C.gray,lineHeight:1.4,marginBottom:10}}>Definí cuánto paga cada categoría para inscribirse. El módulo 📋 Inscripción cobra este valor al piloto preinscrito (sus datos ya están cargados, solo paga). Tocá <b>💾 Guardar</b> abajo para sincronizarlo a todos los dispositivos.</div>
             <div style={{display:"grid",gridTemplateColumns:"1fr 110px 70px",gap:6,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Categoría</span><span style={{textAlign:"right"}}>Arancel</span><span style={{textAlign:"center"}}>Moneda</span></div>
             {todasLasCats.map(cat=>{const a=aranceles[cat]||{valor:0,moneda:"ARS"};return(<div key={cat} style={{display:"grid",gridTemplateColumns:"1fr 110px 70px",gap:6,alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
               <div style={{fontWeight:700,fontSize:13}}>{cat}</div>
               <NumInput value={a.valor} color={a.moneda==="USD"?C.green:C.yellow} onChange={v=>setAranceles({...aranceles,[cat]:{...a,valor:v}})}/>
               <button onClick={()=>{const c=toggleMoneda(a.valor,a.moneda);setAranceles({...aranceles,[cat]:{...a,...c}});}} style={{padding:"8px 4px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,border:`1px solid ${a.moneda==="USD"?C.green:C.yellow}`,background:(a.moneda==="USD"?C.green:C.yellow)+"22",color:a.moneda==="USD"?C.green:C.yellow}}>{a.moneda==="USD"?"USD":"$ ARS"}</button>
             </div>);})}
             <GuardarBar estado={arancelesEstado} onGuardar={guardarArancelesAhora} label="aranceles"/>
           </div>
         </Card>
       </div>
     )}

     {tab==="admin"&&isAdmin&&(<AdminPanel ventas={ventas} cierres={cierres} costosNeu={costosNeu} eventoActivo={eventoActivo}/>)}
     {tab==="vip"&&isAdmin&&(<VipStaffPanel/>)}
    {tab==="calendario"&&(<Card style={{padding:0,overflow:"hidden"}}><iframe src="/calendario.html" title="Calendario" style={{width:"100%",height:"calc(100vh - 200px)",minHeight:600,border:"none",display:"block"}}/></Card>)}
     {tab==="inscripciones"&&(isAdmin||modo==="inscripcion")&&(<InscripcionesPanel eventoActivo={eventoActivo} aranceles={aranceles} tcApp={tcApp} onPagar={registrarInscripcion} onEditarPago={editarPagoInscripcion} inscPagadas={inscPagadas} inscVentas={ventas.filter(v=>v.tipo_venta==="inscripcion")} onBorrarVenta={borrarVentaInsc} pilotosDB={todosLosPilotos} onNuevoPiloto={registrarPilotoNuevo} onCrearPreinscripcion={registrarPreinscripcion}/>)}

   </main>
   <footer style={{background:C.dark2,borderTop:`1px solid ${C.border}`,padding:"10px 16px",textAlign:"center",flexShrink:0}}>
     <span style={{fontSize:10,color:C.gray2,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif"}}>GP3 Sports LATAM · CAV 2026 · Pirelli</span>
   </footer>
 </div></>
);
}

function GestionPiloto({pilotos,setPilotos,cats,boom}){
const [n,setN]=useState({num:"",nombre:"",cat:cats[0]||""});
const add=()=>{if(!n.nombre.trim()||!n.num.trim()){boom("Completá número y nombre",true);return;}setPilotos([...pilotos,{num:n.num.trim(),nombre:n.nombre.trim(),cat:n.cat}]);boom("✓ Piloto agregado");setN({num:"",nombre:"",cat:cats[0]||""});};
return(<div style={{padding:12,display:"grid",gridTemplateColumns:"80px 1fr 1fr auto",gap:8,alignItems:"end"}}>
 <div><Label>N°</Label><Input value={n.num} onChange={e=>setN({...n,num:e.target.value})}/></div>
 <div><Label>Nombre</Label><Input value={n.nombre} onChange={e=>setN({...n,nombre:e.target.value})}/></div>
 <div><Label>Categoría</Label><Select value={n.cat} onChange={e=>setN({...n,cat:e.target.value})}>{cats.map(c=><option key={c}>{c}</option>)}</Select></div>
 <Btn small color={C.green} onClick={add}>+ Agregar</Btn>
</div>);
}
