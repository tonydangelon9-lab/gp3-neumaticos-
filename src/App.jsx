import { useState, useMemo, useEffect, useRef } from "react";

const C = {
red:"#E8001D",dark:"#f4f5f8",dark2:"#ffffff",dark3:"#ffffff",dark4:"#eceef3",
border:"#e3e5ec",border2:"#d2d5e0",white:"#ffffff",text:"#16161d",gray:"#5c5c70",gray2:"#9a9ab0",
green:"#00a884",orange:"#ef6c00",yellow:"#c8920a",
};

const ADMIN_PIN    = "270913";
const VENDEDOR_PIN = "1234";
const EMAIL_DESTINO = "Francisca@gp3chile.cl";
const SHEETS_URL   = "https://script.google.com/macros/s/AKfycbxh0cN7SV9tZtR0bgvZH6ysGzxQgApFiKn7O4C9mN7HUV8h3hWpLbq2fqYbw5XV1Jk3/exec";

async function syncSheets(type, data) {
try {
 await fetch(SHEETS_URL, {
   method:"POST", mode:"no-cors",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({type,...data})
 });
} catch(e){console.log("Sync error:",e);}
}

async function syncAllVentas(ventas) {
try {
 await fetch(SHEETS_URL, {
   method:"POST", mode:"no-cors",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({type:"reset_ventas",ventas})
 });
} catch(e){console.log("Sync error:",e);}
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
{id:"f4",num:"4ª",nombre:"Concordia",                 inicio:"2026-08-07",fin:"2026-08-09"},
{id:"f5",num:"5ª",nombre:"San Juan Villicum",         inicio:"2026-09-04",fin:"2026-09-06"},
{id:"f6",num:"6ª",nombre:"Termas de Río Hondo 2",    inicio:"2026-10-09",fin:"2026-10-11"},
{id:"f7",num:"7ª",nombre:"San Juan Villicum — Final", inicio:"2026-11-13",fin:"2026-11-15"},
];

const COSTO_NETO_ARS = {
m110sc1:211769, m140sc1:239338, m120sc1:221891, m180sc2:286408,
m200sc1:292350, m200sc2:292350, m200sc3:292350, m120rain:221891, m200rain:292350,
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
return CIRCUITOS_BASE.find(c=>c.inicio>HOY)||CIRCUITOS_BASE[CIRCUITOS_BASE.length-1];
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
function lsGet(key,def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def;}catch{return def;}}
function lsSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch{}}

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
   rowsDetalle.push([v.id,v.fecha,c?.nombre||"",v.num_piloto||"",v.piloto,v.categoria,v.email_cliente,v.tipo_factura==="FAC"?"Factura":"CF",v.cuit||"",v.empresa||"",metLabels[v.metodo]||v.metodo,v.moneda,p?.label||item.prod_id,p?.tipo||"",item.cantidad,item.precio_unit||"",item.total||"",idx===0?v.total_monto:""].join(S));
 });
});
const metodos={};
ventas.forEach(v=>{const k=v.metodo;if(!metodos[k])metodos[k]={label:metLabels[k]||k,usd:0,ars:0,cnt:0,uni:0};if(v.moneda==="USD")metodos[k].usd+=v.total_monto;else metodos[k].ars+=v.total_monto;metodos[k].cnt++;metodos[k].uni+=(v.total_unidades||0);});
const totUSD=ventas.filter(v=>v.moneda==="USD").reduce((s,v)=>s+v.total_monto,0);
const totARS=ventas.filter(v=>v.moneda==="ARS").reduce((s,v)=>s+v.total_monto,0);
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
return(<div style={{display:"flex",alignItems:"center",gap:s.gap}}><div style={{display:"flex",alignItems:"stretch"}}><div style={{background:"#fff",borderRadius:"6px 0 0 6px",padding:"3px 8px",display:"flex",alignItems:"center"}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.gp,fontWeight:900,color:"#0a0a0f",letterSpacing:-1,lineHeight:1}}>GP</span></div><div style={{background:C.red,borderRadius:"0 6px 6px 0",padding:"0 8px",display:"flex",alignItems:"center",transform:"skewX(-6deg)",marginLeft:-2}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.n3,fontWeight:900,color:"#fff",letterSpacing:-2,lineHeight:1,display:"inline-block",transform:"skewX(6deg)"}}> 3</span></div></div><div style={{display:"flex",flexDirection:"column",gap:1}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.sub+2,fontWeight:700,color:C.text,letterSpacing:3,textTransform:"uppercase",lineHeight:1}}>SPORTS LATAM</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:s.sub,fontWeight:600,color:C.red,letterSpacing:2,textTransform:"uppercase",lineHeight:1}}>NEUMÁTICOS PIRELLI</span></div></div>);
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

