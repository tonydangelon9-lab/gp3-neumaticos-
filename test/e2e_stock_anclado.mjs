// E2E del fix "stock anclado al servidor" (4-sep-2026).
// Levanta dist/ en un servidor estático, intercepta https://script.google.com/** con un backend
// simulado (última escritura gana, igual que el Apps Script) y ejecuta el flujo REAL de la UI
// (login → piloto → email → producto → Confirmar Venta) desde varios "teléfonos" (contexts distintos).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIST = path.resolve(process.env.DIST || "dist");
const PORT = Number(process.env.PORT || 4173);
const SHEETS_RE = /^https:\/\/script\.google\.com\//;
const HEAD_STOCK = ["Producto ID","Nombre","Tipo","Bodega Pirelli","En Tránsito","Stock Flotante","Total","Ultima actualización"];
const HEAD_VENTAS = ["id","fecha","circ","num","piloto","cat","email","tf","cuit","emp","met","mon","items","total"];
const PIDS = ["m110sc1","m140sc1","m120sc1","m180sc2","m200sc1","m200sc2","m200sc3","m120rain","m200rain"];

// ── Backend simulado ───────────────────────────────────────────────────────────────────────────
function makeBackend(stock0) {
  const st = { stock: JSON.parse(JSON.stringify(stock0)), ventas: [], borrados: [], log: [], dropStockPosts: 0, delayMs: 0, getDelayMs: 0 };
  const payload = () => ({ ok: true,
    ventas: [HEAD_VENTAS, ...st.ventas],
    stock: [HEAD_STOCK, ...PIDS.map(id => { const s = st.stock[id] || {bodega:0,transito:0,flotante:0}; return [id, id, "", s.bodega, s.transito, s.flotante, s.bodega+s.transito+s.flotante, new Date().toISOString()]; })],
    cierres: [], config: {}, borrados: st.borrados, cierresDia: [["ID","Fecha","Evento","Vendedor","Resumen_JSON","Timestamp"]] });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  st.handle = async (route, request) => {
    const url = request.url(); const method = request.method();
    if (!/[?&]key=[A-Za-z0-9_-]{20,}/.test(url)) { return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok:false, error:"unauthorized" }) }); }
    if (method === "GET") { if (st.getDelayMs) await sleep(st.getDelayMs); return route.fulfill({ status: 200, contentType: "application/json", headers: {"Access-Control-Allow-Origin":"*"}, body: JSON.stringify(payload()) }); }
    let body = {}; try { body = JSON.parse(request.postData() || "{}"); } catch (e) {}
    if (st.delayMs) await sleep(st.delayMs);
    const t = body.type;
    if (t === "stock") {
      if (st.dropStockPosts > 0) { st.dropStockPosts--; st.log.push({ t: Date.now(), type: "stock(DROPPED)", stock: body.stock }); }
      else { Object.keys(body.stock || {}).forEach(k => { const s = body.stock[k]; st.stock[k] = { bodega: Number(s.bodega)||0, transito: Number(s.transito)||0, flotante: Number(s.flotante)||0 }; }); st.log.push({ t: Date.now(), type: "stock", stock: JSON.parse(JSON.stringify(st.stock)) }); }
    } else if (t === "venta") {
      const v = body.venta || {}; const items = (v.items||[]).map(i => i.prod_id + "x" + i.cantidad).join(" | ");
      if (!st.ventas.some(r => r[0] === v.id)) st.ventas.push([v.id, v.fecha||"", v.circ_id||"", v.num_piloto||"", v.piloto||"", v.categoria||"", v.email_cliente||"", "CF", "", "", v.metodo||"", v.moneda||"ARS", items, v.total_monto||0]);
      st.log.push({ t: Date.now(), type: "venta", id: v.id, items });
    } else if (t === "venta_delete") { st.borrados.push(body.id); st.ventas = st.ventas.filter(r => r[0] !== body.id); st.log.push({ t: Date.now(), type: "venta_delete", id: body.id }); }
    else { st.log.push({ t: Date.now(), type: t }); }
    return route.fulfill({ status: 200, contentType: "application/json", headers: {"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({ ok: true }) });
  };
  return st;
}

// ── Servidor estático de dist/ ─────────────────────────────────────────────────────────────────
function serveDist() {
  const mime = { ".html":"text/html", ".js":"application/javascript", ".css":"text/css", ".png":"image/png", ".json":"application/json", ".svg":"image/svg+xml" };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/" || !path.extname(p)) p = "/index.html";
    const f = path.join(DIST, p);
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end("nf"); }
    res.writeHead(200, { "Content-Type": mime[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(PORT, () => r(srv)));
}

// ── Acciones de UI ─────────────────────────────────────────────────────────────────────────────
async function abrirTelefono(browser, backend, { localStock = null, pin = "N2030" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.route(SHEETS_RE, backend.handle);
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("  [pageerror]", e.message));
  if (localStock) { await page.addInitScript(s => { if (!localStorage.getItem("__seeded")) { localStorage.setItem("gp3_stock", JSON.stringify(s)); localStorage.setItem("__seeded","1"); } }, localStock); }
  await page.goto(`http://localhost:${PORT}/`);
  await page.getByRole("button", { name: "ENTRAR" }).click();
  const ph = pin === "A2030" ? "PIN de acceso" : "PIN vendedor";
  await page.getByPlaceholder(ph).fill(pin);
  await page.getByPlaceholder(ph).press("Enter").catch(()=>{});
  // botón INGRESAR de la misma tarjeta
  const card = page.locator("div", { has: page.getByPlaceholder(ph) }).last();
  await card.getByRole("button", { name: "INGRESAR" }).click().catch(()=>{});
  await page.getByText("Neumáticos — Stock Flotante").first().waitFor({ timeout: 8000 });
  return { ctx, page };
}

async function venderUI(page, { piloto, items, pendiente = false }) {
  // items: [{label:"Modelo 200 SC1", qty:3}]
  await page.getByPlaceholder("Buscar por nombre o número...").fill(piloto);
  await page.getByPlaceholder("cliente@email.com").fill("test@gp3.lat");
  for (const it of items) {
    const card = page.locator("div", { has: page.getByText(it.label, { exact: true }) }).filter({ has: page.getByRole("button", { name: "Agregar" }) }).last();
    for (let i = 0; i < it.qty; i++) await card.getByRole("button", { name: "+" }).click();
    await card.getByRole("button", { name: "Agregar" }).click();
  }
  if (pendiente) { await page.locator("select").filter({ hasText: "Pendiente de pago" }).first().selectOption("pendiente"); }
  await page.getByRole("button", { name: /Confirmar Venta/ }).click();
  await page.waitForTimeout(300);
}

async function flotanteUI(page, label) {
  const card = page.locator("div", { has: page.getByText(label, { exact: true }) }).filter({ has: page.getByRole("button", { name: "Agregar" }) }).last();
  const txt = await card.getByText(/Flotante:/).first().textContent();
  return Number((txt.match(/(\d+)/) || [])[1]);
}

// ── Aserciones ─────────────────────────────────────────────────────────────────────────────────
let fallos = 0, total = 0;
function eq(nombre, got, exp) { total++; const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) fallos++; console.log(`  ${ok ? "PASA" : "FALLA"}  ${nombre}: ${JSON.stringify(got)}${ok ? "" : "  (esperado " + JSON.stringify(exp) + ")"}`); }
const SOLO = (process.env.SOLO||"").split(",").filter(Boolean).map(Number);
const esc = n => !SOLO.length || SOLO.includes(n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = (b, t, f, pid) => { const s = b.stock[pid]; return [s.bodega, s.transito, s.flotante]; };

// ── Escenarios ─────────────────────────────────────────────────────────────────────────────────
const STOCK_SRV = { m110sc1:{bodega:0,transito:0,flotante:14}, m140sc1:{bodega:0,transito:0,flotante:12}, m120sc1:{bodega:175,transito:40,flotante:5}, m180sc2:{bodega:50,transito:0,flotante:7}, m200sc1:{bodega:40,transito:36,flotante:6}, m200sc2:{bodega:0,transito:30,flotante:0}, m200sc3:{bodega:0,transito:3,flotante:0}, m120rain:{bodega:0,transito:10,flotante:0}, m200rain:{bodega:0,transito:10,flotante:0} };
const STOCK_VIEJO = { m110sc1:{bodega:0,transito:0,flotante:14}, m140sc1:{bodega:0,transito:0,flotante:12}, m120sc1:{bodega:0,transito:0,flotante:2}, m180sc2:{bodega:0,transito:0,flotante:7}, m200sc1:{bodega:0,transito:0,flotante:2}, m200sc2:{bodega:0,transito:0,flotante:0}, m200sc3:{bodega:0,transito:0,flotante:0}, m120rain:{bodega:0,transito:0,flotante:0}, m200rain:{bodega:0,transito:0,flotante:0} };

const srvStatic = await serveDist();
const browser = await chromium.launch();
try {
  // 1) Copia local VIEJA (bodega/tránsito en 0, flotante 2/2) vende 1 m200: el servidor debe quedar
  //    con bodega/tránsito intactos, m200 flotante 6→5 y m120 intacto (5). Antes: pisaba todo con la copia vieja.
  if (esc(1)) {
  console.log("\n[1] Teléfono con copia local vieja vende 1 × m200sc1");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b, { localStock: STOCK_VIEJO });
    await sleep(1500); // primer sondeo del servidor
    await venderUI(t.page, { piloto: "Test Uno", items: [{ label: "Modelo 200 SC1", qty: 1 }] });
    await sleep(800);
    eq("m200sc1 [b,t,f]", S(b,0,0,"m200sc1"), [40,36,5]);
    eq("m120sc1 intacto", S(b,0,0,"m120sc1"), [175,40,5]);
    eq("m180sc2 intacto", S(b,0,0,"m180sc2"), [50,0,7]);
    eq("venta registrada", b.ventas.length, 1);
    await sleep(4500); // verificación a los 4 s no debe cambiar nada
    eq("tras verificación sigue 5", S(b,0,0,"m200sc1"), [40,36,5]);
    eq("un solo push de stock (sin reintento innecesario)", b.log.filter(l=>l.type==="stock").length, 1);
    eq("UI muestra flotante 5", await flotanteUI(t.page, "Modelo 200 SC1"), 5);
    await t.ctx.close(); }
  }

  // 2) Push de stock PERDIDO (no-cors se lo traga): la venta queda y el descuento debe reintentarse solo.
  if (esc(2)) {
  console.log("\n[2] Push de stock perdido → reintento automático");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500); b.dropStockPosts = 1;
    await venderUI(t.page, { piloto: "Test Dos", items: [{ label: "Modelo 120 SC1", qty: 2 }] });
    await sleep(800);
    eq("inmediatamente el servidor sigue en 5 (push perdido)", S(b,0,0,"m120sc1"), [175,40,5]);
    await sleep(27000); // freno de 6 s + dos lecturas seguidas viendo el valor previo (sondeos de 12 s)
    eq("tras dos sondeos el reintento lo dejó en 3", S(b,0,0,"m120sc1"), [175,40,3]);
    eq("m200sc1 intacto", S(b,0,0,"m200sc1"), [40,36,6]);
    await sleep(13000); // otro sondeo: no debe volver a descontar
    eq("no se duplica el descuento", S(b,0,0,"m120sc1"), [175,40,3]);
    eq("exactamente 2 pushes de stock (el perdido y el reintento)", b.log.filter(l=>l.type.startsWith("stock")).length, 2);
    await t.ctx.close(); }
  }

  // 3) Dos teléfonos: A vende 3 m200; 14 s después B (ya sincronizado) vende 2 m200 y 1 m120.
  if (esc(3)) {
  console.log("\n[3] Dos teléfonos venden en secuencia (B sincronizado)");
  { const b = makeBackend(STOCK_SRV); const A = await abrirTelefono(browser, b); const B = await abrirTelefono(browser, b, { localStock: STOCK_VIEJO });
    await sleep(1500);
    await venderUI(A.page, { piloto: "Piloto A", items: [{ label: "Modelo 200 SC1", qty: 3 }] });
    await sleep(14000); // B toma el servidor en su sondeo
    await venderUI(B.page, { piloto: "Piloto B", items: [{ label: "Modelo 200 SC1", qty: 2 }, { label: "Modelo 120 SC1", qty: 1 }] });
    await sleep(6000);
    eq("m200sc1 6−3−2 = 1", S(b,0,0,"m200sc1"), [40,36,1]);
    eq("m120sc1 5−1 = 4", S(b,0,0,"m120sc1"), [175,40,4]);
    eq("2 ventas", b.ventas.length, 2);
    await A.ctx.close(); await B.ctx.close(); }
  }

  // 4) Mismo teléfono vende dos veces seguidas (segunda antes de que el servidor confirme la primera).
  if (esc(4)) {
  console.log("\n[4] Mismo teléfono, dos ventas seguidas con servidor lento (2 s)");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500); b.delayMs = 2000;
    await venderUI(t.page, { piloto: "Rápido Uno", items: [{ label: "Modelo 200 SC1", qty: 1 }] });
    await venderUI(t.page, { piloto: "Rápido Dos", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(9000); b.delayMs = 0; await sleep(4000);
    eq("m200sc1 6−1−2 = 3", S(b,0,0,"m200sc1"), [40,36,3]);
    eq("2 ventas", b.ventas.length, 2);
    await t.ctx.close(); }
  }

  // 5) Admin edita Stock mientras un vendedor vende: la venta NO se pierde.
  if (esc(5)) {
  console.log("\n[5] Admin: Guardar stock con venta intermedia");
  { const b = makeBackend(STOCK_SRV); const adm = await abrirTelefono(browser, b, { pin: "A2030" }); const ven = await abrirTelefono(browser, b);
    await sleep(1500);
    await adm.page.getByRole("button", { name: /Stock/ }).first().click();
    await adm.page.getByText("Gestión de Stock").waitFor();
    // admin pasa 10 de tránsito a flotante en m200sc1 (10 × "T→F 1")
    const cardAdm = adm.page.locator("div", { has: adm.page.getByText("Modelo 200 SC1", { exact: true }) }).filter({ has: adm.page.getByRole("button", { name: "T→F 1" }) }).last();
    for (let i = 0; i < 10; i++) await cardAdm.getByRole("button", { name: "T→F 1" }).click();
    // mientras el admin tiene el borrador abierto, el vendedor vende 2 m200
    await venderUI(ven.page, { piloto: "Intermedio", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(1000);
    eq("venta del vendedor llegó: 6−2 = 4", S(b,0,0,"m200sc1"), [40,36,4]);
    await adm.page.getByRole("button", { name: "💾 Guardar stock" }).click();
    await sleep(6000);
    eq("tras Guardar: flotante 4+10 = 14, tránsito 36−10 = 26 (la venta se conservó)", S(b,0,0,"m200sc1"), [40,26,14]);
    eq("m120sc1 intacto", S(b,0,0,"m120sc1"), [175,40,5]);
    await adm.ctx.close(); await ven.ctx.close(); }
  }

  // 6) Servidor inalcanzable al vender: la venta se registra local, el stock NO se empuja con copia local;
  //    al volver el servidor, el descuento se aplica una vez.
  if (esc(6)) {
  console.log("\n[6] Sin servidor al vender → descuento diferido");
  { const b = makeBackend(STOCK_SRV);
    // el servidor está caído DESDE ANTES de abrir el panel: el teléfono arranca con su copia local vieja y nunca lee el servidor
    let caido = true; const orig = b.handle; b.handle = async (route, req) => { if (caido) return route.abort(); return orig(route, req); };
    const t = await abrirTelefono(browser, b, { localStock: STOCK_VIEJO });
    await sleep(1500);
    await venderUI(t.page, { piloto: "Sin Red", items: [{ label: "Modelo 120 SC1", qty: 1 }] });
    await sleep(1500);
    eq("servidor caído: stock del servidor sin tocar", S(b,0,0,"m120sc1"), [175,40,5]);
    caido = false; await sleep(15000);
    eq("venta reenviada al volver", b.ventas.length, 1);
    eq("descuento aplicado una vez: 5−1 = 4", S(b,0,0,"m120sc1"), [175,40,4]);
    eq("bodega/tránsito NO pisados por la copia vieja", [b.stock.m120sc1.bodega, b.stock.m120sc1.transito, b.stock.m200sc1.bodega], [175,40,40]);
    await t.ctx.close(); }
  }

  // 7) Venta pendiente y borrado: al borrar la pendiente el flotante vuelve (desde el servidor).
  if (esc(7)) {
  console.log("\n[7] Borrar venta pendiente devuelve al flotante");
  { const b = makeBackend(STOCK_SRV); const adm = await abrirTelefono(browser, b, { pin: "A2030" });
    await sleep(1500);
    await venderUI(adm.page, { piloto: "Pendiente X", items: [{ label: "Modelo 200 SC1", qty: 2 }], pendiente: true });
    await sleep(1000);
    eq("pendiente descontó: 6−2 = 4", S(b,0,0,"m200sc1"), [40,36,4]);
    // la lista de pendientes del admin vive en la pestaña 📊 Stats
    await adm.page.getByRole("button", { name: /Stats/ }).first().click();
    adm.page.on("dialog", d => d.accept(d.type() === "prompt" ? "A2030" : undefined));
    // antes de borrar, el servidor cambia por otro teléfono (venta de 1 m200 desde otra copia): el borrado debe sumar sobre ESE valor
    b.stock.m200sc1.flotante = 3; // como si otro teléfono hubiera vendido 1 más (4→3)
    await sleep(13000); // el admin toma el 3 en su sondeo
    await adm.page.getByRole("button", { name: /Borrar/ }).first().click();
    await sleep(5000);
    eq("flotante restaurado sobre el servidor: 3+2 = 5", S(b,0,0,"m200sc1"), [40,36,5]);
    eq("venta borrada", b.ventas.length, 0);
    await adm.ctx.close(); }
  }

  // 8) Cobrar una pendiente NO toca el stock, ni siquiera desde un teléfono con copia local vieja (antes re-empujaba la copia local).
  if (esc(8)) {
  console.log("\n[8] Marcar pagado no toca el stock (teléfono con copia vieja)");
  { const b = makeBackend(STOCK_SRV); const ven = await abrirTelefono(browser, b);
    await sleep(1500);
    await venderUI(ven.page, { piloto: "Deudor", items: [{ label: "Modelo 120 SC1", qty: 1 }], pendiente: true });
    await sleep(1500);
    eq("pendiente descontó: 5−1 = 4", S(b,0,0,"m120sc1"), [175,40,4]);
    // otro teléfono vende 2 m200 (simulado directo en el servidor) y el admin entra con copia local VIEJA a cobrar
    b.stock.m200sc1.flotante = 4;
    const adm = await abrirTelefono(browser, b, { pin: "A2030", localStock: STOCK_VIEJO });
    await sleep(1500);
    await adm.page.getByRole("button", { name: /Stats/ }).first().click();
    await adm.page.getByRole("button", { name: /Marcar pagado/ }).first().click();
    await adm.page.getByRole("button", { name: /Cobrado/ }).first().click();
    await sleep(6000);
    eq("stock del servidor intacto tras cobrar", [S(b,0,0,"m120sc1"), S(b,0,0,"m200sc1")], [[175,40,4],[40,36,4]]);
    eq("ningún push de stock desde el cobro", b.log.filter(l=>l.type==="stock").length, 1);
    eq("venta cobrada reemplazó a la pendiente", [b.ventas.length, b.borrados.length], [1,1]);
    await adm.ctx.close(); await ven.ctx.close(); }
  }
  // 9) El caso de San Juan: el vendedor vende (candado local de 60 s activo), el admin sube flotante
  //    a mano, y el vendedor vuelve a vender antes del minuto. Antes: la 2ª venta re-escribía el flotante
  //    con la copia local (sin el ajuste del admin) → el ajuste se perdía. Ahora: parte del servidor.
  if (esc(9)) {
  console.log("\n[9] Vendedor vende, admin ajusta flotante, vendedor vende de nuevo dentro del minuto");
  { const b = makeBackend(STOCK_SRV); const ven = await abrirTelefono(browser, b);
    await sleep(1500);
    await venderUI(ven.page, { piloto: "Primero", items: [{ label: "Modelo 200 SC1", qty: 1 }] });
    await sleep(2000);
    eq("1ª venta: 6−1 = 5", S(b,0,0,"m200sc1"), [40,36,5]);
    b.stock.m200sc1.flotante = 15; b.stock.m200sc1.transito = 26; // el admin pasó 10 de tránsito a flotante (desde otro dispositivo)
    await sleep(14000); // el vendedor sondea (candado local sigue activo: la UI puede mostrar 5, pero la referencia del servidor ya dice 15)
    await venderUI(ven.page, { piloto: "Segundo", items: [{ label: "Modelo 200 SC1", qty: 1 }] });
    await sleep(6000);
    eq("2ª venta parte del servidor: 15−1 = 14 (el ajuste del admin se conservó)", S(b,0,0,"m200sc1"), [40,26,14]);
    await ven.ctx.close(); }
  }

  // 10) (Auditor 1 #1 / Auditor 2 N1) Dos ventas seguidas del MISMO producto y AMBOS pushes perdidos: se recupera el total.
  if (esc(10)) {
  console.log("\n[10] Dos ventas seguidas del mismo producto con ambos pushes perdidos → se recupera −3");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500); b.dropStockPosts = 2;
    await venderUI(t.page, { piloto: "Perdido Uno", items: [{ label: "Modelo 200 SC1", qty: 1 }] });
    await venderUI(t.page, { piloto: "Perdido Dos", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(2000);
    eq("ambos pushes perdidos: servidor sigue en 6", S(b,0,0,"m200sc1"), [40,36,6]);
    await sleep(28000);
    eq("reintento acumulado: 6−1−2 = 3", S(b,0,0,"m200sc1"), [40,36,3]);
    await sleep(13000);
    eq("sin doble descuento", S(b,0,0,"m200sc1"), [40,36,3]);
    eq("2 ventas registradas", b.ventas.length, 2);
    await t.ctx.close(); }
  }

  // 11) (Auditor 2 N2 / Auditor 1 #3) Respuesta GET vieja que llega fuera de orden NO debe retroceder la referencia.
  if (esc(11)) {
  console.log("\n[11] Lectura vieja fuera de orden no deshace la venta siguiente");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500);
    // el primer GET tras la venta (la lectura fresca previa al push) responde rápido; hacemos que un sondeo previo quede "colgado" 6 s
    let lentoUsado = false; const orig = b.handle;
    b.handle = async (route, req) => { if (req.method() === "GET" && !lentoUsado) { lentoUsado = true; await new Promise(r => setTimeout(r, 6000)); } return orig(route, req); };
    await t.ctx.unroute(SHEETS_RE); await t.ctx.route(SHEETS_RE, (r, q) => b.handle(r, q));
    // disparar un sondeo que quedará colgado 6 s con el snapshot viejo (flotante 6)
    await t.page.evaluate(() => fetch(location.href).catch(()=>{})); // no-op para asegurar que la página está viva
    await sleep(200);
    // forzamos un sondeo: la app sondea cada 12 s; vendemos ahora (la lectura fresca de la venta será la lenta si es la primera GET)
    await venderUI(t.page, { piloto: "Orden Uno", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(8000); // la lectura lenta ya respondió; el push salió con base 6 → 4
    eq("1ª venta aplicada: 6−2 = 4", S(b,0,0,"m200sc1"), [40,36,4]);
    await venderUI(t.page, { piloto: "Orden Dos", items: [{ label: "Modelo 200 SC1", qty: 1 }] });
    await sleep(6000);
    eq("2ª venta parte del valor real: 4−1 = 3 (no de la lectura vieja 6)", S(b,0,0,"m200sc1"), [40,36,3]);
    await sleep(13000);
    eq("estable", S(b,0,0,"m200sc1"), [40,36,3]);
    await t.ctx.close(); }
  }

  // 12) (Auditor 2 P1) Dos teléfonos venden productos DISTINTOS con 4 s de diferencia: ninguna venta se pierde.
  if (esc(12)) {
  console.log("\n[12] Dos teléfonos, productos distintos, 4 s de diferencia");
  { const b = makeBackend(STOCK_SRV); const A = await abrirTelefono(browser, b); const B = await abrirTelefono(browser, b);
    await sleep(1500);
    await venderUI(A.page, { piloto: "A m200", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(4000);
    await venderUI(B.page, { piloto: "B m120", items: [{ label: "Modelo 120 SC1", qty: 1 }] });
    await sleep(8000);
    eq("m200sc1 6−2 = 4 (la venta de A no fue pisada por B)", S(b,0,0,"m200sc1"), [40,36,4]);
    eq("m120sc1 5−1 = 4", S(b,0,0,"m120sc1"), [175,40,4]);
    await sleep(13000);
    eq("estable", [S(b,0,0,"m200sc1"), S(b,0,0,"m120sc1")], [[40,36,4],[175,40,4]]);
    await A.ctx.close(); await B.ctx.close(); }
  }

  // 13) (Auditor 2 X7 / P2) Teléfono cuyas lecturas fallan hace 20 s (referencia vieja) vende: NO empuja la referencia vieja; difiere.
  if (esc(13)) {
  console.log("\n[13] Referencia vieja (GET fallando 20 s) + otros vendieron → no resucita neumáticos");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500);
    let getCaido = true; const orig = b.handle; b.handle = async (route, req) => { if (getCaido && req.method() === "GET") return route.abort(); return orig(route, req); };
    await t.ctx.unroute(SHEETS_RE); await t.ctx.route(SHEETS_RE, (r, q) => b.handle(r, q));
    // mientras este teléfono no lee, otros venden: m200 6→1, m120 5→0
    b.stock.m200sc1.flotante = 1; b.stock.m120sc1.flotante = 0;
    await sleep(20000);
    await venderUI(t.page, { piloto: "Dormido", items: [{ label: "Modelo 180 SC2", qty: 1 }] });
    await sleep(3000);
    eq("no empujó su referencia vieja: m200 sigue 1, m120 sigue 0, m180 sigue 7 (diferido)", [S(b,0,0,"m200sc1"), S(b,0,0,"m120sc1"), S(b,0,0,"m180sc2")], [[40,36,1],[175,40,0],[50,0,7]]);
    getCaido = false; await sleep(15000);
    eq("al volver la lectura aplica su venta sobre el servidor real: m180 7−1 = 6; m200/m120 intactos", [S(b,0,0,"m180sc2"), S(b,0,0,"m200sc1"), S(b,0,0,"m120sc1")], [[50,0,6],[40,36,1],[175,40,0]]);
    await t.ctx.close(); }
  }

  // 14) (Auditor 2 N3) Guardar stock con la lectura fresca fallando → se difiere, no se empuja la foto vieja.
  if (esc(14)) {
  console.log("\n[14] Guardar stock sin lectura fresca → diferido (no pisa lo de otros)");
  { const b = makeBackend(STOCK_SRV); const adm = await abrirTelefono(browser, b, { pin: "A2030" });
    await sleep(1500);
    await adm.page.getByRole("button", { name: /Stock/ }).first().click();
    await adm.page.getByText("Gestión de Stock").waitFor();
    const cardAdm = adm.page.locator("div", { has: adm.page.getByText("Modelo 180 SC2", { exact: true }) }).filter({ has: adm.page.getByRole("button", { name: "B→T 1" }) }).last();
    await cardAdm.getByRole("button", { name: "B→T 1" }).click();
    let getCaido = true; const orig = b.handle; b.handle = async (route, req) => { if (getCaido && req.method() === "GET") return route.abort(); return orig(route, req); };
    await adm.ctx.unroute(SHEETS_RE); await adm.ctx.route(SHEETS_RE, (r, q) => b.handle(r, q));
    b.stock.m200sc1.flotante = 3; b.stock.m120sc1.flotante = 2; // otros venden mientras el admin está sin lectura
    await sleep(16000); // la referencia del admin ya tiene >15 s
    await adm.page.getByRole("button", { name: "💾 Guardar stock" }).click();
    await sleep(3000);
    eq("sin lectura: nada empujado (m200 3, m120 2, m180 50/0/7)", [S(b,0,0,"m200sc1"), S(b,0,0,"m120sc1"), S(b,0,0,"m180sc2")], [[40,36,3],[175,40,2],[50,0,7]]);
    getCaido = false; await sleep(15000);
    eq("al reconectar se aplica solo el cambio del admin: m180 49/1/7; los demás intactos", [S(b,0,0,"m180sc2"), S(b,0,0,"m200sc1"), S(b,0,0,"m120sc1")], [[49,1,7],[40,36,3],[175,40,2]]);
    await adm.ctx.close(); }
  }

  // 15) (Auditor 1 #2 / Auditor 2 N4) Recarga de página con descuento diferido: el pendiente sobrevive y se aplica una vez.
  if (esc(15)) {
  console.log("\n[15] Recarga con pendiente diferido → sobrevive y se aplica una sola vez");
  { const b = makeBackend(STOCK_SRV);
    let caido = true; const orig = b.handle; b.handle = async (route, req) => { if (caido) return route.abort(); return orig(route, req); };
    const t = await abrirTelefono(browser, b, { localStock: STOCK_VIEJO });
    await sleep(1500);
    await venderUI(t.page, { piloto: "Recarga", items: [{ label: "Modelo 120 SC1", qty: 1 }] });
    await sleep(1000);
    const pendLS = await t.page.evaluate(() => localStorage.getItem("gp3_stock_pend"));
    eq("pendiente diferido persistido en localStorage", !!pendLS && pendLS.includes('"pre":null'), true);
    await t.page.reload(); // el teléfono se recarga con el servidor todavía caído
    await sleep(2000);
    caido = false; await sleep(15000);
    eq("venta reenviada", b.ventas.length, 1);
    eq("descuento aplicado UNA vez tras la recarga: 5−1 = 4", S(b,0,0,"m120sc1"), [175,40,4]);
    await sleep(13000);
    eq("estable", S(b,0,0,"m120sc1"), [175,40,4]);
    await t.ctx.close(); }
  }

  // 16) (Auditores 2ª ronda V2-1/N1) Venta 1 push perdido; en la venta 2 la lectura fresca FALLA (ref <15 s) y su push también se pierde → se recupera todo.
  if (esc(16)) {
  console.log("\n[16] Red mala: 1ª push perdido, 2ª sin lectura fresca y push perdido → cadena heredada, se recupera −3");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500); b.dropStockPosts = 2;
    await venderUI(t.page, { piloto: "Flaky Uno", items: [{ label: "Modelo 200 SC1", qty: 1 }] });
    let getCaido = true; const orig = b.handle; b.handle = async (route, req) => { if (getCaido && req.method() === "GET") return route.abort(); return orig(route, req); };
    await t.ctx.unroute(SHEETS_RE); await t.ctx.route(SHEETS_RE, (r, q) => b.handle(r, q));
    await sleep(500);
    await venderUI(t.page, { piloto: "Flaky Dos", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(2000); getCaido = false;
    eq("ambos pushes perdidos: servidor sigue en 6", S(b,0,0,"m200sc1"), [40,36,6]);
    const pend = JSON.parse(await t.page.evaluate(() => localStorage.getItem("gp3_stock_pend") || "[]"));
    eq("un solo pendiente heredado con pre 6 y delta −3", pend.map(p=>[p.pid,p.pre,p.delta]), [["m200sc1",6,-3]]);
    await sleep(30000);
    eq("recuperado: 6−1−2 = 3", S(b,0,0,"m200sc1"), [40,36,3]);
    await t.ctx.close(); }
  }

  // 17) (V2-4) Ajuste legítimo igual y opuesto del admin (T→F 2 justo después de vender 2) NO se deshace.
  if (esc(17)) {
  console.log("\n[17] Vendedor vende 2; admin repone 2 de tránsito (T→F) en la ventana → no se duplica el descuento");
  { const b = makeBackend(STOCK_SRV); const ven = await abrirTelefono(browser, b);
    await sleep(1500);
    await venderUI(ven.page, { piloto: "Dos Gomas", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(1500);
    eq("venta: 6−2 = 4", S(b,0,0,"m200sc1"), [40,36,4]);
    b.stock.m200sc1.flotante = 6; b.stock.m200sc1.transito = 34; // el admin (otro dispositivo, lectura fresca 4) hace T→F 2 → 6/34
    await sleep(40000); // varias lecturas del vendedor: ve 6 (== su pre) pero tránsito cambió → movimiento legítimo, no re-aplica
    eq("el vendedor NO re-aplica su −2: queda 6 / tránsito 34", S(b,0,0,"m200sc1"), [40,34,6]);
    eq("no hubo pushes de reintento", b.log.filter(l=>l.type==="stock").length, 1);
    await ven.ctx.close(); }
  }

  // 18) (V2-3) Un descuento diferido de AYER guardado en el teléfono no se aplica solo: va a cuarentena y el admin decide.
  if (esc(18)) {
  console.log("\n[18] Pendiente diferido de hace 20 h → cuarentena, no se aplica solo; el admin lo aplica desde Stock");
  { const b = makeBackend(STOCK_SRV);
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } }); await ctx.route(SHEETS_RE, b.handle);
    const page = await ctx.newPage();
    await page.addInitScript(() => { if (!localStorage.getItem("__seeded2")) { localStorage.setItem("gp3_stock_pend", JSON.stringify([{pid:"m200sc1",campo:"flotante",delta:-2,pre:null,esperado:null,pasos:[],ts:Date.now()-20*3600e3,intentos:0,vistoPre:0}])); localStorage.setItem("__seeded2","1"); } });
    await page.goto(`http://localhost:${PORT}/`);
    await sleep(3000);
    eq("no se aplicó solo al abrir: servidor sigue en 6", S(b,0,0,"m200sc1"), [40,36,6]);
    await page.getByRole("button", { name: "ENTRAR" }).click();
    await page.getByPlaceholder("PIN de acceso").fill("A2030");
    const card = page.locator("div", { has: page.getByPlaceholder("PIN de acceso") }).last();
    await card.getByRole("button", { name: "INGRESAR" }).click();
    await page.getByText("Neumáticos — Stock Flotante").first().waitFor({ timeout: 8000 });
    await page.getByRole("button", { name: /Stock/ }).first().click();
    await page.getByText("Descuentos de stock antiguos sin aplicar").waitFor({ timeout: 5000 });
    eq("la pestaña Stock muestra la cuarentena", true, true);
    await page.getByRole("button", { name: "Aplicar ahora" }).click();
    await sleep(6000);
    eq("aplicado por decisión del admin: 6−2 = 4", S(b,0,0,"m200sc1"), [40,36,4]);
    await ctx.close(); }
  }

  // 19) (V2-6) localStorage corrupto en gp3_stock_pend no rompe la venta.
  if (esc(19)) {
  console.log("\n[19] gp3_stock_pend corrupto → la venta descuenta igual");
  { const b = makeBackend(STOCK_SRV);
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } }); await ctx.route(SHEETS_RE, b.handle);
    const page = await ctx.newPage(); page.on("pageerror", e => console.log("  [pageerror]", e.message));
    await page.addInitScript(() => { if (!localStorage.getItem("__seeded3")) { localStorage.setItem("gp3_stock_pend", '{"a":1}'); localStorage.setItem("__seeded3","1"); } });
    await page.goto(`http://localhost:${PORT}/`);
    await page.getByRole("button", { name: "ENTRAR" }).click();
    await page.getByPlaceholder("PIN vendedor").fill("N2030");
    const card = page.locator("div", { has: page.getByPlaceholder("PIN vendedor") }).last();
    await card.getByRole("button", { name: "INGRESAR" }).click();
    await page.getByText("Neumáticos — Stock Flotante").first().waitFor({ timeout: 8000 });
    await sleep(1500);
    await venderUI(page, { piloto: "Corrupto", items: [{ label: "Modelo 120 SC1", qty: 1 }] });
    await sleep(3000);
    eq("descontó: 5−1 = 4", S(b,0,0,"m120sc1"), [175,40,4]);
    await ctx.close(); }
  }

  // 20) (V3-1) Dos ventas en el mismo teléfono: la lectura fresca de la 1ª tarda más que la de la 2ª y ambos POST se pierden → no se descarta la cadena por un valor optimista propio.
  if (esc(20)) {
  console.log("\n[20] Lectura de la 1ª venta más lenta que la 2ª + pushes perdidos → se recupera −3");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500);
    let n = 0; const orig = b.handle; b.handle = async (route, req) => { if (req.method() === "GET") { n++; if (n === 1) await new Promise(r => setTimeout(r, 4000)); } return orig(route, req); };
    await t.ctx.unroute(SHEETS_RE); await t.ctx.route(SHEETS_RE, (r, q) => b.handle(r, q));
    b.dropStockPosts = 3;
    await venderUI(t.page, { piloto: "Lenta", items: [{ label: "Modelo 200 SC1", qty: 2 }] });   // su lectura fresca tarda 4 s
    await sleep(300);
    await venderUI(t.page, { piloto: "Rápida", items: [{ label: "Modelo 200 SC1", qty: 1 }] });  // su lectura fresca es rápida
    await sleep(8000);
    eq("pushes perdidos: servidor sigue en 6", S(b,0,0,"m200sc1"), [40,36,6]);
    const pend = JSON.parse(await t.page.evaluate(() => localStorage.getItem("gp3_stock_pend") || "[]"));
    eq("la cadena conserva pre 6 y delta −3", pend.map(p=>[p.pid,p.pre,p.delta]), [["m200sc1",6,-3]]);
    b.dropStockPosts = 0; await sleep(30000);
    eq("recuperado: 6−2−1 = 3", S(b,0,0,"m200sc1"), [40,36,3]);
    await t.ctx.close(); }
  }

  // 21) (V3-2) Push perdido de verdad + admin hace B→T 1 (no toca flotante): el reintento NO debe abandonarse.
  if (esc(21)) {
  console.log("\n[21] Push perdido + admin mueve B→T (flotante intacto) → el reintento sigue vivo");
  { const b = makeBackend(STOCK_SRV); const t = await abrirTelefono(browser, b);
    await sleep(1500); b.dropStockPosts = 1;
    await venderUI(t.page, { piloto: "Perdido BT", items: [{ label: "Modelo 200 SC1", qty: 2 }] });
    await sleep(1500);
    b.stock.m200sc1.bodega = 39; b.stock.m200sc1.transito = 37; // admin B→T 1 desde otro dispositivo, flotante 6 intacto
    await sleep(30000);
    eq("reintentado: flotante 6−2 = 4 con bodega/tránsito del admin", S(b,0,0,"m200sc1"), [39,37,4]);
    await t.ctx.close(); }
  }
} finally {
  await browser.close(); srvStatic.close();
}
console.log(`\n${total - fallos}/${total} aserciones PASA${fallos ? " — " + fallos + " FALLA" : ""}`);
process.exit(fallos ? 1 : 0);