function InscripcionesPanel(){
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
const filas=data.map(norm);
const fil=q.trim().length>1?filas.filter(p=>(p.nombre+" "+p.apellido+" "+p.categoria+" "+p.numero+" "+p.equipo+" "+p.circuito+" "+p.localidad+" "+p.marca).toLowerCase().includes(q.toLowerCase())):filas;
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
 const moto=((p.marca||"")+" "+(p.modelo||"")).trim();
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
     <Btn small outline onClick={cargar}>↻ Actualizar</Btn>
     <Btn small color={C.green} onClick={exportar} disabled={filas.length===0}>⬇ Excel</Btn>
   </div>
 </div>
 {ts&&<div style={{fontSize:11,color:C.gray,marginTop:-8}}>Actualizado {ts.toLocaleTimeString("es-AR")}</div>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
   <StatBox label="Preinscritos" value={filas.length} color={CAV}/>
   <StatBox label="Categorías" value={catOrden.length} color={C.green}/>
   <StatBox label="Entrenan jueves" value={juevesSi} color={C.yellow}/>
   <StatBox label="Fechas activas" value={porFecha.length}color={C.text}/>
 </div>
 {estado==="error"&&(<Card><div style={{padding:20,textAlign:"center",color:C.gray,fontSize:13}}>No se pudo leer las inscripciones todavía. Si recién subiste el formulario, falta activar la lectura en el Apps Script.<div style={{marginTop:10}}><Btn small outline onClick={cargar}>Reintentar</Btn></div></div></Card>)}
 {estado==="cargando"&&filas.length===0&&(<Card><div style={{padding:24,textAlign:"center",color:C.gray}}>Cargando inscripciones...</div></Card>)}
 {estado==="vacio"&&(<Card><div style={{padding:24,textAlign:"center",color:C.gray}}>Todavía no hay preinscripciones. Cuando un piloto complete el formulario, aparece acá automáticamente.</div></Card>)}
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
 {filas.length>0&&(
  <Card>
    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <div style={{width:3,height:16,background:CAV,borderRadius:2}}/>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text}}>Lista — {fil.length}</span>
      <Input placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:240,marginLeft:"auto"}}/>
    </div>
    <div style={{padding:12,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
        <thead><tr>{["N°","Piloto","Categoría","Moto","Fecha","Jue","Tel","Acciones"].map(h=>(<th key={h} style={{padding:"8px",textAlign:"left",fontSize:9,color:C.gray,letterSpacing:1,textTransform:"uppercase",borderBottom:`2px solid ${CAV}`,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
        <tbody>{fil.map((p,i)=>(<tr key={p.id||i} style={{borderBottom:`1px solid ${C.border}`,background:editId===p.id?CAV+"11":"transparent"}}>
          <td style={{padding:"9px 8px",fontFamily:"'Barlow Condensed',sans-serif",color:CAV,fontWeight:900}}>#{p.numero||"—"}</td>
          <td style={{padding:"9px 8px",fontWeight:700}}>{(p.nombre+" "+p.apellido).trim()||"—"}<div style={{fontSize:10,color:C.gray}}>{p.dni}{p.localidad?" · "+p.localidad:""}</div></td>
          <td style={{padding:"9px 8px"}}><Badge small color={CAV}>{p.categoria}</Badge></td>
          <td style={lblColTd}>{((p.marca||"")+" "+(p.modelo||"")).trim()||"—"}</td>
          <td style={lblColTd}>{p.circuito||"—"}</td>
          <td style={{padding:"9px 8px",fontSize:11,color:p.jueves==="Sí"?C.green:C.gray}}>{p.jueves||"—"}</td>
          <td style={{padding:"9px 8px"}}>{p.telefono?<a href={"https://wa.me/"+p.telefono.replace(/[^\d]/g,"")} target="_blank" rel="noreferrer" style={{color:C.green,textDecoration:"none",fontWeight:700}}>💬</a>:"—"}</td>
          <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
            <button onClick={()=>fichaPDF(p)} title="Ficha PDF" style={{padding:"5px 9px",marginRight:5,background:"transparent",border:`1px solid ${CAV}`,color:CAV,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>🖨 Ficha</button>
            <button onClick={()=>abrirEdit(p)} title="Editar" style={{padding:"5px 9px",marginRight:5,background:"transparent",border:`1px solid ${C.orange}`,color:C.orange,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>✏️</button>
            <button onClick={()=>borrar(p)} title="Borrar" style={{padding:"5px 9px",background:"transparent",border:"1px solid #cc1133",color:"#cc1133",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700}}>🗑</button>
          </td>
        </tr>))}</tbody>
      </table>
    </div>
  </Card>
 )}
</div>
);
}

function AdminPanel({ventas,cierres}){
const [adm,setAdmRaw]=useState(()=>{
 const s=lsGet("gp3_admin",null);
 if(!s)return ADMIN_DEFAULT;
 return {...ADMIN_DEFAULT,...s,estructura:s.estructura||ADMIN_DEFAULT.estructura,fechas:{...ADMIN_DEFAULT.fechas,...(s.fechas||{})}};
});
const admPushTimer=useRef(null);
const [admSavedAt,setAdmSavedAt]=useState(null);
const setAdm=v=>{const withTs={...v,_ts:Date.now()};lsSet("gp3_admin",withTs);setAdmRaw(withTs);if(admPushTimer.current)clearTimeout(admPushTimer.current);admPushTimer.current=setTimeout(()=>{syncSheets("set_config",{key:"admin_json",value:JSON.stringify(withTs)});setAdmSavedAt(new Date());},1200);};
const guardarAhora=()=>{if(admPushTimer.current)clearTimeout(admPushTimer.current);const withTs={...adm,_ts:Date.now()};lsSet("gp3_admin",withTs);setAdmRaw(withTs);syncSheets("set_config",{key:"admin_json",value:JSON.stringify(withTs)});setAdmSavedAt(new Date());};
const adjuntarComprobante=(s,i,it,ev)=>{const file=ev.target.files&&ev.target.files[0];if(!file)return;if(file.size>6*1024*1024){alert("El archivo es muy grande (máx 6 MB). Probá con una foto más liviana o un PDF.");ev.target.value="";return;}const id="cmp_"+Date.now()+"_"+Math.floor(Math.random()*1000);const reader=new FileReader();reader.onload=()=>{const dataB64=String(reader.result).split(",")[1]||"";setCosto(s,i,{comprobante:{id,name:file.name,estado:"subiendo"}});syncSheets("upload_comprobante",{id,fecha:s,item_id:it.id||"",nombre:file.name,mime:file.type||"application/octet-stream",dataB64});};reader.readAsDataURL(file);ev.target.value="";};
useEffect(()=>{let pend=false;Object.values(adm.fechas||{}).forEach(r=>{(r.costos||[]).forEach(c=>{if(c&&c.comprobante&&c.comprobante.estado==="subiendo")pend=true;});});if(!pend)return;const t=setInterval(async()=>{try{const res=await fetch(SHEETS_URL+"?tipo=comprobantes&t="+Date.now());const json=await res.json();if(!json||!json.comprobantes)return;const byId={};json.comprobantes.forEach(c=>{byId[c.id]=c.link;});let changed=false;const nf=JSON.parse(JSON.stringify(adm.fechas||{}));Object.keys(nf).forEach(k=>{(nf[k].costos||[]).forEach(c=>{if(c&&c.comprobante&&c.comprobante.estado==="subiendo"&&byId[c.comprobante.id]){c.comprobante={id:c.comprobante.id,name:c.comprobante.name,url:byId[c.comprobante.id],estado:"listo"};changed=true;}});});if(changed)setAdm({...adm,fechas:nf});}catch(e){}},5000);return ()=>clearInterval(t);},[adm]);
useEffect(()=>{(async()=>{try{
 const res=await fetch(SHEETS_URL+"?t="+Date.now());
 const json=await res.json();
 if(!json||!json.ok)return;
 let remote=null;
 if(json.config&&json.config.admin_json){try{remote=JSON.parse(json.config.admin_json);}catch(e){}}
 const localRaw=lsGet("gp3_admin",null);
 if(remote&&(!localRaw||((remote._ts||0)>(localRaw._ts||0)))){
   const merged={...ADMIN_DEFAULT,...remote,estructura:remote.estructura||ADMIN_DEFAULT.estructura,fechas:{...ADMIN_DEFAULT.fechas,...(remote.fechas||{})}};
   lsSet("gp3_admin",merged);setAdmRaw(merged);setAdmSavedAt(new Date());
 }else if(localRaw){
   syncSheets("set_config",{key:"admin_json",value:JSON.stringify({...localRaw,_ts:localRaw._ts||Date.now()})});setAdmSavedAt(new Date());
 }
}catch(e){}})();},[]);
const [sub,setSub]=useState("f1");
const tc=adm.tc||1400;
const ivaPct=adm.iva||21;
const fmtA=n=>"$ "+Math.round(n||0).toLocaleString("es-AR");

const tireAuto=circId=>{
 const arr=[...ventas.filter(v=>v.circ_id===circId)];
 cierres.forEach(c=>{if(c.circ_id===circId&&Array.isArray(c.ventas))arr.push(...c.ventas);});
 let venta=0,costo=0,unidades=0;
 arr.forEach(v=>{const fx=v.moneda==="USD"?tc:1;(v.items||[]).forEach(it=>{venta+=(it.total||0)*fx;costo+=(it.cantidad||0)*(COSTO_NETO_ARS[it.prod_id]||0);unidades+=(it.cantidad||0);});});
 return{venta,costo,unidades};
};

const calc=fId=>{
 const f=adm.fechas[fId];
 if(!f)return null;
 const div=1+ivaPct/100;
 const netVal=it=>(f.ivaMode==="con_iva"&&it.factura)?Math.round(it.valor/div):(it.valor||0);
 const costos=f.costos||[];
 const costoCarrera=costos.reduce((s,it)=>s+netVal(it),0);
 const docu=costos.filter(it=>it.factura).reduce((s,it)=>s+netVal(it),0);
 const negro=costos.filter(it=>!it.factura).reduce((s,it)=>s+(it.valor||0),0);
 const pagoEfec=costos.filter(it=>(it.pago||"efectivo")!=="transferencia").reduce((s,it)=>s+(it.valor||0),0);
 const pagoTransf=costos.filter(it=>it.pago==="transferencia").reduce((s,it)=>s+(it.valor||0),0);
 const totalAnticipo=costos.reduce((s,it)=>s+(it.pagado?(it.valor||0):Math.min(it.valor||0,Math.max(0,it.anticipo||0))),0);
 const saldoPendiente=costos.reduce((s,it)=>s+(it.pagado?0:Math.max(0,(it.valor||0)-(it.anticipo||0))),0);
 const esManual=!!(f.neuManual&&f.neuManual.on);
 const auto=tireAuto(fId);
 const ventaNeu=esManual?(f.neuManual.venta||0):auto.venta;
 const costoNeu=esManual?(f.neuManual.costo||0):auto.costo;
 const utilidadNeu=ventaNeu-costoNeu;
 const ingNoGoma=(f.insc||0)+(f.track||0)+(f.entr||0)+(f.sponsor||0);
 const ingresos=ingNoGoma+ventaNeu;
 const costoTotal=costoNeu+costoCarrera;
 const resultado=ingresos-costoTotal;
 const estTotalGP3=(adm.estructura||[]).reduce((s,e)=>s+(e.valor||0)*((e.pctGP3||0)/100),0);
 const estFecha=Math.round(estTotalGP3*((f.estPct||0)/100));
 const contribucion=resultado-estFecha;
 const margenPct=ingresos>0?resultado/ingresos*100:0;
 const coberturaPct=costoCarrera>0?ingNoGoma/costoCarrera*100:0;
 const dependPct=costoTotal>0?utilidadNeu/costoTotal*100:0;
 return{f,costos,costoCarrera,docu,negro,pagoEfec,pagoTransf,totalAnticipo,saldoPendiente,ventaNeu,costoNeu,utilidadNeu,unidadesNeu:auto.unidades,ingNoGoma,ingresos,costoTotal,resultado,estTotalGP3,estFecha,contribucion,margenPct,coberturaPct,dependPct,esManual};
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
const estTotalGP3=(adm.estructura||[]).reduce((s,e)=>s+(e.valor||0)*((e.pctGP3||0)/100),0);

// ---- Conciliación bancaria (todo en ARS, una sola cuenta) ----
const cartola=adm.cartola||[];
const addCartolaRow=()=>setAdm({...adm,cartola:[...cartola,{id:"k"+Date.now(),fecha:"",concepto:"",tipo:"in",monto:0}]});
const setCartolaRow=(idx,patch)=>setAdm({...adm,cartola:cartola.map((r,i)=>i===idx?{...r,...patch}:r)});
const delCartolaRow=idx=>setAdm({...adm,cartola:cartola.filter((_,i)=>i!==idx)});
const neuTransfARS=ventas.filter(v=>v.metodo==="transferencia").reduce((s,v)=>s+(v.moneda==="USD"?(v.total_monto||0)*tc:(v.total_monto||0)),0);
const ingTransfManual=CIRCUITOS_BASE.reduce((s,c)=>s+((adm.fechas[c.id]&&adm.fechas[c.id].ingTransf)||0),0);
const gastosTransfARS=CIRCUITOS_BASE.reduce((s,c)=>{const rr=calc(c.id);return s+(rr?rr.pagoTransf:0);},0);
const entradasEsp=neuTransfARS+ingTransfManual;
const netoEsperado=entradasEsp-gastosTransfARS;
const netoReal=cartola.reduce((s,r)=>s+((r.tipo==="out"?-1:1)*(r.monto||0)),0);
const difBanco=netoReal-netoEsperado;

return(
<div style={{display:"flex",flexDirection:"column",gap:16}}>
 <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:C.dark4,border:`1px solid ${admSavedAt?C.green+"55":C.border}`,borderRadius:8,padding:"8px 10px"}}><span style={{flex:1,minWidth:150,fontSize:11,color:admSavedAt?C.green:C.gray}}>{admSavedAt?("✓ Guardado en Google · "+admSavedAt.toLocaleTimeString("es-AR")):"☁ Respaldo activado — se guarda solo, o tocá Guardar"}</span><button onClick={guardarAhora} style={{background:C.green,color:"#06141c",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,letterSpacing:1,textTransform:"uppercase"}}>💾 Guardar</button></div>
 <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
   {SUBS.map(([id,lbl])=>(<button key={id} onClick={()=>setSub(id)} style={{padding:"7px 14px",borderRadius:20,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,border:`1px solid ${sub===id?C.red:C.border2}`,background:sub===id?C.red+"22":"transparent",color:sub===id?C.text:C.gray,whiteSpace:"nowrap"}}>{lbl}</button>))}
   <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
     <Label>TC USD</Label>
     <input value={tc.toLocaleString("es-AR")} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setAdm({...adm,tc:x===""?0:parseInt(x,10)});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.green,borderRadius:8,padding:"7px 10px",fontSize:13,width:90,textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none"}}/>
     <Label>IVA %</Label>
     <input value={ivaPct} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setAdm({...adm,iva:x===""?0:parseInt(x,10)});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"7px 10px",fontSize:13,width:54,textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none"}}/>
   </div>
 </div>

 {sub!=="consolidado"&&(()=>{const r=calc(sub);if(!r)return null;const f=r.f;return(
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:16}}>
     <div style={{display:"flex",flexDirection:"column",gap:16}}>
       <Card><CardHeader>{sub_label(sub)} — Configuración</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
           <Label>Valores cargados</Label>
           <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
             <button onClick={()=>setFecha(sub,{ivaMode:"neto"})} style={{padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${f.ivaMode==="neto"?C.green:C.border}`,background:f.ivaMode==="neto"?"rgba(0,212,170,.1)":C.dark4,color:f.ivaMode==="neto"?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif"}}>NETO (sin IVA)</button>
             <button onClick={()=>setFecha(sub,{ivaMode:"con_iva"})} style={{padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${f.ivaMode==="con_iva"?C.red:C.border}`,background:f.ivaMode==="con_iva"?"rgba(232,0,29,.1)":C.dark4,color:f.ivaMode==="con_iva"?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif"}}>CON IVA</button>
           </div>
           <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>{f.ivaMode==="con_iva"?`A los ítems CON factura se les descuenta el ${ivaPct}% de IVA para mostrar el costo neto real. Los ítems sin factura se toman completos.`:"Los valores se toman tal cual (ya netos). Cambia a CON IVA si cargas importes con IVA incluido."}</div>
         </div>
       </Card>
       <Card><CardHeader>Neumáticos Pirelli (enlazado a Ventas)</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
           <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
             <button onClick={()=>setFecha(sub,{neuManual:{...f.neuManual,on:!(f.neuManual&&f.neuManual.on)}})} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,border:`1px solid ${r.esManual?C.orange:C.green}`,background:r.esManual?C.orange+"22":C.green+"22",color:r.esManual?C.orange:C.green}}>{r.esManual?"✍ MANUAL":"🔗 AUTO (desde Ventas)"}</button>
             <span style={{fontSize:11,color:C.gray}}>{r.esManual?"Cifras cargadas a mano":`${r.unidadesNeu} u. registradas en la app`}</span>
           </div>
           {r.esManual?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><Label>Venta neumáticos (ARS)</Label><NumInput value={f.neuManual.venta} color={C.green} onChange={v=>setFecha(sub,{neuManual:{...f.neuManual,venta:v}})}/></div><div><Label>Costo neto (ARS)</Label><NumInput value={f.neuManual.costo} color={C.red} onChange={v=>setFecha(sub,{neuManual:{...f.neuManual,costo:v}})}/></div></div>):(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><StatBox label="Venta (auto)" value={fmtA(r.ventaNeu)} color={C.green}/><StatBox label="Costo neto (auto)" value={fmtA(r.costoNeu)} color={C.red}/></div>)}
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.dark4,borderRadius:8,borderLeft:`3px solid ${r.utilidadNeu>=0?C.green:C.red}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:1,color:C.text}}>UTILIDAD NEUMÁTICOS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:r.utilidadNeu>=0?C.green:C.red}}>{fmtA(r.utilidadNeu)}</span></div>
         </div>
       </Card>
       <Card><CardHeader>Ingresos de la Fecha</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
           <div><Label>Inscripciones (ARS)</Label><NumInput value={f.insc} color={C.green} onChange={v=>setFecha(sub,{insc:v})}/></div>
           <div><Label>Track Day (ARS)</Label><NumInput value={f.track} color={C.green} onChange={v=>setFecha(sub,{track:v})}/></div>
           <div><Label>Entradas / Público (ARS)</Label><NumInput value={f.entr} color={C.green} onChange={v=>setFecha(sub,{entr:v})}/></div>
           <div><Label>Sponsor (ARS)</Label><NumInput value={f.sponsor} color={C.green} onChange={v=>setFecha(sub,{sponsor:v})}/></div>
           <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}`}}><span style={{color:C.gray,fontSize:13}}>Subtotal (sin goma)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmtA(r.ingNoGoma)}</span></div>
         </div>
       </Card>
     </div>
     <div style={{display:"flex",flexDirection:"column",gap:16}}>
       <Card><CardHeader>Costos de la Carrera</CardHeader>
         <div style={{padding:12}}>
           <div style={{display:"grid",gridTemplateColumns:"1fr 100px 42px 48px 20px",gap:5,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Ítem</span><span style={{textAlign:"right"}}>Valor ARS</span><span style={{textAlign:"center"}}>Fact.</span><span style={{textAlign:"center"}}>Pago</span><span/></div>
           {r.costos.map((it,i)=>{const _ant=Math.max(0,it.anticipo||0);const _pagado=!!it.pagado;const _saldo=_pagado?0:Math.max(0,(it.valor||0)-_ant);const _trf=(it.pago||"efectivo")==="transferencia";return(<div key={it.id||i} style={{marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}><div style={{display:"grid",gridTemplateColumns:"1fr 100px 42px 48px 20px",gap:5,alignItems:"center"}}><input value={it.nombre} onChange={e=>setCosto(sub,i,{nombre:e.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 10px",fontSize:13,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/><NumInput value={it.valor} color={C.red} onChange={v=>setCosto(sub,i,{valor:v})}/><button onClick={()=>setCosto(sub,i,{factura:!it.factura})} style={{padding:"7px 2px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,border:`1px solid ${it.factura?C.green:C.gray2}`,background:it.factura?C.green+"22":"transparent",color:it.factura?C.green:C.gray}}>{it.factura?"FAC":"S/F"}</button><button onClick={()=>setCosto(sub,i,{pago:_trf?"efectivo":"transferencia"})} title="Forma de pago" style={{padding:"7px 2px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,border:`1px solid ${_trf?"#2b8fd0":C.green}`,background:(_trf?"#2b8fd0":C.green)+"22",color:_trf?"#2b8fd0":C.green}}>{_trf?"TRF":"EFE"}</button><button onClick={()=>delCosto(sub,i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:16}}>×</button></div><div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:6}}>{it.factura&&(<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>N° factura</span><input value={it.numFactura||""} onChange={e=>setCosto(sub,i,{numFactura:e.target.value})} placeholder="0001-00000123" style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:6,padding:"5px 8px",fontSize:12,outline:"none",width:130,fontFamily:"'Barlow',sans-serif"}}/></div>)}{!_pagado&&(<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>Anticipo</span><div style={{width:96}}><NumInput value={_ant} color={C.green} onChange={v=>setCosto(sub,i,{anticipo:v})}/></div></div>)}<button onClick={()=>setCosto(sub,i,{pagado:!_pagado})} style={{padding:"6px 10px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,border:`1px solid ${_pagado?C.green:C.border2}`,background:_pagado?C.green+"22":"transparent",color:_pagado?C.green:C.gray}}>{_pagado?"✓ PAGADO":"MARCAR PAGADO"}</button>{_pagado?(<span style={{fontSize:11,color:C.green,fontWeight:700}}>Pagado completo</span>):(_ant>0&&(<span style={{fontSize:11,color:C.gray}}>Falta: <b style={{color:_saldo>0?C.orange:C.green,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtA(_saldo)}</b></span>))}{it.comprobante&&it.comprobante.estado==="subiendo"?(<span style={{fontSize:11,color:C.gray}}>⏳ Subiendo {it.comprobante.name}…</span>):it.comprobante&&it.comprobante.estado==="listo"?(<span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11}}><a href={it.comprobante.url} target="_blank" rel="noreferrer" style={{color:C.green,fontWeight:700,textDecoration:"none"}}>📎 Ver comprobante</a><button onClick={()=>setCosto(sub,i,{comprobante:null})} title="Quitar" style={{background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:13}}>✕</button></span>):(<label style={{display:"inline-flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,textTransform:"uppercase",color:C.gray,border:`1px solid ${C.border2}`,borderRadius:6,padding:"6px 10px"}}>📎 Adjuntar<input type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>adjuntarComprobante(sub,i,it,e)}/></label>)}</div></div>);})}
           <Btn small outline onClick={()=>addCosto(sub)} style={{marginTop:6}}>+ Agregar ítem</Btn>
           <div style={{marginTop:12,paddingTop:10,borderTop:`2px solid ${C.red}`,display:"flex",flexDirection:"column",gap:4}}>
             <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>Con factura (deducible)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.green}}>{fmtA(r.docu)}</span></div>
             <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>Sin factura</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.orange}}>{fmtA(r.negro)}</span></div>
             <div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:`1px dashed ${C.border}`}}><span style={{color:C.gray,fontSize:12}}>💵 Pagado en efectivo</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.green}}>{fmtA(r.pagoEfec)}</span></div>
             <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>🏦 Pagado por transferencia</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:"#2b8fd0"}}>{fmtA(r.pagoTransf)}</span></div>
             {r.totalAnticipo>0&&(<div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:`1px dashed ${C.border}`}}><span style={{color:C.gray,fontSize:12}}>✅ Pagado (anticipos + completos)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.green}}>{fmtA(r.totalAnticipo)}</span></div>)}
             {r.totalAnticipo>0&&(<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:12}}>⏳ Falta por pagar</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.orange}}>{fmtA(r.saldoPendiente)}</span></div>)}
             <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>TOTAL CARRERA</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:18}}>{fmtA(r.costoCarrera)}</span></div>
           </div>
         </div>
       </Card>
       <Card style={{border:`1px solid ${r.resultado>=0?C.green:C.red}`}}><CardHeader>Resultado de la Fecha</CardHeader>
         <div style={{padding:12,display:"flex",flexDirection:"column",gap:6}}>
           {[["Ingresos totales",r.ingresos,C.green],["(−) Costo neumáticos",-r.costoNeu,C.gray],["(−) Costo carrera",-r.costoCarrera,C.gray]].map(([l,v,col],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:13}}>{l}</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:col}}>{fmtA(v)}</span></div>))}
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,margin:"4px 0"}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>MARGEN DE LA FECHA</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:24,color:r.resultado>=0?C.green:C.red}}>{fmtA(r.resultado)}</span></div>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:C.gray,fontSize:13}}>(−) Estructura asignada</span><div style={{display:"flex",alignItems:"center",gap:8}}><input value={f.estPct} onChange={e=>{const x=e.target.value.replace(/[^\d]/g,"");setFecha(sub,{estPct:x===""?0:Math.min(100,parseInt(x,10))});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:6,padding:"5px 8px",fontSize:13,width:48,textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none"}}/><span style={{color:C.gray,fontSize:12}}>%</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.orange,minWidth:90,textAlign:"right"}}>{fmtA(r.estFecha)}</span></div></div>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:r.contribucion>=0?"rgba(0,212,170,.08)":"rgba(232,0,29,.08)",borderRadius:8,marginTop:4}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>CONTRIBUCIÓN NETA</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:26,color:r.contribucion>=0?C.green:C.red}}>{fmtA(r.contribucion)}</span></div>
           <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:8}}><StatBox label="Margen %" value={r.margenPct.toFixed(0)+"%"} color={r.margenPct>=0?C.green:C.red}/><StatBox label="Cobertura carrera" value={r.coberturaPct.toFixed(0)+"%"} color={r.coberturaPct>=100?C.green:C.orange}/><StatBox label="Aporte goma" value={r.dependPct.toFixed(0)+"%"} color={C.yellow}/></div>
         </div>
       </Card>
     </div>
   </div>
 );})()}

 {sub==="consolidado"&&(
   <div style={{display:"flex",flexDirection:"column",gap:16}}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
       <StatBox label="Ingresos totales" value={fmtA(totIngresos)} color={C.green}/>
       <StatBox label="Σ Márgenes de fechas" value={fmtA(totResultado)} color={totResultado>=0?C.green:C.red}/>
       <StatBox label="Estructura período" value={fmtA(totEstructura)} color={C.orange}/>
       <StatBox label="Utilidad neumáticos" value={fmtA(totUtilNeu)} color={C.yellow}/>
     </div>
     <Card style={{border:`2px solid ${totContribucion>=0?C.green:C.red}`}}>
       <div style={{padding:20,textAlign:"center"}}>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:3,color:C.gray,textTransform:"uppercase"}}>Contribución final del campeonato (7 fechas)</div>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:900,color:totContribucion>=0?C.green:C.red,letterSpacing:-2,lineHeight:1.1,margin:"6px 0"}}>{fmtA(totContribucion)}</div>
         <div style={{fontSize:13,color:C.gray,maxWidth:560,margin:"0 auto",lineHeight:1.5}}>{totContribucion>=0?"La operación genera resultado positivo después de cubrir la estructura. El negocio se sostiene y deja excedente.":"Tras la estructura el resultado es negativo: la operación aún depende de aportes o requiere mejorar márgenes/ingresos por fecha."}</div>
       </div>
     </Card>
     <Card><CardHeader>Evolución por Fecha — Contribución Neta</CardHeader>
       <div style={{padding:"20px 12px"}}>
         {(()=>{const vals=datos.map(d=>d.r?d.r.contribucion:0);const maxAbs=Math.max(1,...vals.map(v=>Math.abs(v)));const W=Math.max(320,datos.length*86),H=220,mid=H/2,bw=44,gap=(W-datos.length*bw)/(datos.length+1);return(<div style={{overflowX:"auto"}}><svg width={W} height={H+44} style={{display:"block",minWidth:"100%"}}><line x1="0" y1={mid} x2={W} y2={mid} stroke={C.border2} strokeWidth="1"/>{datos.map((d,i)=>{const v=d.r?d.r.contribucion:0;const h=Math.abs(v)/maxAbs*(mid-16);const x=gap+i*(bw+gap);const y=v>=0?mid-h:mid;const col=v>=0?C.green:C.red;return(<g key={d.c.id}><rect x={x} y={y} width={bw} height={Math.max(2,h)} rx="3" fill={col} opacity="0.85"/><text x={x+bw/2} y={v>=0?y-5:y+h+13} textAnchor="middle" fill={col} fontSize="10" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700">{Math.round(v/1e6)}M</text><text x={x+bw/2} y={H+14} textAnchor="middle" fill={C.gray} fontSize="10" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700">{d.c.num}</text></g>);})}</svg></div>);})()}
         <div style={{fontSize:11,color:C.gray,marginTop:8,textAlign:"center"}}>Barras verdes = la fecha aporta; rojas = la fecha resta. Muestra la proyección a lo largo del año.</div>
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
         <div style={{fontSize:11,color:C.gray,marginBottom:10,lineHeight:1.4}}>Gastos que sirven a todo el negocio (no solo al CAV). El % GP3 es cuánto de ese gasto corresponde a esta operación; el total ponderado se reparte entre fechas según el % de estructura de cada una.</div>
         <div style={{display:"grid",gridTemplateColumns:"1fr 116px 58px 26px",gap:6,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Gasto</span><span style={{textAlign:"right"}}>Valor ARS</span><span style={{textAlign:"center"}}>% GP3</span><span/></div>
         {adm.estructura.map((e,i)=>(<div key={e.id||i} style={{display:"grid",gridTemplateColumns:"1fr 116px 58px 26px",gap:6,alignItems:"center",marginBottom:6}}><input value={e.nombre} onChange={ev=>setEst(i,{nombre:ev.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 10px",fontSize:13,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/><NumInput value={e.valor} color={C.orange} onChange={v=>setEst(i,{valor:v})}/><input value={e.pctGP3} onChange={ev=>{const x=ev.target.value.replace(/[^\d]/g,"");setEst(i,{pctGP3:x===""?0:Math.min(100,parseInt(x,10))});}} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 6px",fontSize:13,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,outline:"none",width:"100%"}}/><button onClick={()=>delEst(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:16}}>×</button></div>))}
         <Btn small outline onClick={addEst} style={{marginTop:6}}>+ Agregar gasto</Btn>
         <div style={{marginTop:12,paddingTop:10,borderTop:`2px solid ${C.red}`,display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>ESTRUCTURA GP3 (ponderada)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.orange,fontSize:18}}>{fmtA(estTotalGP3)}</span></div>
         <div style={{fontSize:11,color:C.gray,marginTop:6}}>Repartido en fechas: {fmtA(totEstructura)} ({estTotalGP3>0?Math.round(totEstructura/estTotalGP3*100):0}% asignado).</div>
       </div>
     </Card>
   </div>
 )}

 {sub==="banco"&&(
   <div style={{display:"flex",flexDirection:"column",gap:16}}>
     <div style={{fontSize:12,color:C.gray,lineHeight:1.5}}>Conciliación de la cuenta del Banco (Argentina), todo en pesos. Solo movimientos por <b>transferencia</b> — lo de efectivo no entra acá. Las ventas en USD se convierten al TC ({tc.toLocaleString("es-AR")}).</div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
       <StatBox label="Esperado: entró" value={fmtA(entradasEsp)} color={C.green}/>
       <StatBox label="Esperado: salió" value={fmtA(gastosTransfARS)} color={C.red}/>
       <StatBox label="Neto esperado (app)" value={fmtA(netoEsperado)} color={netoEsperado>=0?C.green:C.red}/>
       <StatBox label="Neto real (cartola)" value={fmtA(netoReal)} color={netoReal>=0?C.green:C.red}/>
     </div>
     <Card style={{border:`2px solid ${Math.abs(difBanco)<1?C.green:C.orange}`}}>
       <div style={{padding:18,textAlign:"center"}}>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:3,color:C.gray,textTransform:"uppercase"}}>Diferencia (cartola − app)</div>
         <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:40,fontWeight:900,color:Math.abs(difBanco)<1?C.green:C.orange,letterSpacing:-1,margin:"4px 0"}}>{fmtA(difBanco)}</div>
         <div style={{fontSize:13,color:C.gray}}>{Math.abs(difBanco)<1?"✅ Cuadra: el banco coincide con la app.":"Hay diferencia: revisá movimientos de la cartola o ingresos/gastos por transferencia no cargados."}</div>
       </div>
     </Card>
     <Card><CardHeader>Esperado por la app — Entradas</CardHeader>
       <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
         <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,borderBottom:`1px solid ${C.border}`}}><span style={{color:C.gray,fontSize:13}}>🛞 Neumáticos por transferencia (automático)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmtA(neuTransfARS)}</span></div>
         <Label>Otros ingresos por transferencia por fecha (inscripciones, track, sponsor)</Label>
         {CIRCUITOS_BASE.map(c=>(<div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:8,alignItems:"center"}}><span style={{fontSize:13}}>{c.num} {c.nombre}</span><NumInput value={adm.fechas[c.id]?.ingTransf||0} color={C.green} onChange={v=>setFecha(c.id,{ingTransf:v})}/></div>))}
         <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`2px solid ${C.green}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>TOTAL ENTRADAS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:18}}>{fmtA(entradasEsp)}</span></div>
       </div>
     </Card>
     <Card><CardHeader>Esperado por la app — Salidas</CardHeader>
       <div style={{padding:12,display:"flex",flexDirection:"column",gap:6}}>
         <div style={{fontSize:11,color:C.gray,marginBottom:4}}>Suma de los gastos de cada fecha que marcaste como 🏦 transferencia (botón TRF).</div>
         {CIRCUITOS_BASE.map(c=>{const rr=calc(c.id);const v=rr?rr.pagoTransf:0;if(v<=0)return null;return(<div key={c.id} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.gray,fontSize:13}}>{c.num} {c.nombre}</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.red}}>{fmtA(v)}</span></div>);})}
         <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`2px solid ${C.red}`,marginTop:4}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>TOTAL SALIDAS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:18}}>{fmtA(gastosTransfARS)}</span></div>
       </div>
     </Card>
     <Card><CardHeader>Cartola del Banco (movimientos reales)</CardHeader>
       <div style={{padding:12}}>
         <div style={{fontSize:11,color:C.gray,marginBottom:10}}>Cargá cada movimiento de la cuenta. Entrada = plata que entró; Salida = plata que salió. Todo en pesos.</div>
         <div style={{display:"grid",gridTemplateColumns:"96px 1fr 92px 120px 22px",gap:6,fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}><span>Fecha</span><span>Concepto</span><span style={{textAlign:"center"}}>Tipo</span><span style={{textAlign:"right"}}>Monto ARS</span><span/></div>
         {cartola.map((r,i)=>(<div key={r.id||i} style={{display:"grid",gridTemplateColumns:"96px 1fr 92px 120px 22px",gap:6,alignItems:"center",marginBottom:6}}>
           <input value={r.fecha||""} placeholder="01/06" onChange={e=>setCartolaRow(i,{fecha:e.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 8px",fontSize:12,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/>
           <input value={r.concepto||""} placeholder="Concepto" onChange={e=>setCartolaRow(i,{concepto:e.target.value})} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"9px 10px",fontSize:13,outline:"none",width:"100%",fontFamily:"'Barlow',sans-serif"}}/>
           <button onClick={()=>setCartolaRow(i,{tipo:r.tipo==="out"?"in":"out"})} style={{padding:"8px 4px",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,border:`1px solid ${r.tipo==="out"?C.red:C.green}`,background:(r.tipo==="out"?C.red:C.green)+"22",color:r.tipo==="out"?C.red:C.green}}>{r.tipo==="out"?"− Salida":"+ Entrada"}</button>
           <NumInput value={r.monto||0} color={r.tipo==="out"?C.red:C.green} onChange={v=>setCartolaRow(i,{monto:v})}/>
           <button onClick={()=>delCartolaRow(i)} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:16}}>×</button>
         </div>))}
         <Btn small outline onClick={addCartolaRow} style={{marginTop:6}}>+ Agregar movimiento</Btn>
         <div style={{display:"flex",justifyContent:"space-between",marginTop:12,paddingTop:8,borderTop:`2px solid ${C.text}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,letterSpacing:1}}>NETO REAL (CARTOLA)</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:netoReal>=0?C.green:C.red,fontSize:18}}>{fmtA(netoReal)}</span></div>
       </div>
     </Card>
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
const abiertasHoy=ventas.filter(v=>!closedIds.has(v.id)&&esHoy(v.id)&&v.circ_id===eventoActivo);
const tot={};let units=0;const metodos={};
abiertasHoy.forEach(v=>{tot[v.moneda]=(tot[v.moneda]||0)+v.total_monto;units+=v.total_unidades||0;const k=v.metodo||"otro";if(!metodos[k])metodos[k]={usd:0,ars:0,cnt:0};if(v.moneda==="USD")metodos[k].usd+=v.total_monto;else metodos[k].ars+=v.total_monto;metodos[k].cnt++;});
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
   <div style={{fontSize:11,color:C.gray,lineHeight:1.4}}>Al cerrar, estas ventas se archivan y la lista del día queda limpia. <b>No se borran</b>: siguen contando en el total del evento en Administración. La cantidad de inscritos se toma del módulo de Inscripciones al cerrar.</div>
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

export default function App(){
const [modo,setModo]=useState(null);
const [pinVendedor,setPinVendedor]=useState("");
const [pinErrorVendedor,setPinErrorVendedor]=useState(false);
const [pinAdmin,setPinAdmin]=useState("");
const [pinErrorAdmin,setPinErrorAdmin]=useState(false);
const [tab,setTab]=useState("venta");
const [toast,setToast]=useState(null);
const [filtro,setFiltro]=useState("todos");
const [busqStats,setBusqStats]=useState("");
const [editVenta,setEditVenta]=useState(null);
const [pilotoPerfil,setPilotoPerfil]=useState(null);
const [busqPiloto,setBusqPiloto]=useState("");

const [ventas,setVentasRaw]=useState(()=>lsGet("gp3_ventas",[]));
const [pending,setPendingRaw]=useState(()=>lsGet("gp3_ventas_pending",[]));
const [eventoForzado,setEventoForzado]=useState(()=>lsGet("gp3_evento_forzado",""));
const [cierresDia,setCierresDiaRaw]=useState(()=>lsGet("gp3_cierres_dia",[]));
const [stock,setStockRaw]=useState(()=>{
 const saved=lsGet("gp3_stock",null);
 if(!saved)return STOCK0;
 return{...STOCK0,...saved};
});
const [pilotos,setPilotosRaw]=useState(()=>lsGet("gp3_pilotos",[]));
const [cats,setCatsRaw]=useState(()=>lsGet("gp3_cats",[]));
const [precios,setPreciosRaw]=useState(()=>lsGet("gp3_precios",Object.fromEntries(PRODUCTOS.map(p=>[p.id,{...p.precios}]))));
const [cierres,setCierresRaw]=useState(()=>lsGet("gp3_cierres",[]));
const [productosExtra,setProductosExtraRaw]=useState(()=>{
 const extras=lsGet("gp3_productos_extra",[]);
 const fixedIds=new Set(PRODUCTOS.map(p=>p.id));
 const clean=extras.filter(e=>!fixedIds.has(e.id)&&e.label&&!e.id.match(/extra_\d{13}/));
 if(clean.length!==extras.length){lsSet("gp3_productos_extra",clean);}
 return clean;
});
const [nombresEdit,setNombresEditRaw]=useState(()=>lsGet("gp3_nombres",{}));
const [stockDraft,setStockDraft]=useState(null);
const preciosPushTimer=useRef(null);

const setVentas=v=>{lsSet("gp3_ventas",v);setVentasRaw(v);};
const setPending=v=>{lsSet("gp3_ventas_pending",v);setPendingRaw(v);};
const marcarBorradoLocal=id=>{const lb=lsGet("gp3_borrados_local",[]).filter(x=>x!==id);lsSet("gp3_borrados_local",[id,...lb]);};
const setCierresDia=v=>{lsSet("gp3_cierres_dia",v);setCierresDiaRaw(v);};
const closedIds=useMemo(()=>{const s=new Set();(cierresDia||[]).forEach(c=>(c.ids||[]).forEach(id=>s.add(Number(id))));return s;},[cierresDia]);
const ventasAbiertas=useMemo(()=>ventas.filter(v=>!closedIds.has(v.id)),[ventas,closedIds]);
const setStock=v=>{lsSet("gp3_stock",v);setStockRaw(v);};
const setPilotos=v=>{lsSet("gp3_pilotos",v);setPilotosRaw(v);};
const setCats=v=>{lsSet("gp3_cats",v);setCatsRaw(v);};
const setPrecios=v=>{lsSet("gp3_precios",v);setPreciosRaw(v);const ts=Date.now();lsSet("gp3_precios_ts",ts);if(preciosPushTimer.current)clearTimeout(preciosPushTimer.current);preciosPushTimer.current=setTimeout(()=>{syncSheets("set_config",{key:"precios_json",value:JSON.stringify({precios:v,_ts:ts})});},1000);};
const setCierres=v=>{lsSet("gp3_cierres",v);setCierresRaw(v);};
const setProductosExtra=v=>{lsSet("gp3_productos_extra",v);setProductosExtraRaw(v);};
const setNombresEdit=v=>{lsSet("gp3_nombres",v);setNombresEditRaw(v);};

const todosLosProductos=useMemo(()=>[
 ...PRODUCTOS.map(p=>({...p,label:nombresEdit[p.id]||p.label})),
 ...productosExtra
],[productosExtra,nombresEdit]);

const boom=(msg,err=false)=>{setToast({msg,err});setTimeout(()=>setToast(null),3000);};
const isAdmin=modo==="admin";
const todosLosPilotos=useMemo(()=>[...PILOTOS_BASE,...pilotos],[pilotos]);
const todasLasCats=useMemo(()=>[...new Set([...CATS_BASE,...cats])],[cats]);
const circActivo=getCircuitoActivo();
const eventoActivo=(eventoForzado&&CIRCUITOS_BASE.find(c=>c.id===eventoForzado))?eventoForzado:circActivo.id;
const circuitos=isAdmin?CIRCUITOS_BASE:[...new Set([eventoActivo,...getCircuitosVendedor().map(c=>c.id)])].map(id=>CIRCUITOS_BASE.find(c=>c.id===id)).filter(Boolean);

const FORM0={circ_id:eventoActivo,fecha:HOY,piloto:"",num_piloto:"",categoria:todasLasCats[0]||"",moneda:"USD",metodo:"efectivo_usd",email_cliente:"",tipo_factura:"CF",cuit:"",empresa:""};
const [form,setForm]=useState(FORM0);
const [pilotoQ,setPilotoQ]=useState("");
const [showSug,setShowSug]=useState(false);
const [carrito,setCarrito]=useState([]);
const [cantSel,setCantSel]=useState(Object.fromEntries(todosLosProductos.map(p=>[p.id,0])));
useEffect(()=>{if(carrito.length===0&&!editVenta){setForm(f=>f.circ_id===eventoActivo?f:{...f,circ_id:eventoActivo});}},[eventoActivo]);
const forzarEvento=(id)=>{setEventoForzado(id);lsSet("gp3_evento_forzado",id);syncSheets("set_config",{key:"evento_forzado",value:id});setForm(f=>({...f,circ_id:id||circActivo.id}));setTimeout(cargarDesdeSheet,2000);boom(id?("📍 Evento activo forzado: "+(CIRCUITOS_BASE.find(c=>c.id===id)?.nombre||id)):"🔄 Evento activo: automático por fecha");};
const cerrarDia=async(abiertasHoy,vendedorLabel)=>{
 if(!abiertasHoy||abiertasHoy.length===0){boom("No hay ventas abiertas hoy para cerrar",true);return;}
 if(!window.confirm("¿Cerrar el día?\n\nSe archivan "+abiertasHoy.length+" venta(s) y la lista del día queda limpia.\nLas ventas NO se borran: siguen contando en el total del evento."))return;
 const tot={};let units=0;const metodos={};
 abiertasHoy.forEach(v=>{tot[v.moneda]=(tot[v.moneda]||0)+v.total_monto;units+=v.total_unidades||0;const k=v.metodo||"otro";if(!metodos[k])metodos[k]={usd:0,ars:0,cnt:0};if(v.moneda==="USD")metodos[k].usd+=v.total_monto;else metodos[k].ars+=v.total_monto;metodos[k].cnt++;});
 let inscritos=0;
 try{const r=await fetch(SHEETS_URL+"?tipo=inscripciones&t="+Date.now());const j=await r.json();const arr=Array.isArray(j)?j:(j.inscripciones||j.data||[]);const evx=CIRCUITOS_BASE.find(c=>c.id===eventoActivo);inscritos=arr.filter(p=>(p.circ_id===eventoActivo)||(evx&&p.circuito===evx.nombre)).length;}catch(e){}
 const evx=CIRCUITOS_BASE.find(c=>c.id===eventoActivo);
 const cierre={id:Date.now(),fecha:HOY,hora:new Date().toLocaleTimeString("es-AR"),evento:evx?evx.nombre:eventoActivo,circ_id:eventoActivo,vendedor:vendedorLabel||(isAdmin?"Administración":"Francisca"),totales:tot,unidades:units,numVentas:abiertasHoy.length,metodos,inscritos,ids:abiertasHoy.map(v=>v.id)};
 setCierresDia([cierre,...cierresDia]);
 syncSheets("cierre_dia",{cierre});
 setTimeout(cargarDesdeSheet,2500);
 boom("✅ Día cerrado — "+abiertasHoy.length+" venta(s) archivada(s) · "+inscritos+" inscritos");
};
const cerrarEvento=async()=>{
 const abiertas=ventas.filter(v=>!closedIds.has(v.id)&&v.circ_id===eventoActivo);
 const evx=CIRCUITOS_BASE.find(c=>c.id===eventoActivo);
 const nombre=evx?evx.nombre:eventoActivo;
 if(!window.confirm("¿Cerrar el evento "+nombre+"?\n\nSe archivan "+abiertas.length+" venta(s) abierta(s) de este evento y la lista queda limpia. Las ventas NO se borran: siguen en el total del evento en Administración. Después el evento activo vuelve a automático (pasa al siguiente)."))return;
 const tot={};let units=0;const metodos={};
 abiertas.forEach(v=>{tot[v.moneda]=(tot[v.moneda]||0)+v.total_monto;units+=v.total_unidades||0;const k=v.metodo||"otro";if(!metodos[k])metodos[k]={usd:0,ars:0,cnt:0};if(v.moneda==="USD")metodos[k].usd+=v.total_monto;else metodos[k].ars+=v.total_monto;metodos[k].cnt++;});
 let inscritos=0;
 try{const r=await fetch(SHEETS_URL+"?tipo=inscripciones&t="+Date.now());const j=await r.json();const arr=Array.isArray(j)?j:(j.inscripciones||j.data||[]);inscritos=arr.filter(p=>(p.circ_id===eventoActivo)||(evx&&p.circuito===nombre)).length;}catch(e){}
 const cierre={id:Date.now(),fecha:HOY,hora:new Date().toLocaleTimeString("es-AR"),evento:nombre,circ_id:eventoActivo,vendedor:isAdmin?"Administración":"Francisca",tipo:"evento",totales:tot,unidades:units,numVentas:abiertas.length,metodos,inscritos,ids:abiertas.map(v=>v.id)};
 setCierresDia([cierre,...cierresDia]);
 syncSheets("cierre_dia",{cierre});
 forzarEvento("");
 setTimeout(cargarDesdeSheet,2500);
 boom("🏁 Evento "+nombre+" cerrado — "+abiertas.length+" venta(s) archivada(s)");
};

const sugerencias=useMemo(()=>{
 if(!showSug)return[];
 if(pilotoQ.length===0)return todosLosPilotos.slice(0,12);
 const q=pilotoQ.toLowerCase();
 return todosLosPilotos.filter(p=>p.nombre.toLowerCase().includes(q)||p.num.includes(q)).slice(0,12);
},[pilotoQ,todosLosPilotos,showSug]);

const selPiloto=p=>{setForm(f=>({...f,piloto:p.nombre,num_piloto:p.num,categoria:p.cat}));setPilotoQ(p.nombre);setShowSug(false);};

const carritoConPrecios=carrito.map(item=>{
 const p=todosLosProductos.find(x=>x.id===item.prod_id);
 const pu=getPrecio(p,form.moneda,precios);
 return{...item,prod:p,precio_unit:pu,total:pu*item.cantidad};
});
const carritoTotal=carritoConPrecios.reduce((s,i)=>s+i.total,0);
const carritoUnits=carrito.reduce((s,i)=>s+i.cantidad,0);

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
 const nuevaVenta={id:Date.now(),circ_id:form.circ_id,fecha:form.fecha,piloto:form.piloto,num_piloto:form.num_piloto,categoria:form.categoria,email_cliente:form.email_cliente,tipo_factura:form.tipo_factura,cuit:form.cuit,empresa:form.empresa,metodo:form.metodo,moneda:form.moneda,items:carritoConPrecios.map(i=>({prod_id:i.prod_id,cantidad:i.cantidad,precio_unit:i.precio_unit,total:i.total})),total_monto:carritoTotal,total_unidades:carritoUnits};
 setVentas([nuevaVenta,...ventas]);
 setPending([nuevaVenta,...pending]);
 syncSheets("venta",{venta:nuevaVenta});
 const nuevoStock={...stock};
 carrito.forEach(item=>{nuevoStock[item.prod_id]={...nuevoStock[item.prod_id],flotante:Math.max(0,(nuevoStock[item.prod_id]?.flotante??0)-item.cantidad)};});
 setStock(nuevoStock);
 setTimeout(cargarDesdeSheet,2500);
 boom("✓ Venta registrada — "+carritoUnits+" neumático"+(carritoUnits!==1?"s":""));
 setCarrito([]);setForm({...FORM0});setPilotoQ("");setShowSug(false);setEditVenta(null);
 setCantSel(Object.fromEntries(todosLosProductos.map(p=>[p.id,0])));
};

const totales=useMemo(()=>{const t={};ventas.forEach(v=>{t[v.moneda]=(t[v.moneda]||0)+v.total_monto;});return t;},[ventas]);
const totalesAbiertas=useMemo(()=>{const t={};ventasAbiertas.forEach(v=>{t[v.moneda]=(t[v.moneda]||0)+v.total_monto;});return t;},[ventasAbiertas]);
const vF=useMemo(()=>{let r=filtro==="todos"?ventas:ventas.filter(v=>v.circ_id===filtro);if(busqStats.trim().length>1){const q=busqStats.toLowerCase();r=r.filter(v=>v.piloto.toLowerCase().includes(q)||v.num_piloto.includes(q)||v.categoria.toLowerCase().includes(q));}return r;},[ventas,filtro,busqStats]);

const cargarDesdeSheet=async()=>{try{
 const res=await fetch(SHEETS_URL+"?t="+Date.now());
 const json=await res.json();
 if(!json||!json.ok)return;
 const ef=(json.config&&json.config.evento_forzado)?json.config.evento_forzado.toString():"";
 setEventoForzado(ef);lsSet("gp3_evento_forzado",ef);
 if(json.config&&json.config.precios_json){try{const rp=JSON.parse(json.config.precios_json);const rts=rp._ts||0;const lts=Number(lsGet("gp3_precios_ts",0))||0;if(rp.precios&&rts>lts){lsSet("gp3_precios",rp.precios);lsSet("gp3_precios_ts",rts);setPreciosRaw(rp.precios);}}catch(e){}}
 if(Array.isArray(json.cierresDia)){
   const cds=[];
   for(let i=1;i<json.cierresDia.length;i++){const row=json.cierresDia[i];if(!row||!row[4])continue;try{cds.push(JSON.parse(row[4]));}catch(e){}}
   setCierresDiaRaw(cds);lsSet("gp3_cierres_dia",cds);
 }
 if(Array.isArray(json.stock)){
   const fromSheet={};
   for(let i=1;i<json.stock.length;i++){const row=json.stock[i];const id=(row&&row[0]!=null)?row[0].toString().trim():"";if(!id)continue;fromSheet[id]={bodega:Number(row[3])||0,transito:Number(row[4])||0,flotante:Number(row[5])||0};}
   if(Object.keys(fromSheet).length>0)setStock({...STOCK0,...fromSheet});
 }
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
     remoto.push({id,fecha:(row[1]||"").toString(),circ_id:(row[2]||"").toString(),num_piloto:(row[3]||"").toString(),piloto:(row[4]||"").toString(),categoria:(row[5]||"").toString(),email_cliente:(row[6]||"").toString(),tipo_factura:row[7]==="Factura"?"FAC":"CF",cuit:(row[8]||"").toString(),empresa:(row[9]||"").toString(),metodo:(row[10]||"").toString(),moneda,items:itemsFull,total_monto:totalMonto,total_unidades:unidades});
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
   const byId=new Map();
   remotoOk.forEach(v=>byId.set(v.id,v));
   stillPending.forEach(v=>byId.set(v.id,v));
   const merged=[...byId.values()].sort((a,b)=>b.id-a.id);
   lsSet("gp3_ventas",merged);
   setVentasRaw(merged);
 }
}catch(e){}};
useEffect(()=>{cargarDesdeSheet();const id=setInterval(cargarDesdeSheet,12000);return()=>clearInterval(id);},[]);
useEffect(()=>{if(!isAdmin)return;const ts=Date.now();lsSet("gp3_precios_ts",ts);syncSheets("set_config",{key:"precios_json",value:JSON.stringify({precios,_ts:ts})});},[isAdmin]);

const tabs=isAdmin?[["venta","🛒 Venta"],["stock","📦 Stock"],["estadisticas","📊 Stats"],["cierre","🗂 Cierre"],["gestion","⚙️ Gestión"],["admin","📈 Administración"],["inscripciones","📋 Inscripciones"]]:[["venta","🛒 Venta"],["mis_stats","📊 Mi Resumen"]];

if(!modo)return(
 <><style>{GS}</style>
 <div style={{minHeight:"100vh",background:C.dark,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:32}}>
   <div style={{position:"fixed",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.red},#ff6b6b,${C.red})`}}/>
   <div className="slide-up" style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
     <Logo size="lg"/>
     <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:4,color:C.red,textTransform:"uppercase",fontWeight:700}}>CAV — Campeonato Argentino de Velocidad 2026</span>
   </div>
   <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",width:"100%",maxWidth:440}}>
     <div className="anim-in" style={{flex:1,minWidth:180,background:C.dark3,border:`1px solid ${C.border}`,borderRadius:14,padding:24,textAlign:"center",borderTop:`3px solid ${C.green}`}}>
       <div style={{fontSize:32,marginBottom:10}}>🛒</div>
       <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:C.text,letterSpacing:2,marginBottom:4}}>MODO VENTA</div>
       <div style={{fontSize:12,color:C.gray,marginBottom:12}}>Registrar ventas en pista</div>
       <Input type="password" inputMode="numeric" placeholder="PIN vendedor" value={pinVendedor} onChange={e=>{setPinVendedor(e.target.value);setPinErrorVendedor(false);}} onKeyDown={e=>e.key==="Enter"&&(pinVendedor===VENDEDOR_PIN?(setModo("vendedor"),setTab("venta"),setPinVendedor(""),setPinErrorVendedor(false)):setPinErrorVendedor(true))} style={{marginBottom:8,textAlign:"center"}}/>
       {pinErrorVendedor&&<div style={{fontSize:11,color:C.red,marginBottom:8,fontWeight:600}}>PIN incorrecto</div>}
       <Btn full color={C.green} onClick={()=>{pinVendedor===VENDEDOR_PIN?(setModo("vendedor"),setTab("venta"),setPinVendedor(""),setPinErrorVendedor(false)):setPinErrorVendedor(true);}}>INGRESAR</Btn>
     </div>
     <div className="anim-in" style={{flex:1,minWidth:180,background:C.dark3,border:`1px solid ${C.border}`,borderRadius:14,padding:24,textAlign:"center",borderTop:`3px solid ${C.red}`}}>
       <div style={{fontSize:32,marginBottom:10}}>📊</div>
       <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:C.text,letterSpacing:2,marginBottom:4}}>MODO ADMIN</div>
       <div style={{fontSize:12,color:C.gray,marginBottom:12}}>Gestión y estadísticas</div>
       <Input type="password" inputMode="numeric" placeholder="PIN de acceso" value={pinAdmin} onChange={e=>{setPinAdmin(e.target.value);setPinErrorAdmin(false);}} onKeyDown={e=>e.key==="Enter"&&(pinAdmin===ADMIN_PIN?(setModo("admin"),setPinAdmin(""),setPinErrorAdmin(false)):setPinErrorAdmin(true))} style={{marginBottom:8,textAlign:"center"}}/>
       {pinErrorAdmin&&<div style={{fontSize:11,color:C.red,marginBottom:8,fontWeight:600}}>PIN incorrecto</div>}
       <Btn full onClick={()=>{pinAdmin===ADMIN_PIN?(setModo("admin"),setPinAdmin(""),setPinErrorAdmin(false)):setPinErrorAdmin(true);}}>INGRESAR</Btn>
     </div>
   </div>
   <div style={{fontSize:10,color:C.gray2,letterSpacing:2,textTransform:"uppercase"}}>GP3 Sports LATAM · Pirelli Official Partner</div>
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
         <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
           <Badge color={isAdmin?C.red:C.green}>{isAdmin?"ADMIN":"VENDEDOR"}</Badge>
           <span style={{fontSize:11,color:C.gray2,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>{HOY}</span>
         </div>
       </div>
       <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
         {["USD","ARS"].map(m=>totalesAbiertas[m]?(<div key={m} style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:m==="USD"?C.green:C.yellow,letterSpacing:-0.5}}>{fmt(totalesAbiertas[m],m)}</div><div style={{fontSize:9,color:C.gray,letterSpacing:1}}>{m}</div></div>):null)}
         <div style={{textAlign:"center",background:C.dark3,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:C.text}}>{ventasAbiertas.length}</div><div style={{fontSize:9,color:C.gray,letterSpacing:1,textTransform:"uppercase"}}>Ventas</div></div>
         <button onClick={()=>{setModo(null);setPinVendedor("");setPinAdmin("");setPinErrorVendedor(false);setPinErrorAdmin(false);}} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,padding:"8px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>SALIR</button>
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
                 <span style={{fontSize:10,color:C.gray,letterSpacing:1}}>{eventoForzado?"(forzado)":"(automático por fecha)"}</span>
               </div>
               {isAdmin&&(
                 <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:8}}>
                   <Label>Forzar evento:</Label>
                   <select value={eventoForzado} onChange={e=>forzarEvento(e.target.value)} style={{background:C.dark4,border:`1px solid ${C.border2}`,color:C.text,borderRadius:8,padding:"7px 10px",fontSize:13,outline:"none",fontFamily:"'Barlow',sans-serif"}}>
                     <option value="">Automático (por fecha)</option>
                     {CIRCUITOS_BASE.map(c=>(<option key={c.id} value={c.id}>{c.num} {c.nombre}</option>))}
                   </select>
                   {eventoForzado&&<Btn small outline onClick={()=>forzarEvento("")}>🔄 Volver a automático</Btn>}
                 </div>
               )}
             </div>
             <div style={{padding:12,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
               {circuitos.map(c=>(<button key={c.id} onClick={()=>setForm(f=>({...f,circ_id:c.id,fecha:c.inicio}))} style={{padding:"10px 12px",borderRadius:8,cursor:"pointer",textAlign:"left",border:`1px solid ${form.circ_id===c.id?C.red:(c.id===eventoActivo?C.green:C.border)}`,background:form.circ_id===c.id?"rgba(232,0,29,.1)":C.dark4,transition:"all .2s"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:form.circ_id===c.id?C.red:C.gray,fontWeight:700,letterSpacing:1}}>{c.num}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:C.text,marginTop:2,lineHeight:1.2}}>{c.nombre}</div><div style={{fontSize:10,color:C.gray,marginTop:4}}>{c.inicio}</div>{c.id===eventoActivo?<div style={{fontSize:9,color:C.green,fontWeight:700,marginTop:2,letterSpacing:1}}>● ACTIVO</div>:(HOY>=c.inicio&&HOY<=c.fin&&<div style={{fontSize:9,color:C.green,fontWeight:700,marginTop:2,letterSpacing:1}}>● EN CURSO</div>)}</button>))}
             </div>
           </Card>
           <Card><CardHeader>Piloto</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
               <div style={{position:"relative"}}>
                 <Input type="text" placeholder="Buscar por nombre o número..." value={pilotoQ} onChange={e=>{setPilotoQ(e.target.value);setShowSug(true);setForm(f=>({...f,piloto:e.target.value,num_piloto:""}));}} onFocus={()=>setShowSug(true)}/>
                 {showSug&&sugerencias.length>0&&(<div style={{position:"absolute",top:"100%",left:0,right:0,background:C.dark3,border:`1px solid ${C.red}`,borderRadius:"0 0 8px 8px",zIndex:100,maxHeight:220,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,.6)"}}>{sugerencias.map((p,i)=>(<div key={i} onMouseDown={()=>selPiloto(p)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,fontSize:14}}><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,minWidth:40}}>#{p.num}</span><span style={{fontWeight:600,flex:1}}>{p.nombre}</span><Badge small>{p.cat}</Badge></div>))}</div>)}
               </div>
               {form.piloto&&(<div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",alignItems:"center",gap:10,background:C.dark4,border:`1px solid ${C.red}`,borderRadius:8,padding:"10px 14px",flexWrap:"wrap"}}><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18}}>#{form.num_piloto||"—"}</span><span style={{fontWeight:700,fontSize:15}}>{form.piloto}</span><Badge>{form.categoria}</Badge><button onClick={()=>{setForm(f=>({...f,piloto:"",num_piloto:""}));setPilotoQ("");}} style={{marginLeft:"auto",background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:20,lineHeight:1}}>×</button></div></div>)}
               <details><summary style={{fontSize:12,color:C.red,cursor:"pointer",letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>+ AGREGAR PILOTO NUEVO</summary>
                 <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8,marginTop:10}}><Input id="vnnum" placeholder="N°"/><Input id="vnnombre" placeholder="Nombre completo"/></div>
                 <Select id="vncat" style={{marginTop:8}}>{todasLasCats.map(c=><option key={c}>{c}</option>)}</Select>
                 <Btn onClick={()=>{const num=document.getElementById('vnnum').value.trim();const nombre=document.getElementById('vnnombre').value.trim();const cat=document.getElementById('vncat').value;if(!num||!nombre){boom("Completa número y nombre",true);return;}setPilotos([...pilotos,{num,nombre,cat}]);selPiloto({num,nombre,cat});document.getElementById('vnnum').value='';document.getElementById('vnnombre').value='';boom("Piloto agregado: "+nombre);}} small style={{marginTop:8}}>+ Agregar y seleccionar</Btn>
               </details>
               <Field label="Categoría"><Select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>{todasLasCats.map(c=><option key={c}>{c}</option>)}</Select></Field>
             </div>
           </Card>
           <Card><CardHeader>Moneda</CardHeader>
             <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
               {[["USD","💵","Dólares",C.green],["ARS","🇦🇷","Pesos ARS",C.yellow]].map(([m,ico,lbl,col])=>(<button key={m} onClick={()=>setForm(f=>({...f,moneda:m,metodo:m==="USD"?"efectivo_usd":"efectivo_ars"}))} style={{padding:"14px 10px",borderRadius:10,cursor:"pointer",textAlign:"center",border:`2px solid ${form.moneda===m?col:C.border}`,background:form.moneda===m?col+"22":C.dark4,transition:"all .2s"}}><div style={{fontSize:24,marginBottom:4}}>{ico}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:form.moneda===m?C.text:C.gray}}>{m}</div><div style={{fontSize:10,color:form.moneda===m?col:C.gray2,letterSpacing:1}}>{lbl}</div>{form.moneda===m&&<div style={{fontSize:9,color:col,fontWeight:700,letterSpacing:1,marginTop:3}}>✓ ACTIVA</div>}</button>))}
             </div>
           </Card>
           <Card><CardHeader>Neumáticos — Stock Flotante</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
               {todosLosProductos.map(p=>{
                 const precio=getPrecio(p,form.moneda,precios);
                 const enCarrito=carrito.find(i=>i.prod_id===p.id)?.cantidad??0;
                 const flotante=stock[p.id]?.flotante??0;
                 const sinStock=flotante<=0;
                 return(<div key={p.id} style={{background:C.dark4,border:`1px solid ${enCarrito>0?C.green:sinStock?"rgba(200,0,0,.3)":C.border}`,borderRadius:10,padding:"12px 14px",opacity:sinStock?.55:1}}>
                   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
                     <div style={{display:"flex",alignItems:"center",gap:8}}><Badge color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.text,fontSize:15}}>{p.label}</span>{enCarrito>0&&<span style={{fontSize:11,color:C.green,fontWeight:700}}>✓{enCarrito}</span>}</div>
                     <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:17}}>{fmt(precio,form.moneda)}</span>
                   </div>
                   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                     <div style={{display:"flex",gap:12,fontSize:12}}><span style={{color:sinStock?"#ff4444":C.green,fontWeight:700}}>🟢 {flotante}</span><span style={{color:C.gray}}>📦 {stock[p.id]?.bodega??0}</span>{(stock[p.id]?.transito??0)>0&&<span style={{color:C.orange}}>🚚 {stock[p.id]?.transito}</span>}</div>
                     {!sinStock&&(<div style={{display:"flex",alignItems:"center",gap:6}}><button onClick={()=>setCantSel(c=>({...c,[p.id]:Math.max(0,(c[p.id]??0)-1)}))} style={{background:C.dark3,border:`1px solid ${C.border2}`,color:C.text,borderRadius:6,width:32,height:32,cursor:"pointer",fontSize:18,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button><span style={{minWidth:28,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,color:C.text}}>{cantSel[p.id]??0}</span><button onClick={()=>setCantSel(c=>({...c,[p.id]:(c[p.id]??0)+1}))} style={{background:C.dark3,border:`1px solid ${C.border2}`,color:C.text,borderRadius:6,width:32,height:32,cursor:"pointer",fontSize:18,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button><Btn small onClick={()=>agregarProducto(p.id)}>+ Agregar</Btn></div>)}
                     {sinStock&&<span style={{fontSize:11,color:"#ff4444",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>SIN STOCK</span>}
                   </div>
                 </div>);
               })}
             </div>
           </Card>
           <Card><CardHeader>Método de Pago</CardHeader>
             <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
               {(form.moneda==="USD"?[["efectivo_usd","💵 Efectivo USD"],["transferencia","🏦 Transferencia"]]:[["efectivo_ars","🇦🇷 Efectivo ARS"],["transferencia","🏦 Transferencia"],["debito","💳 Débito/Crédito"]]).map(([id,lbl])=>(<button key={id} onClick={()=>setForm(f=>({...f,metodo:id}))} style={{padding:"12px 10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${form.metodo===id?C.red:C.border}`,background:form.metodo===id?"rgba(232,0,29,.1)":C.dark4,color:form.metodo===id?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:.5,transition:"all .2s"}}>{lbl}</button>))}
             </div>
           </Card>
           <Card><CardHeader>Datos del Cliente</CardHeader>
             <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
               <Field label="Email del Cliente"><Input type="email" placeholder="cliente@correo.com" value={form.email_cliente} onChange={e=>setForm(f=>({...f,email_cliente:e.target.value}))}/></Field>
               <Label>Tipo de Facturación</Label>
               <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                 <button onClick={()=>setForm(f=>({...f,tipo_factura:"CF",cuit:"",empresa:""}))} style={{padding:"12px 10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${form.tipo_factura==="CF"?C.green:C.border}`,background:form.tipo_factura==="CF"?"rgba(0,212,170,.1)":C.dark4,color:form.tipo_factura==="CF"?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif",transition:"all .2s"}}>👤 Consumidor Final</button>
                 <button onClick={()=>setForm(f=>({...f,tipo_factura:"FAC"}))} style={{padding:"12px 10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${form.tipo_factura==="FAC"?C.red:C.border}`,background:form.tipo_factura==="FAC"?"rgba(232,0,29,.1)":C.dark4,color:form.tipo_factura==="FAC"?C.text:C.gray,fontFamily:"'Barlow Condensed',sans-serif",transition:"all .2s"}}>🏢 Factura Empresa</button>
               </div>
               {form.tipo_factura==="FAC"&&(<div style={{background:"rgba(232,0,29,.06)",border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}><Field label="CUIT"><Input placeholder="20-12345678-9" value={form.cuit} onChange={e=>setForm(f=>({...f,cuit:e.target.value}))}/></Field><Field label="Razón Social"><Input placeholder="Nombre empresa" value={form.empresa} onChange={e=>setForm(f=>({...f,empresa:e.target.value}))}/></Field></div>)}
             </div>
           </Card>
           {carrito.length>0&&(<Card style={{border:`2px solid ${C.red}`}}><CardHeader>Carrito — {carritoUnits} neumático{carritoUnits!==1?"s":""}</CardHeader>
             <div style={{padding:12}}>
               {carritoConPrecios.map((item,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><div><span style={{fontWeight:700,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15}}>{item.prod?.label}</span><span style={{marginLeft:8,fontSize:12,color:C.gray}}>×{item.cantidad}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:16}}>{fmt(item.total,form.moneda)}</span><button onClick={()=>setCarrito(prev=>prev.filter((_,j)=>j!==i))} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:14}}>×</button></div></div>))}
               <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:8,borderTop:`2px solid ${C.red}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.text,fontSize:16,letterSpacing:1}}>TOTAL</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:30,letterSpacing:-1}}>{fmt(carritoTotal,form.moneda)}</span></div>
             </div>
           </Card>)}
           <Btn full disabled={carrito.length===0} onClick={registrar} style={{padding:18,fontSize:17,letterSpacing:2}}>{carrito.length>0?`CONFIRMAR VENTA — ${carritoUnits} NEUMÁTICO${carritoUnits!==1?"S":""} — ${fmt(carritoTotal,form.moneda)}`:"AGREGA NEUMÁTICOS AL CARRITO"}</Btn>
         </div>
         <div><Card><CardHeader>Compras del Día — {ventasAbiertas.length}</CardHeader>
           <div style={{padding:12,maxHeight:700,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
             {ventasAbiertas.length===0?(<div style={{textAlign:"center",padding:32,color:C.gray,fontSize:13}}>Sin ventas registradas</div>):ventasAbiertas.map(v=>{
               const circ=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);
               return(<div key={v.id} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${C.red}`}}>
                 <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                   <div><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:16,marginRight:8}}>#{v.num_piloto||"—"}</span><span style={{fontWeight:700,fontSize:15}}>{v.piloto}</span><div style={{fontSize:11,color:C.gray,marginTop:2}}>{v.email_cliente}</div><div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}><Badge small>{v.categoria}</Badge><Badge small color={C.gray}>{circ?.nombre}</Badge><Badge small color={v.tipo_factura==="FAC"?C.red:C.green}>{v.tipo_factura==="FAC"?"Factura":"CF"}</Badge></div></div>
                   <div style={{textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.red,fontSize:18}}>{fmt(v.total_monto,v.moneda)}</div><div style={{fontSize:11,color:C.gray}}>{v.total_unidades} u.</div></div>
                 </div>
                 <Divider/>
                 {v.items.map((item,i)=>{const p=todosLosProductos.find(x=>x.id===item.prod_id);return(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0"}}><div style={{display:"flex",gap:6,alignItems:"center"}}><Badge small color={p?.tipo==="Trasero"?C.red:C.gray}>{p?.tipo}</Badge><span>{p?.label} ×{item.cantidad}</span></div><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{fmt(item.total,v.moneda)}</span></div>);})}
                 <div style={{display:"flex",gap:6,marginTop:10}}>
                   <button onClick={()=>{const pin=window.prompt("PIN de administrador:");if(pin!==ADMIN_PIN){boom("PIN incorrecto",true);return;}const stockRestaurado={...stock};v.items.forEach(it=>{stockRestaurado[it.prod_id]={...stockRestaurado[it.prod_id],flotante:(stockRestaurado[it.prod_id]?.flotante??0)+it.cantidad};});setStock(stockRestaurado);setCarrito(v.items.map(i=>({prod_id:i.prod_id,cantidad:i.cantidad})));setForm({circ_id:v.circ_id,fecha:v.fecha,piloto:v.piloto,num_piloto:v.num_piloto,categoria:v.categoria,moneda:v.moneda,metodo:v.metodo,email_cliente:v.email_cliente,tipo_factura:v.tipo_factura,cuit:v.cuit||"",empresa:v.empresa||""});setPilotoQ(v.piloto);setEditVenta(v.id);setVentas(ventas.filter(x=>x.id!==v.id));setPending(pending.filter(x=>x.id!==v.id));syncSheets("venta_delete",{id:v.id,items:v.items});marcarBorradoLocal(v.id);setTimeout(cargarDesdeSheet,2500);boom("✏️ Venta cargada para editar");window.scrollTo({top:0,behavior:"smooth"});}} style={{flex:1,padding:"8px",background:"transparent",border:`1px solid ${C.orange}`,color:C.orange,borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1}}>✏️ EDITAR</button>
                   <button onClick={()=>{const pin=window.prompt("PIN de administrador:");if(pin!==ADMIN_PIN){boom("PIN incorrecto",true);return;}if(!window.confirm("¿Eliminar esta venta?\nSe restaurará el stock flotante."))return;syncSheets("venta_delete",{id:v.id,items:v.items});marcarBorradoLocal(v.id);const nuevasVentas=ventas.filter(x=>x.id!==v.id);setVentas(nuevasVentas);setPending(pending.filter(x=>x.id!==v.id));setTimeout(cargarDesdeSheet,2500);boom("🗑 Venta eliminada — el stock se restaura solo");}} style={{flex:1,padding:"8px",background:"transparent",border:`1px solid #cc1133`,color:"#cc1133",borderRadius:6,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1}}>🗑 ELIMINAR</button>
                 </div>
               </div>);
             })}
           </div>
         </Card></div>
       </div>
     )}

     {tab==="mis_stats"&&!isAdmin&&(
       <div style={{display:"flex",flexDirection:"column",gap:16}}>
         <CierreDiaPanel ventas={ventas} closedIds={closedIds} eventoActivo={eventoActivo} cierresDia={cierresDia} vendedor="Francisca" onCerrar={cerrarDia}/>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
           {["USD","ARS"].map(m=>totalesAbiertas[m]?<StatBox key={m} label={"Total "+m} value={fmt(totalesAbiertas[m],m)} color={m==="USD"?C.green:C.yellow}/>:null)}
           <StatBox label="Ventas" value={ventasAbiertas.length}color={C.text}/>
           <StatBox label="Unidades" value={ventasAbiertas.reduce((s,v)=>s+v.total_unidades,0)} color={C.red}/>
         </div>
         <Card><CardHeader>📦 Stock Flotante</CardHeader>
           <div style={{padding:"0 12px"}}>
             {todosLosProductos.map(p=>{
               const vendidos=ventas.reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.cantidad,0),0);
               return(<div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 60px 60px",padding:"10px 0",borderBottom:`1px solid ${C.border}`,gap:4,alignItems:"center"}}>
                 <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14}}>{p.label}</div><Badge small color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge></div>
                 <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:vendidos>0?C.green:C.gray}}>{vendidos}</div>
                 <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:(stock[p.id]?.flotante??0)<=0?"#ff4444":C.green}}>{stock[p.id]?.flotante??0}</div>
                 <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,color:C.orange}}>{stock[p.id]?.transito??0}</div>
                 <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,color:C.gray}}>{stock[p.id]?.bodega??0}</div>
               </div>);
             })}
           </div>
         </Card>
       </div>
     )}

     {tab==="stock"&&isAdmin&&(
       <Card><CardHeader>Control de Stock Pirelli</CardHeader>
         <div style={{padding:12}}>
           <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",fontSize:12,color:C.gray}}>
             <span><span style={{color:C.red,fontWeight:700}}>Bodega</span> — depósito central</span><span>·</span>
             <span><span style={{color:C.orange,fontWeight:700}}>Tránsito</span> — en camino</span><span>·</span>
             <span><span style={{color:C.green,fontWeight:700}}>Flotante</span> — en pista, para vender</span>
           </div>
           {!stockDraft?(<Btn onClick={()=>setStockDraft({...stock})} outline style={{marginBottom:12}}>✏️ Editar Stock</Btn>):(<div style={{display:"flex",gap:8,marginBottom:12}}><Btn color={C.green} onClick={()=>{setStock(stockDraft);syncSheets("stock",{stock:stockDraft,nombres:Object.fromEntries(PRODUCTOS.map(p=>[p.id,{label:p.label,tipo:p.tipo}]))});setStockDraft(null);boom("✓ Stock guardado");}}>💾 Guardar</Btn><Btn outline onClick={()=>setStockDraft(null)}>Cancelar</Btn></div>)}
           <div style={{overflowX:"auto"}}>
             <div style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 90px 60px 1fr",padding:"8px 10px",fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:1,borderBottom:`1px solid ${C.border}`,gap:8,minWidth:520}}>
               <span>Neumático</span><span style={{textAlign:"center",color:C.orange}}>Tránsito</span><span style={{textAlign:"center"}}>Bodega</span><span style={{textAlign:"center",color:C.green}}>Flotante</span><span style={{textAlign:"center"}}>Total</span><span style={{textAlign:"center"}}>Mover</span>
             </div>
             {todosLosProductos.map(p=>{
               const s=stockDraft?stockDraft[p.id]:stock[p.id];
               const tot=(s?.bodega??0)+(s?.transito??0)+(s?.flotante??0);
               const upd=(field,val)=>{if(!stockDraft)return;setStockDraft(prev=>({...prev,[p.id]:{...prev[p.id],[field]:Math.max(0,val)}}));};
               return(<div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 90px 60px 1fr",padding:"14px 10px",borderBottom:`1px solid ${C.border}`,gap:8,alignItems:"center",minWidth:520}}>
                 <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{p.label}</div><div style={{fontSize:11,color:C.gray}}>USD {precios[p.id]?.USD??p.precios?.USD??0} / ARS {(precios[p.id]?.ARS??p.precios?.ARS??0).toLocaleString()}</div></div>
                 {[["transito",C.orange],["bodega",C.red],["flotante",C.green]].map(([field,col])=>(<div key={field} style={{textAlign:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:col,lineHeight:1}}>{s?.[field]??0}</div>{stockDraft&&(<div style={{display:"flex",gap:3,justifyContent:"center",marginTop:4}}><button onClick={()=>upd(field,(s?.[field]??0)+1)} style={{background:"transparent",border:`1px solid ${col}`,color:col,borderRadius:4,padding:"2px 7px",fontSize:12,cursor:"pointer",fontWeight:700}}>+</button><button onClick={()=>upd(field,(s?.[field]??0)-1)} style={{background:"transparent",border:`1px solid ${C.border2}`,color:C.gray,borderRadius:4,padding:"2px 7px",fontSize:12,cursor:"pointer"}}>−</button></div>)}</div>))}
                 <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:tot<=5?"#ff4444":C.text}}>{tot}</div>
                 <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>
                   {[["B→F","bodega","flotante",C.green],["F→B","flotante","bodega",C.gray],["B→T","bodega","transito",C.orange],["T→F","transito","flotante",C.green]].map(([lbl,from,to,col])=>(<button key={lbl} onClick={()=>{if(!stockDraft)return;if((s?.[from]??0)<1)return;setStockDraft(prev=>({...prev,[p.id]:{...prev[p.id],[from]:Math.max(0,(prev[p.id]?.[from]??0)-1),[to]:(prev[p.id]?.[to]??0)+1}}));}} style={{background:"transparent",border:`1px solid ${col}44`,color:col,borderRadius:4,padding:"3px 7px",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif"}}>{lbl}</button>))}
                 </div>
               </div>);
             })}
           </div>
         </div>
       </Card>
     )}

     {tab==="estadisticas"&&isAdmin&&(
       <div style={{display:"flex",flexDirection:"column",gap:16}}>
         <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
           <Input placeholder="Buscar piloto, número, categoría..." value={busqStats} onChange={e=>setBusqStats(e.target.value)} style={{maxWidth:280}}/>
           <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["todos","Todos"],...CIRCUITOS_BASE.map(c=>[c.id,c.num+" "+c.nombre])].map(([id,lbl])=>(<Pill key={id} active={filtro===id} onClick={()=>setFiltro(id)}>{lbl}</Pill>))}</div>
         </div>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
           {["USD","ARS"].map(m=>totales[m]?<StatBox key={m} label={"Total "+m} value={fmt(totales[m],m)} color={m==="USD"?C.green:C.yellow}/>:null)}
           <StatBox label="Clientes" value={vF.length}color={C.text}/>
           <StatBox label="Unidades" value={vF.reduce((s,v)=>s+v.total_unidades,0)} color={C.red}/>
         </div>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
           <Card><CardHeader>Por Neumático</CardHeader><div style={{padding:12}}>
             {todosLosProductos.map(p=>{
               const uni=vF.reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.cantidad,0),0);
               const usd=vF.filter(v=>v.moneda==="USD").reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.total,0),0);
               const ars=vF.filter(v=>v.moneda==="ARS").reduce((s,v)=>s+v.items.filter(i=>i.prod_id===p.id).reduce((ss,i)=>ss+i.total,0),0);
               return(<div key={p.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{display:"flex",gap:6,alignItems:"center"}}><Badge small color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{p.label}</span></div><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:C.red}}>{uni} u.</span></div>{usd>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.gray}}>USD</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.green}}>{fmt(usd,"USD")}</span></div>}{ars>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.gray}}>ARS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:C.yellow}}>{fmt(ars,"ARS")}</span></div>}<div style={{display:"flex",gap:8,marginTop:6,fontSize:11}}><span style={{color:C.green}}>🟢 {stock[p.id]?.flotante??0}</span><span style={{color:C.orange}}>🚚 {stock[p.id]?.transito??0}</span><span style={{color:C.gray}}>📦 {stock[p.id]?.bodega??0}</span></div></div>);
             })}
           </div></Card>
           <Card><CardHeader>Top Compradores</CardHeader><div style={{padding:12}}>
             {(()=>{const pils={};vF.forEach(v=>{const k=v.piloto+"_"+v.num_piloto;if(!pils[k])pils[k]={piloto:v.piloto,num:v.num_piloto,cat:v.categoria,usd:0,ars:0,uni:0};if(v.moneda==="USD")pils[k].usd+=v.total_monto;else pils[k].ars+=v.total_monto;pils[k].uni+=v.total_unidades;});const sorted=Object.values(pils).sort((a,b)=>b.uni-a.uni);return sorted.length===0?<div style={{textAlign:"center",padding:24,color:C.gray}}>Sin ventas</div>:sorted.slice(0,10).map((p,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,marginRight:8}}>#{p.num}</span><span style={{fontWeight:700}}>{p.piloto}</span><div style={{fontSize:11,color:C.gray}}>{p.cat} · {p.uni} u.</div></div><div style={{textAlign:"right"}}>{p.usd>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green}}>{fmt(p.usd,"USD")}</div>}{p.ars>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow}}>{fmt(p.ars,"ARS")}</div>}</div></div>));})()}
           </div></Card>
         </div>
         <Card><CardHeader>Detalle — {vF.length} registros</CardHeader>
           <div style={{padding:12,overflowX:"auto"}}>
             <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:800}}>
               <thead><tr>{["Fecha","N°","Piloto","Cat.","Circuito","Neumáticos","Unid.","Moneda","Total","Pago","Email","Factura"].map(h=>(<th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:9,color:C.gray,letterSpacing:2,textTransform:"uppercase",borderBottom:`2px solid ${C.red}`,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
               <tbody>{vF.length===0?<tr><td colSpan={12} style={{textAlign:"center",padding:24,color:C.gray}}>Sin ventas</td></tr>:vF.map(v=>{const circ=CIRCUITOS_BASE.find(x=>x.id===v.circ_id);const itemsStr=v.items.map(i=>{const p=todosLosProductos.find(x=>x.id===i.prod_id);return p?.label+"×"+i.cantidad;}).join(", ");return(<tr key={v.id} style={{borderBottom:`1px solid ${C.border}`}}><td style={{padding:"8px 10px",color:C.gray}}>{v.fecha}</td><td style={{padding:"8px 10px",fontFamily:"'Barlow Condensed',sans-serif",color:C.red,fontWeight:900}}>#{v.num_piloto||"—"}</td><td style={{padding:"8px 10px",fontWeight:700}}>{v.piloto}</td><td style={{padding:"8px 10px"}}><Badge small>{v.categoria}</Badge></td><td style={{padding:"8px 10px",color:C.gray,fontSize:11}}>{circ?.nombre}</td><td style={{padding:"8px 10px",fontSize:11,color:C.gray}}>{itemsStr}</td><td style={{padding:"8px 10px",textAlign:"center"}}>{v.total_unidades}</td><td style={{padding:"8px 10px"}}><Badge small color={v.moneda==="USD"?C.green:C.yellow}>{v.moneda}</Badge></td><td style={{padding:"8px 10px",fontFamily:"'Barlow Condensed',sans-serif",color:C.red,fontWeight:900}}>{fmt(v.total_monto,v.moneda)}</td><td style={{padding:"8px 10px",fontSize:11,color:C.orange}}>{v.metodo.replace(/_/g," ").toUpperCase()}</td><td style={{padding:"8px 10px",fontSize:11,color:C.gray}}>{v.email_cliente}</td><td style={{padding:"8px 10px"}}><Badge small color={v.tipo_factura==="FAC"?C.red:C.green}>{v.tipo_factura==="FAC"?"Factura":"CF"}</Badge></td></tr>);})}</tbody>
             </table>
           </div>
         </Card>
       </div>
     )}

     {tab==="cierre"&&isAdmin&&(
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:16}}>
         <div style={{gridColumn:"1/-1"}}><CierreDiaPanel ventas={ventas} closedIds={closedIds} eventoActivo={eventoActivo} cierresDia={cierresDia} vendedor="Administración" onCerrar={cerrarDia}/></div>
         <Card><CardHeader>🗂 Resumen de Cierre — {HOY}</CardHeader>
           <div style={{padding:12}}>
             {(()=>{const metLabels={"efectivo_usd":"💵 Efectivo USD","transferencia":"🏦 Transferencia","efectivo_ars":"🇦🇷 Efectivo ARS","transferencia_ars":"🏦 Transferencia ARS","debito":"💳 Débito/Crédito"};const mets={};ventasAbiertas.forEach(v=>{const k=v.metodo;if(!mets[k])mets[k]={label:metLabels[k]||k,usd:0,ars:0,cnt:0,uni:0};if(v.moneda==="USD")mets[k].usd+=v.total_monto;else mets[k].ars+=v.total_monto;mets[k].cnt++;mets[k].uni+=v.total_unidades||0;});return Object.entries(mets).length===0?(<div style={{textAlign:"center",padding:16,color:C.gray}}>Sin ventas</div>):Object.entries(mets).map(([k,d])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{d.label}</div><div style={{fontSize:11,color:C.gray}}>{d.cnt} venta{d.cnt!==1?"s":""} · {d.uni} u.</div></div><div style={{textAlign:"right"}}>{d.usd>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:18}}>{fmt(d.usd,"USD")}</div>}{d.ars>0&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:18}}>{fmt(d.ars,"ARS")}</div>}</div></div>));})()}
             <div style={{marginTop:12,paddingTop:10,borderTop:`2px solid ${C.red}`,marginBottom:16}}>
               {totalesAbiertas["USD"]&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.gray}}>USD</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:26}}>{fmt(totalesAbiertas["USD"],"USD")}</span></div>}
               {totalesAbiertas["ARS"]&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.gray}}>ARS</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:26}}>{fmt(totalesAbiertas["ARS"],"ARS")}</span></div>}
               {[["Clientes",ventasAbiertas.length,C.text],["Neumáticos",ventasAbiertas.reduce((s,v)=>s+(v.total_unidades||0),0),C.text],["CF",ventasAbiertas.filter(v=>v.tipo_factura==="CF").length,C.green],["Facturas",ventasAbiertas.filter(v=>v.tipo_factura==="FAC").length,C.red]].map(([lbl,val,col])=>(<div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:`1px solid ${C.border}`}}><span style={{color:C.gray,fontSize:13}}>{lbl}</span><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:col,fontSize:16}}>{val}</span></div>))}
             </div>
             <div style={{display:"flex",flexDirection:"column",gap:8}}>
               <Btn full onClick={()=>exportCSV(ventas,stock,todosLosProductos)}>⬇ Exportar Cierre Excel</Btn>
               <Btn full color={C.red} onClick={cerrarEvento}>🏁 Cerrar Evento y Archivar</Btn>
             </div>
             {cierres.length>0&&(<div style={{marginTop:20}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.text,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>Historial — {cierres.length} fechas archivadas</div>{cierres.map((c,i)=>(<div key={i} style={{background:C.dark4,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8,borderLeft:`3px solid ${C.red}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:17,color:C.text}}>{c.circuito}</div><div style={{fontSize:11,color:C.gray}}>{c.fecha} · {c.numVentas} clientes · {c.unidades} u.</div></div><div style={{textAlign:"right"}}>{c.totales["USD"]&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.green,fontSize:16}}>{fmt(c.totales["USD"],"USD")}</div>}{c.totales["ARS"]&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,color:C.yellow,fontSize:16}}>{fmt(c.totales["ARS"],"ARS")}</div>}</div></div><div style={{display:"flex",gap:6}}>{c.ventas&&<Btn small onClick={()=>exportCSV(c.ventas,stock,todosLosProductos)} color={C.green}>⬇ Excel</Btn>}<Btn small outline color={C.red} onClick={()=>setCierres(cierres.filter((_,j)=>j!==i))}>× Eliminar</Btn></div></div>))}</div>)}
           </div>
         </Card>
         <Card><CardHeader>Stock al Cierre</CardHeader>
           <div style={{padding:12}}>
             {todosLosProductos.map(p=>{const s=stock[p.id];return(<div key={p.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><Badge small color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{p.label}</span></div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.red}}>Bodega: <b>{s?.bodega??0}</b></span><span style={{fontSize:12,color:C.orange}}>Tránsito: <b>{s?.transito??0}</b></span><span style={{fontSize:12,color:C.green}}>Flotante: <b>{s?.flotante??0}</b></span></div></div>);})}
           </div>
         </Card>
       </div>
     )}

     {tab==="gestion"&&isAdmin&&(
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
         <Card><CardHeader>Agregar Piloto</CardHeader>
           <div style={{padding:12}}>
             <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8,marginBottom:8}}><Input id="gnum" placeholder="N°"/><Input id="gnombre" placeholder="Nombre completo"/></div>
             <Select id="gcat" style={{marginBottom:8}}>{todasLasCats.map(c=><option key={c}>{c}</option>)}</Select>
             <Btn full onClick={()=>{const num=document.getElementById('gnum').value.trim();const nombre=document.getElementById('gnombre').value.trim();const cat=document.getElementById('gcat').value;if(!num||!nombre){boom("Completa número y nombre",true);return;}setPilotos([...pilotos,{num,nombre,cat}]);document.getElementById('gnum').value='';document.getElementById('gnombre').value='';boom("Piloto agregado: "+nombre);}} style={{marginBottom:12}}>+ Agregar Piloto</Btn>
             <Input placeholder="Buscar..." value={busqPiloto} onChange={e=>setBusqPiloto(e.target.value)} style={{marginBottom:10}}/>
             <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
               {todasLasCats.map(cat=>{const ps=todosLosPilotos.filter(p=>p.cat===cat&&(!busqPiloto||p.nombre.toLowerCase().includes(busqPiloto.toLowerCase())||p.num.includes(busqPiloto)));if(!ps.length)return null;return(<div key={cat}><div style={{fontSize:10,color:C.red,letterSpacing:3,fontWeight:700,textTransform:"uppercase",margin:"8px 0 4px",fontFamily:"'Barlow Condensed',sans-serif"}}>{cat}</div>{ps.map((p,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.dark4,borderRadius:6,marginBottom:3}}><span style={{color:C.red,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,minWidth:36}}>#{p.num}</span><span style={{fontWeight:600,flex:1,fontSize:14}}>{p.nombre}</span>{pilotos.find(x=>x.num===p.num&&x.nombre===p.nombre)&&(<button onClick={()=>setPilotos(pilotos.filter(x=>!(x.num===p.num&&x.nombre===p.nombre)))} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18}}>×</button>)}</div>))}</div>);})}
             </div>
           </div>
         </Card>
         <Card><CardHeader>Modelos de Neumáticos</CardHeader>
           <div style={{padding:12}}>
             <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:3,color:C.gray,marginBottom:10,textTransform:"uppercase"}}>Renombrar modelos</div>
             {todosLosProductos.map(p=>(<div key={p.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}><Input value={nombresEdit[p.id]||p.label} onChange={e=>setNombresEdit({...nombresEdit,[p.id]:e.target.value})} style={{fontSize:13}}/>{nombresEdit[p.id]&&nombresEdit[p.id]!==p.label&&(<button onClick={()=>{const n={...nombresEdit};delete n[p.id];setNombresEdit(n);}} style={{background:"transparent",border:"none",color:C.gray,cursor:"pointer",fontSize:18,flexShrink:0}}>↩</button>)}</div>))}
             {productosExtra.map((p,i)=>(<div key={p.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}><Input value={p.label} onChange={e=>setProductosExtra(productosExtra.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={{fontSize:13}}/><button onClick={()=>setProductosExtra(productosExtra.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:"#cc1133",cursor:"pointer",fontSize:18,flexShrink:0}}>×</button></div>))}
           </div>
         </Card>
         <Card><CardHeader>Editar Precios</CardHeader>
           <div style={{padding:12}}>
             {todosLosProductos.map(p=>(<div key={p.id} style={{marginBottom:14,padding:"12px",background:C.dark4,borderRadius:10,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Badge small color={p.tipo==="Trasero"?C.red:C.gray}>{p.tipo}</Badge><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:15}}>{p.label}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><Label>USD</Label><Input type="number" value={precios[p.id]?.USD??p.precios?.USD??0} onChange={e=>setPrecios({...precios,[p.id]:{...precios[p.id],USD:+e.target.value}})}/></div><div><Label>ARS</Label><Input type="number" value={precios[p.id]?.ARS??p.precios?.ARS??0} onChange={e=>setPrecios({...precios,[p.id]:{...precios[p.id],ARS:+e.target.value}})}/></div></div></div>))}
           </div>
         </Card>
       </div>
     )}

     {tab==="admin"&&isAdmin&&(<AdminPanel ventas={ventas} cierres={cierres}/>)}
     {tab==="inscripciones"&&isAdmin&&(<InscripcionesPanel/>)}
   </main>
   <footer style={{textAlign:"center",padding:"12px 16px",fontSize:10,color:C.gray2,borderTop:`1px solid ${C.border}`,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif",flexShrink:0}}>
     GP3 Sports LATAM · CAV 2026 · Pirelli Official Partner · {EMAIL_DESTINO}
   </footer>
 </div></>
);
}
