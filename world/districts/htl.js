/* htl.js: Himanshu Travel Line bus depot, built like a bright toy-brick city.
   Plot centre (-92, 8), 54 x 52 m (x -119..-65, z -18..34). Entrance on the east edge at (-65, 8).

   Layout (north is up):
     north strip  z -16..-2 : depot office (NE) . dispatch tower . crew briefing . records . workshop (NW)
     walkway      z  -3..1.5: raised paving from the gate past every building
     driveway     z   3..13 : gate with boom barriers + guard booth on the median, out lane north, in lane south
     yard         z  1.5..32: bay column A (7 bays, nose west), aisle, column B (5 bays, nose east, 3 PREMIUM),
                              fuel island with canopy in the south-east
   Local helpers (not in kit): two canvas atlases (lit: ground markings + bus lettering; unlit: signs + screens),
   an atlas quad builder, and a chunkier toy bus builder with window pillars, door, wheel wells and roof hatches. */
export async function build(ctx) {
  const { THREE, kit, M } = ctx;
  const low = ctx.quality === 'low', hi = !low;
  const P = kit.PALETTE, Y = '#F2B705';
  const { box, rbox, cyl } = kit;
  const root = new THREE.Group();
  const S = new THREE.Group(); root.add(S);
  const colliders = [], spots = [];
  const cBox = (x, z, w, d) => colliders.push({ type: 'box', x, z, w, d });
  const cCir = (x, z, r) => colliders.push({ type: 'circle', x, z, r });
  const PI = Math.PI;

  /* ---------------- materials (bright plastic palette) ---------------- */
  const C = { red: '#D7263D', blue: '#1F6FD1', green: '#3AA14A', white: '#F6F6F2', grey: '#A9AFB7', dgrey: '#5E646C', tan: '#E4CD9A' };
  const mWhite = M.std(C.white, { rough: .45 }), mYellow = M.std(Y, { rough: .4 }), mRed = M.std(C.red, { rough: .4 });
  const mBlue = M.std(C.blue, { rough: .4 }), mGreen = M.std(C.green, { rough: .5 }), mGrey = M.std(C.grey, { rough: .5 });
  const mDGrey = M.std(C.dgrey, { rough: .5 }), mDark = M.dark, mTan = M.std(C.tan, { rough: .6 });
  const mKerb = M.std(P.kerb, { rough: .9 }), mPave = M.paving, mAsph = M.asphalt, mConc = M.concrete;
  const mGlass = new THREE.MeshStandardMaterial({ color: '#7FC4F0', transparent: true, opacity: .3, roughness: .08, metalness: .1, envMapIntensity: 1.4, depthWrite: false });
  const mWarm = M.emit('#FFF4DC', 1);

  /* ---------------- atlases ---------------- */
  const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
  function makeAtlas(W, H, lit) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    let sx = 0, sy = 0, rowH = 0; const PAD = 6;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = low ? 2 : 8;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const mat = lit
      ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false })
      : new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const reqs = [];
    function add(w, h, draw) { const r = { u0: 0, u1: 0, v0: 0, v1: 0 }; reqs.push({ w: Math.round(w), h: Math.round(h), draw, r }); return r; }
    function pack() {   // shelf-pack tallest first, then draw
      reqs.sort((a, b) => b.h - a.h);
      for (const q of reqs) {
        if (sx + q.w > W) { sx = 0; sy += rowH + PAD; rowH = 0; }
        if (sy + q.h > H) console.warn('[htl] atlas overflow');
        const x = sx, y = sy; sx += q.w + PAD; rowH = Math.max(rowH, q.h);
        g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, q.w, q.h); g.clip(); q.draw(g, q.w, q.h); g.restore();
        Object.assign(q.r, { u0: x / W, u1: (x + q.w) / W, v0: 1 - (y + q.h) / H, v1: 1 - y / H });
      }
      tex.needsUpdate = true;
    }
    return { add, pack, mat, tex };
  }
  const L = makeAtlas(1024, 1024, true), U = makeAtlas(2048, 1024, false);
  function quad(A, r, w, h, o = {}) {
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
    if (o.ground) geo.rotateX(-PI / 2); else geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, A.mat);
    m.position.set(o.x || 0, o.y == null ? (o.ground ? .075 : 0) : o.y, o.z || 0); m.rotation.y = o.ry || 0;
    m.castShadow = false; m.receiveShadow = A === L;
    (o.parent || S).add(m); return m;
  }
  function text(g, w, h, lines, o = {}) {
    if (o.bg) { g.fillStyle = o.bg; if (o.radius) { g.beginPath(); g.roundRect(0, 0, w, h, o.radius); g.fill(); } else g.fillRect(0, 0, w, h); }
    if (o.bar) { const bh = h * (o.barH || .1); g.fillStyle = o.bar; g.fillRect(0, h - bh, w, bh); }
    if (o.barTop) { const bh = h * (o.barH || .1); g.fillStyle = o.barTop; g.fillRect(0, 0, w, bh); }
    const pad = o.pad == null ? h * .1 : o.pad;
    const total = lines.reduce((s, l) => s + l.s * h * (l.lh || 1.22), 0);
    let y = (h - total) / 2 + (o.dy || 0) * h;
    g.textBaseline = 'middle'; g.textAlign = o.align || 'center';
    for (const l of lines) {
      const lh = l.s * h * (l.lh || 1.22); let fs = l.s * h;
      const setF = () => { g.font = `${l.w || 800} ${fs}px ${FONT}`; try { g.letterSpacing = (l.ls ? l.ls * fs : 0) + 'px'; } catch (_) {} };
      setF(); while (g.measureText(l.t).width > w - pad * 2 && fs > 6) { fs -= 1; setF(); }
      g.fillStyle = l.c || o.fg || P.ink;
      g.fillText(l.t, o.align === 'left' ? pad : o.align === 'right' ? w - pad : w / 2, y + lh / 2); y += lh;
    }
    try { g.letterSpacing = '0px'; } catch (_) {}
  }
  const WH = '#F4F4F0';

  // ---- lit atlas: ground markings
  const rNum = [];
  for (let i = 1; i <= 12; i++) rNum.push(L.add(128, 72, (g, w, h) => text(g, w, h, [{ t: String(i).padStart(2, '0'), s: .78, c: WH }])));
  const rPrem = L.add(300, 64, (g, w, h) => text(g, w, h, [{ t: 'PREMIUM', s: .7, c: '#F6C84A', ls: .08 }]));
  const rSlow = L.add(200, 70, (g, w, h) => text(g, w, h, [{ t: 'SLOW', s: .75, c: WH, ls: .1 }]));
  const rStop = L.add(200, 70, (g, w, h) => text(g, w, h, [{ t: 'STOP', s: .75, c: WH, ls: .1 }]));
  const rKeep = L.add(330, 64, (g, w, h) => text(g, w, h, [{ t: 'KEEP CLEAR', s: .62, c: '#FFD23F', ls: .08 }]));
  const rFuelG = L.add(200, 70, (g, w, h) => text(g, w, h, [{ t: 'FUEL', s: .72, c: WH, ls: .1 }]));
  const rArrow = L.add(96, 160, (g, w, h) => { g.fillStyle = WH; g.beginPath(); g.moveTo(w / 2, 4); g.lineTo(w - 6, h * .42); g.lineTo(w * .64, h * .42); g.lineTo(w * .64, h - 4); g.lineTo(w * .36, h - 4); g.lineTo(w * .36, h * .42); g.lineTo(6, h * .42); g.closePath(); g.fill(); });
  const rWalk = L.add(260, 60, (g, w, h) => text(g, w, h, [{ t: 'WALKWAY', s: .66, c: WH, ls: .12 }]));
  // ---- lit atlas: bus lettering
  const rSideS = L.add(800, 48, (g, w, h) => text(g, w, h, [{ t: 'HIMANSHU TRAVEL LINE', s: .78, c: '#1F2328', ls: .06 }], { pad: 2 }));
  const rSchool = L.add(300, 56, (g, w, h) => text(g, w, h, [{ t: 'SCHOOL BUS', s: .8, c: '#1F2328', ls: .05 }], { pad: 2 }));
  const rSideC = L.add(700, 70, (g, w, h) => text(g, w, h, [{ t: 'Himanshu Travel Line', s: .74, c: C.blue }], { pad: 2 }));
  const rSideP = L.add(400, 64, (g, w, h) => text(g, w, h, [{ t: 'PREMIUM', s: .8, c: '#F6C84A', ls: .14 }], { pad: 2 }));
  const rSidePW = L.add(560, 52, (g, w, h) => text(g, w, h, [{ t: 'Himanshu Travel Line', s: .72, c: '#1D5FD0' }], { pad: 2 }));

  // ---- unlit atlas: signs and screens
  const rGateE = U.add(1100, 132, (g, w, h) => text(g, w, h, [{ t: 'HIMANSHU TRAVEL LINE', s: .5, ls: .06 }, { t: 'BUS DEPOT  ·  SCHOOL & CORPORATE TRANSPORT', s: .17, w: 700, c: '#5B6470', ls: .12 }], { bg: '#FFFFFF', bar: Y, barH: .1 }));
  const rGateW = U.add(700, 100, (g, w, h) => text(g, w, h, [{ t: 'THANK YOU  ·  DRIVE SAFE', s: .42, ls: .05 }], { bg: '#FFFFFF', bar: Y, barH: .12 }));
  const rPylon = U.add(176, 416, (g, w, h) => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.fillStyle = Y; g.fillRect(0, 0, w, h * .045);
    text(g, w, h * .62, [{ t: 'Himanshu', s: .15 }, { t: 'Travel', s: .15 }, { t: 'Line', s: .15 }], { dy: .04 });
    g.fillStyle = Y; g.fillRect(w * .18, h * .64, w * .64, h * .012);
    g.save(); g.translate(0, h * .68); text(g, w, h * .3, [{ t: 'BUS DEPOT', s: .2, ls: .1, c: '#1F2328' }, { t: 'School &', s: .14, w: 600, c: '#5B6470' }, { t: 'corporate', s: .14, w: 600, c: '#5B6470' }]); g.restore();
  });
  const rOffice = U.add(860, 80, (g, w, h) => text(g, w, h, [{ t: 'HIMANSHU TRAVEL LINE  ·  DEPOT OFFICE', s: .5, ls: .05 }], { bg: '#FFFFFF', bar: Y, barH: .12 }));
  const rRecep = U.add(300, 52, (g, w, h) => text(g, w, h, [{ t: 'RECEPTION', s: .56, ls: .14 }], { bg: '#FFFFFF' }));
  const rContr = U.add(380, 52, (g, w, h) => text(g, w, h, [{ t: 'CONTRACTS DESK', s: .56, ls: .1 }], { bg: '#FFFFFF', bar: Y, barH: .12 }));
  const rClient = U.add(560, 200, (g, w, h) => {
    g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, w, h);
    text(g, w, h * .2, [{ t: 'OUR CLIENTS', s: .62, ls: .14, c: '#1F2328' }]);
    const cols = 4, rows = 2, fw = w / cols, fh = (h * .8) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * fw + fw * .12, y = h * .2 + r * fh + fh * .08, ww = fw * .76, hh = fh * .8, school = (r + c) % 2 === 0;
      g.fillStyle = '#C79A55'; g.fillRect(x - 3, y - 3, ww + 6, hh + 6); g.fillStyle = '#FFFFFF'; g.fillRect(x, y, ww, hh);
      g.fillStyle = [C.red, C.blue, Y, C.green][(r * 4 + c) % 4];
      if (school) { g.fillRect(x + ww * .3, y + hh * .3, ww * .4, hh * .28); g.beginPath(); g.moveTo(x + ww * .25, y + hh * .32); g.lineTo(x + ww * .5, y + hh * .12); g.lineTo(x + ww * .75, y + hh * .32); g.fill(); }
      else { g.fillRect(x + ww * .38, y + hh * .1, ww * .24, hh * .48); g.fillRect(x + ww * .26, y + hh * .3, ww * .12, hh * .28); }
      g.fillStyle = '#5B6470'; g.font = `600 ${hh * .16}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(school ? 'School partner' : 'Corporate client', x + ww / 2, y + hh * .8);
    }
  });
  const rDisp = U.add(500, 44, (g, w, h) => text(g, w, h, [{ t: 'DISPATCH  ·  CONTROL', s: .62, ls: .12 }], { bg: '#FFFFFF' }));
  const mapPts = [ // yellow route on the map, in 0..1 (x right, y down)
    [.06, .82], [.22, .82], [.22, .55], [.44, .55], [.44, .3], [.7, .3], [.7, .62], [.92, .62]];
  const mapPts2 = [[.1, .3], [.32, .3], [.32, .72], [.6, .72], [.6, .9], [.88, .9]];
  const rMap = U.add(520, 320, (g, w, h) => {
    g.fillStyle = '#E9F3F8'; g.fillRect(0, 0, w, h);
    const top = h * .14;
    g.fillStyle = '#CFE7C4'; g.fillRect(w * .5, top + h * .05, w * .14, h * .18); g.fillRect(w * .08, h * .6, w * .1, h * .14);
    g.fillStyle = '#BFE0F2'; g.beginPath(); g.moveTo(0, h * .45); g.bezierCurveTo(w * .3, h * .38, w * .5, h * .5, w, h * .42); g.lineTo(w, h * .48); g.bezierCurveTo(w * .5, h * .56, w * .3, h * .44, 0, h * .5); g.fill();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 6;
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * w / 8, top); g.lineTo(i * w / 8, h); g.stroke(); }
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, top + i * (h - top) / 5); g.lineTo(w, top + i * (h - top) / 5); g.stroke(); }
    const route = (pts, col) => { g.strokeStyle = col; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x * w, top + y * (h - top))); g.stroke(); pts.forEach(([x, y]) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x * w, top + y * (h - top), 6, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke(); }); };
    route(mapPts, '#E3A600'); route(mapPts2, C.blue); route([[.05, .15], [.4, .15], [.4, .05], [.95, .05]], C.green);
    g.fillStyle = '#1F2328'; g.fillRect(0, 0, w, top);
    g.fillStyle = '#FFFFFF'; g.font = `800 ${top * .52}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('LIVE GPS ROUTES', 12, top / 2);
    g.textAlign = 'right'; g.fillStyle = '#7CE08A'; g.fillText('ON TIME', w - 12, top / 2);
  });
  const rSched = U.add(300, 180, (g, w, h) => {
    g.fillStyle = '#1F2B3A'; g.fillRect(0, 0, w, h);
    g.fillStyle = Y; g.font = `800 ${h * .12}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('DEPARTURES', 10, h * .1);
    const rows = [['06:40', 'Route 3', 'OUT'], ['06:45', 'Route 7', 'OUT'], ['06:50', 'Route 1', 'BAY 04'], ['07:00', 'Corp 2', 'BAY 09'], ['07:05', 'Route 5', 'BAY 02']];
    rows.forEach((r, i) => { const y = h * (.28 + i * .15); g.fillStyle = '#FFFFFF'; g.font = `700 ${h * .1}px ${FONT}`; g.fillText(r[0], 10, y); g.fillText(r[1], w * .3, y); g.fillStyle = r[2] === 'OUT' ? '#7CE08A' : '#FFD23F'; g.fillText(r[2], w * .7, y); });
  });
  const rBoard = U.add(480, 200, (g, w, h) => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
    g.fillStyle = C.red; g.font = `800 ${h * .12}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('DAILY CREW BRIEFING  06:10', 16, h * .12);
    const items = ['Walk-round check: tyres, lights, brakes', 'GPS on, route loaded', 'First pickup 06:40, leave on time', '40 km/h near schools'];
    items.forEach((t, i) => { const y = h * (.32 + i * .17); g.fillStyle = C.green; g.font = `800 ${h * .11}px ${FONT}`; g.fillText('✓', 16, y); g.fillStyle = '#1F3A8A'; g.font = `600 ${h * .095}px ${FONT}`; g.fillText(t, 44, y); });
    g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .78, h * .85); g.lineTo(w * .78, h * .5); g.lineTo(w * .9, h * .5); g.lineTo(w * .9, h * .3); g.stroke();
  });
  const rRecSign = U.add(420, 50, (g, w, h) => text(g, w, h, [{ t: 'ADMIN & RECORDS', s: .6, ls: .1 }], { bg: '#FFFFFF', bar: Y, barH: .12 }));
  const rRecMon = U.add(260, 160, (g, w, h) => {
    g.fillStyle = '#F2F7FB'; g.fillRect(0, 0, w, h); g.fillStyle = C.blue; g.fillRect(0, 0, w, h * .18);
    g.fillStyle = '#FFFFFF'; g.font = `800 ${h * .11}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('DIGITAL RECORDS', 10, h * .09);
    ['Trip logs', 'Fuel log', 'Service log', 'Attendance'].forEach((t, i) => { const y = h * (.32 + i * .18); g.fillStyle = '#1F2328'; g.font = `600 ${h * .1}px ${FONT}`; g.fillText(t, 12, y); g.fillStyle = C.green; g.fillText('✓ synced', w * .58, y); g.fillStyle = '#D9E2EA'; g.fillRect(8, y + h * .08, w - 16, 2); });
  });
  const rWork = U.add(540, 60, (g, w, h) => text(g, w, h, [{ t: 'WORKSHOP  ·  SERVICE BAY', s: .58, ls: .1 }], { bg: '#FFFFFF', bar: Y, barH: .12 }));
  const rPeg = U.add(300, 130, (g, w, h) => {
    g.fillStyle = '#E8D4A8'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)';
    for (let x = 8; x < w; x += 14) for (let y = 8; y < h; y += 14) g.fillRect(x, y, 2, 2);
    const cols = [C.red, C.blue, '#30343A', Y];
    for (let i = 0; i < 9; i++) { g.save(); g.translate(20 + i * 31, h * .45); g.rotate((i % 3 - 1) * .15); g.fillStyle = cols[i % 4]; g.fillRect(-4, -h * .3, 8, h * .5); g.beginPath(); g.arc(0, -h * .32, 9, 0, 7); g.fill(); g.restore(); }
  });
  const rFuel = U.add(540, 60, (g, w, h) => text(g, w, h, [{ t: 'FUEL BAY  ·  DIESEL', s: .58, ls: .1 }], { bg: '#FFFFFF', bar: Y, barH: .12 }));
  const rPump = U.add(120, 90, (g, w, h) => { g.fillStyle = '#1F2B3A'; g.fillRect(0, 0, w, h); g.fillStyle = Y; g.font = `800 ${h * .2}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DIESEL', w / 2, h * .2); g.fillStyle = '#7CE08A'; g.font = `700 ${h * .26}px ${FONT}`; g.fillText('148.6 L', w / 2, h * .55); g.fillStyle = '#FFFFFF'; g.font = `600 ${h * .15}px ${FONT}`; g.fillText('BUS 07', w / 2, h * .83); });
  const rSec = U.add(200, 44, (g, w, h) => text(g, w, h, [{ t: 'SECURITY', s: .6, ls: .14 }], { bg: '#FFFFFF' }));
  const rSpeed = U.add(110, 110, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.strokeStyle = C.red; g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 9, 0, 7); g.stroke(); text(g, w, h, [{ t: '10', s: .42 }]); });
  const dest = {};
  ['SCHOOL', 'CORPORATE', 'PREMIUM', 'DEPOT'].forEach(t => (dest[t] = U.add(240, 36, (g, w, h) => text(g, w, h, [{ t, s: .74, c: '#FFB21A', ls: .12 }], { bg: '#111418', pad: 4 }))));
  L.pack(); U.pack();

  /* ---------------- toy bus builder (faces +z, base y 0) ---------------- */
  const BM = {
    yellow: M.carPaint('#F5B800'), white: M.carPaint('#F7F7F4'),
    pearl: new THREE.MeshPhysicalMaterial({ color: '#FBFAF6', roughness: .1, metalness: .3, clearcoat: 1, clearcoatRoughness: .03 }),
    navy: new THREE.MeshPhysicalMaterial({ color: '#1D5FD0', roughness: .15, metalness: .45, clearcoat: 1, clearcoatRoughness: .04 }),
    glass: M.std('#2C4A63', { rough: .06, metal: .5, map: null }),
    gold: M.std('#D9A92A', { rough: .25, metal: .8, map: null }),
    head: M.emit('#FFF6D8', 1), tail: M.emit('#E8342A', 1),
  };
  const tyreG = new THREE.CylinderGeometry(.5, .5, .32, low ? 10 : 16); tyreG.rotateZ(PI / 2);
  const hubG = new THREE.CylinderGeometry(.28, .28, .34, low ? 8 : 12); hubG.rotateZ(PI / 2);
  function busModel(kind) {
    const g = new THREE.Group();
    const school = kind === 'school', prem = kind === 'premium';
    const Lb = school ? 11 : 12, W = 2.5, H = school ? 3.1 : prem ? 3.5 : 3.35, y0 = .4;
    const body = school ? BM.yellow : prem ? BM.navy : BM.white;
    rbox(W, H - y0, Lb, .2, body, { parent: g, y: y0 });
    box(W - .3, .3, Lb - 1, mDark, { parent: g, y: .2 });
    const wy = school ? 1.55 : 1.45, wh = school ? 1.0 : prem ? 1.45 : 1.25;
    const zr = -Lb / 2 + .5;
    const pillarM = school ? BM.yellow : prem ? BM.navy : mDark, step = school ? 1.05 : prem ? 1.9 : 1.45;
    [-1, 1].forEach(s => {
      const zf = s > 0 ? Lb / 2 - 1.35 : Lb / 2 - .35, len = zf - zr;
      box(.04, wh, len, BM.glass, { parent: g, x: s * (W / 2 + .005), y: wy, z: (zf + zr) / 2 });
      const n = Math.max(1, Math.round(len / step));
      for (let i = 0; i <= n; i++) box(.06, wh + .02, school ? .14 : .1, pillarM, { parent: g, x: s * (W / 2 + .02), y: wy - .01, z: zr + len * i / n });
      // wheel wells
      [Lb / 2 - 2.05, -Lb / 2 + (school ? 2.5 : 2.8)].forEach(z => box(.03, .72, 1.3, mDark, { parent: g, x: s * (W / 2 + .004), y: .36, z }));
    });
    // door (left = +x for a right-hand-drive bus facing +z)
    box(.04, 2.05, .95, BM.glass, { parent: g, x: W / 2 + .008, y: .5, z: Lb / 2 - .78 });
    box(.06, 2.05, .06, mDark, { parent: g, x: W / 2 + .02, y: .5, z: Lb / 2 - .78 });
    // livery
    if (school) {
      [1.0, 1.42].forEach(y => [-1, 1].forEach(s => box(.03, .08, Lb - .7, mDark, { parent: g, x: s * (W / 2 + .01), y })));
      quad(L, rSideS, 5.2, .3, { parent: g, x: W / 2 + .02, y: 1.1, z: -.8, ry: PI / 2 });
      quad(L, rSideS, 5.2, .3, { parent: g, x: -W / 2 - .02, y: 1.1, z: -.4, ry: -PI / 2 });
      quad(L, rSchool, 1.9, .36, { parent: g, y: 2.66, z: Lb / 2 + .01 });
      quad(L, rSchool, 1.9, .36, { parent: g, y: 1.15, z: -Lb / 2 - .01, ry: PI });
    } else if (prem) {
      [-1, 1].forEach(s => { box(.03, .62, Lb - .5, BM.pearl, { parent: g, x: s * (W / 2 + .006), y: .42 }); box(.03, .06, Lb - .5, BM.gold, { parent: g, x: s * (W / 2 + .012), y: 1.04 }); });
      quad(L, rSideP, 2.0, .32, { parent: g, x: W / 2 + .03, y: 1.11, z: -2.4, ry: PI / 2 });
      quad(L, rSideP, 2.0, .32, { parent: g, x: -W / 2 - .03, y: 1.11, z: 2.4, ry: -PI / 2 });
      quad(L, rSidePW, 3.2, .3, { parent: g, x: W / 2 + .03, y: .58, z: 1.6, ry: PI / 2 });
      quad(L, rSidePW, 3.2, .3, { parent: g, x: -W / 2 - .03, y: .58, z: -1.6, ry: -PI / 2 });
    } else {
      [-1, 1].forEach(s => { box(.03, .24, Lb - .5, mYellow, { parent: g, x: s * (W / 2 + .008), y: 1.08 }); box(.03, .08, Lb - .5, mBlue, { parent: g, x: s * (W / 2 + .01), y: .96 }); });
      quad(L, rSideC, 4.4, .44, { parent: g, x: W / 2 + .02, y: .48, z: -1.6, ry: PI / 2 });
      quad(L, rSideC, 4.4, .44, { parent: g, x: -W / 2 - .02, y: .48, z: -1.2, ry: -PI / 2 });
    }
    // front: windscreen, destination board, lamps, bumper, plate
    const wsY = school ? 1.35 : prem ? 1.15 : 1.25, wsH = school ? 1.22 : prem ? 1.75 : 1.5;
    box(W - .24, wsH, .05, BM.glass, { parent: g, y: wsY, z: Lb / 2 + .003 });
    if (school) box(.08, wsH, .07, BM.yellow, { parent: g, y: wsY, z: Lb / 2 + .01 });
    if (!school) quad(U, dest[prem ? 'PREMIUM' : 'CORPORATE'], 1.9, .28, { parent: g, y: wsY + wsH + .04, z: Lb / 2 + .012 });
    [-1, 1].forEach(s => { rbox(.44, .2, .06, .05, BM.head, { parent: g, x: s * .82, y: .72, z: Lb / 2 + .01 }); rbox(.3, .2, .06, .05, BM.tail, { parent: g, x: s * .95, y: .8, z: -Lb / 2 - .01 }); });
    box(W + .04, .3, .2, mDark, { parent: g, y: .3, z: Lb / 2 - .06 }); box(W + .04, .3, .2, mDark, { parent: g, y: .3, z: -Lb / 2 + .06 });
    box(.55, .14, .03, mYellow, { parent: g, y: .42, z: Lb / 2 + .05 }); box(.55, .14, .03, mYellow, { parent: g, y: .42, z: -Lb / 2 - .05 });
    box(W - .5, .7, .05, BM.glass, { parent: g, y: 2.05, z: -Lb / 2 - .003 });
    // mirrors
    [-1, 1].forEach(s => { box(.05, .05, .45, mDark, { parent: g, x: s * 1.33, y: 2.35, z: Lb / 2 + .05 }); rbox(.12, .42, .22, .04, mDark, { parent: g, x: s * 1.42, y: 1.95, z: Lb / 2 + .28 }); });
    // roof
    if (school) [-2.4, 2.2].forEach(z => rbox(.8, .12, .8, .04, mWhite, { parent: g, y: H, z }));
    else { rbox(prem ? 1.9 : 1.6, .3, prem ? 3.4 : 2.6, .12, mWhite, { parent: g, y: H, z: -1 }); rbox(.8, .1, .8, .04, mWhite, { parent: g, y: H, z: 3 }); }
    // wheels
    [Lb / 2 - 2.05, -Lb / 2 + (school ? 2.5 : 2.8)].forEach(z => [-1, 1].forEach(s => {
      const t = new THREE.Mesh(tyreG, M.rubber); t.position.set(s * (W / 2 - .1), .5, z); g.add(t);
      const h = new THREE.Mesh(hubG, prem ? BM.gold : M.metal); h.position.set(s * (W / 2 - .1), .5, z); g.add(h);
      t.castShadow = h.castShadow = true;
    }));
    g.traverse(m => { if (m.isMesh && m.material !== L.mat && m.material !== U.mat) { m.castShadow = true; m.receiveShadow = true; } });
    g.userData.len = Lb;
    return g;
  }
  function parkBus(kind, x, z, ry, parent = S) {
    const b = busModel(kind); b.position.set(x, 0, z); b.rotation.y = ry; parent.add(b);
    const Lb = b.userData.len, ew = Math.abs(Math.sin(ry)) > .5;
    cBox(x, z, ew ? Lb + .2 : 2.7, ew ? 2.7 : Lb + .2);
    return b;
  }
  function person(x, z, ry, o = {}) {
    const shirts = [C.blue, C.red, '#8FB8DE', Y, C.white];
    return kit.person(Object.assign({ x, z, ry, parent: S, seed: Math.round(x * 13 + z * 7), skin: ['#A86B47', '#C68A62', '#8D5A3B'][Math.abs(Math.round(x + z)) % 3], shirt: shirts[Math.abs(Math.round(x * 3 + z)) % 5], pants: '#2B3442' }, o));
  }

  /* ---------------- ground ---------------- */
  const GY = .14;
  kit.plane(50, 30.5, mAsph, { parent: S, x: -92, z: 16.75, y: .04 });          // yard + driveway
  kit.plane(2.2, 7, mAsph, { parent: S, x: -66.1, z: 8, y: .04 });             // apron to the spoke road
  kit.plane(13, 4, mAsph, { parent: S, x: -110.5, z: -0.5, y: .04 });          // workshop apron
  box(39, GY, 17.5, mPave, { parent: S, x: -84.5, z: -7.25 });                 // north strip + walkway
  box(39, .17, .25, mKerb, { parent: S, x: -84.5, z: 1.4 });
  box(2.2, GY, 3, mPave, { parent: S, x: -66.1, z: 3 });                       // apron footpaths
  box(5.5, GY, 3.7, mPave, { parent: S, x: -67.75, z: 15.15 });
  box(2.2, GY, 1.9, mPave, { parent: S, x: -66.1, z: 12.4 });
  box(3.1, GY, 15, mPave, { parent: S, x: -68.95, z: 24.5 });                  // east walkway to the fuel bay
  box(.25, .17, 18.7, mKerb, { parent: S, x: -70.45, z: 22.65 });
  kit.plane(12.5, 16, mConc, { parent: S, x: -76.75, z: 22.5, y: .055 });      // fuel pad
  kit.plane(11.6, 13.2, mConc, { parent: S, x: -111, z: -9.25, y: .06 });      // workshop floor

  /* ---------------- markings ---------------- */
  const pw = (x, z, w, d, col = WH) => kit.paint(x, z, w, d, col, { parent: S, y: .04 });
  for (let i = 0; i <= 7; i++) pw(-110.25, 6 + 3.6 * i, 12.5, .15);           // column A bay lines
  pw(-116.3, 18.6, .15, 25.2);
  for (let i = 0; i <= 5; i++) pw(-90.25, 14 + 3.6 * i, 12.5, .15, i <= 3 ? '#F6C84A' : WH);  // column B (gold = premium)
  pw(-84.2, 23, .15, 18);
  pw(-96.3, 19.4, .3, 10.8, '#F6C84A');
  for (let i = 0; i < 7; i++) quad(L, rNum[i], 1.5, .85, { ground: true, x: -105.2, z: 7.8 + 3.6 * i, ry: PI / 2 });
  for (let i = 0; i < 5; i++) quad(L, rNum[7 + i], 1.5, .85, { ground: true, x: -95.4, z: 15.8 + 3.6 * i, ry: -PI / 2 });
  for (let i = 0; i < 3; i++) quad(L, rPrem, 2.8, .6, { ground: true, x: -93.6, z: 15.8 + 3.6 * i, ry: -PI / 2 });
  for (let x = -83; x > -102; x -= 3.2) pw(x, 8, 1.6, .14);                     // driveway centre dashes
  quad(L, rArrow, .9, 1.6, { ground: true, x: -88, z: 11, ry: PI / 2 });       // in lane: westbound
  quad(L, rArrow, .9, 1.6, { ground: true, x: -88, z: 5, ry: -PI / 2 });       // out lane: eastbound
  pw(-69, 11, .35, 3.9); pw(-73.7, 5, .35, 3.9);                               // stop lines
  quad(L, rSlow, 2.4, .85, { ground: true, x: -78.4, z: 11, ry: PI / 2 });
  quad(L, rStop, 2.4, .85, { ground: true, x: -75.6, z: 5, ry: -PI / 2 });
  // pedestrian route: zebra across the driveway, then a green walkway down the aisle to the premium bays
  for (let k = 0; k < 12; k++) pw(-98, 2.3 + k * .92, 2.4, .46);
  pw(-98, 22, 1.7, 18, '#5DBB63'); pw(-98.9, 22, .1, 18); pw(-97.1, 22, .1, 18);
  quad(L, rWalk, 1.6, .38, { ground: true, x: -98, z: 14.2 });
  // workshop apron keep-clear box
  pw(-111, -2.3, 6.4, .2, '#FFD23F'); pw(-111, 1.3, 6.4, .2, '#FFD23F'); pw(-114.1, -.5, .2, 3.6, '#FFD23F'); pw(-107.9, -.5, .2, 3.6, '#FFD23F');
  quad(L, rKeep, 4.2, .8, { ground: true, x: -111, z: -.5 });
  quad(L, rFuelG, 2, .7, { ground: true, x: -73, z: 15.3 });
  quad(L, rArrow, .8, 1.4, { ground: true, x: -73, z: 27.5, ry: PI });
  // speed bumps (yellow / dark bricks)
  [[-77, 11], [-77, 5]].forEach(([x, z]) => { for (let k = 0; k < 6; k++) box(.45, .08, .6, k % 2 ? mDark : mYellow, { parent: S, x, z: z - 1.5 + k * .6 }); });

  /* ---------------- boundary wall (red/white brick wall, posts) + trees ---------------- */
  function wall(x1, z1, x2, z2) {
    const along = Math.abs(x2 - x1) > Math.abs(z2 - z1), Lw = along ? Math.abs(x2 - x1) : Math.abs(z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const w = along ? Lw : .4, d = along ? .4 : Lw;
    box(w, .8, d, mWhite, { parent: S, x: mx, z: mz });
    box(along ? Lw : .5, .2, along ? .5 : Lw, mRed, { parent: S, x: mx, z: mz, y: .8 });
    const n = Math.max(1, Math.round(Lw / 6));
    for (let i = 0; i <= n; i++) { const t = i / n; rbox(.6, 1.4, .6, .06, mRed, { parent: S, x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t }); }
    cBox(mx, mz, along ? Lw : .6, along ? .6 : Lw);
  }
  wall(-67, -16.3, -117.3, -16.3); wall(-117.3, -16.3, -117.3, 32.3); wall(-117.3, 32.3, -67.1, 32.3);
  wall(-67.1, 17.2, -67.1, 32.3); wall(-67.1, -16.3, -67.1, -6);
  for (let x = -70; x > -117; x -= 5.6) kit.tree(x, -17.4, { s: .9, kind: (Math.round(x) % 2) ? 'round' : 'cone' });
  for (let z = -13; z < 32; z += 5.8) kit.tree(-118.5, z, { s: .85, kind: (Math.round(z) % 2) ? 'cone' : 'round' });
  for (let x = -71; x > -117; x -= 6.2) kit.tree(x, 33.4, { s: .8 });
  for (let z = 20; z < 32; z += 4) kit.bush(-66.1, z, { s: .9 });
  // lamps (pooled): walkway edge pointing at the driveway, margins pointing into the yard
  [-78.6, -95.4].forEach(x => { kit.lamp(x, 1.0); cCir(x, 1.0, .3); });
  [2, 14, 26].forEach(z => kit.lamp(-118.4, z, { ry: PI / 2 }));
  [-77, -93, -109].forEach(x => kit.lamp(x, 33.3, { ry: PI }));
  // high-mast yard lights
  [[-100.25, 31.2], [-83.6, 13.5]].forEach(([x, z]) => {
    cyl(.55, .6, .4, mConc, { parent: S, x, z });
    cyl(.12, .2, 11, mDGrey, { parent: S, x, z, y: .4 });
    box(2, .18, .25, mDGrey, { parent: S, x, z, y: 11.2 });
    [-.7, 0, .7].forEach(dx => box(.5, .3, .5, mWarm, { parent: S, x: x + dx, z, y: 10.9 }));
    cCir(x, z, .65);
  });

  /* ---------------- gate: arch, boom barriers, guard booth, pylon ---------------- */
  const GX = -70.6;
  [2.4, 13.6].forEach(z => {
    rbox(1.1, 5.2, 1.1, .08, mRed, { parent: S, x: GX, z, y: .04 });
    for (let k = 0; k < 4; k++) box(1.14, .3, 1.14, k % 2 ? mDark : mYellow, { parent: S, x: GX, z, y: .1 + k * .3 });
    cCir(GX, z, .75);
  });
  rbox(1.2, 1.6, 12.4, .1, mWhite, { parent: S, x: GX, z: 8, y: 5.1 });
  box(1.26, .3, 12.46, mYellow, { parent: S, x: GX, z: 8, y: 5.0 });
  box(1.26, .2, 12.46, mBlue, { parent: S, x: GX, z: 8, y: 6.7 });
  quad(U, rGateE, 10.6, 1.27, { x: GX + .61, y: 5.3, z: 8, ry: PI / 2 });
  quad(U, rGateW, 7.2, 1.03, { x: GX - .61, y: 5.4, z: 8, ry: -PI / 2 });
  // median island with the guard booth
  box(10.6, .2, 1.6, mConc, { parent: S, x: -74.7, z: 8 });
  for (let k = 0; k < 4; k++) box(.4, .22, 1.62, k % 2 ? mDark : mYellow, { parent: S, x: -69.6 - k * .4, z: 8 });
  cBox(-74.7, 8, 10.6, 1.7);
  {
    const bx = -74.4;
    box(1.8, 1.0, 1.4, mWhite, { parent: S, x: bx, z: 8, y: .2 });
    box(1.82, 1.1, 1.42, mGlass, { parent: S, x: bx, z: 8, y: 1.2 });
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => box(.12, 1.1, .12, mBlue, { parent: S, x: bx + sx * .85, z: 8 + sz * .65, y: 1.2 })));
    box(1.8, .3, 1.4, mWhite, { parent: S, x: bx, z: 8, y: 2.3 });
    rbox(2.3, .25, 1.9, .05, mBlue, { parent: S, x: bx, z: 8, y: 2.6 });
    quad(U, rSec, 1.3, .27, { x: bx + .91, y: 2.32, z: 8, ry: PI / 2 });
    person(bx - 1.5, 8, PI / 2, { y: .2, shirt: C.blue, pants: '#1F2A44' });
    // speed sign
    cyl(.04, .04, 1.8, mDGrey, { parent: S, x: -79.5, z: 8, y: .2 });
    box(.7, .7, .05, mWhite, { parent: S, x: -79.5, z: 8, y: 2.0, ry: PI / 2 });
    quad(U, rSpeed, .66, .66, { x: -79.5 + .03, y: 2.02, z: 8, ry: PI / 2 });
  }
  // boom barriers (dynamic)
  const BX = -71.9, arms = [];
  [[7.3, -1], [8.7, 1]].forEach(([z, dir]) => {
    rbox(.45, 1.15, .45, .06, mYellow, { parent: S, x: BX, z: z - dir * .25, y: .2 });
    rbox(.3, .9, .3, .05, mRed, { parent: S, x: BX, z: z + dir * 4.3, y: .04 });                // rest post at the lane edge
    const pv = new THREE.Group(); pv.position.set(BX, 1.15, z); root.add(pv);
    for (let k = 0; k < 8; k++) box(.1, .14, .5, k % 2 ? mWhite : mRed, { parent: pv, z: dir * (.25 + k * .5), y: -.07 });
    box(.16, .22, .4, mDGrey, { parent: pv, z: -dir * .25, y: -.11 });
    kit.bake(pv); pv.userData.dynamic = true; arms.push({ g: pv, dir });
  });
  // pylon sign facing the road (south-east)
  {
    const g = new THREE.Group(); g.position.set(-68.7, GY, -3.9); g.rotation.y = PI / 4; S.add(g);
    rbox(2.4, .5, 1, .06, mGrey, { parent: g });
    rbox(1.9, 6.6, .5, .08, mWhite, { parent: g, y: .5 });
    rbox(2, .8, .6, .08, mYellow, { parent: g, y: 7.1 });
    rbox(2, .3, .6, .06, mRed, { parent: g, y: .5 });
    quad(U, rPylon, 1.7, 4.0, { parent: g, y: 2.9, z: .26 });
    quad(U, rPylon, 1.7, 4.0, { parent: g, y: 2.9, z: -.26, ry: PI });
    cCir(-68.7, -3.9, 1.25);
    [[-67.9, -7], [-69, -9.5], [-68, -12], [-69.2, -14.4]].forEach(([x, z]) => kit.bush(x, z, { s: .9 }));
  }

  /* ---------------- depot office (2 storeys) + contracts desk ---------------- */
  {
    const of = new THREE.Group(); of.position.set(-77, GY, -9); S.add(of);   // local x -7..7, z -6..6 (front = +z)
    box(14.4, .3, 12.4, mGrey, { parent: of });
    rbox(7, 3.4, 12, .06, mWhite, { parent: of, x: 3.5, y: .3 });                  // ground floor east block
    rbox(7, 3.4, 6.5, .06, mWhite, { parent: of, x: -3.5, y: .3, z: -2.75 });       // ground floor west back block
    rbox(14, 3.3, 12, .08, mWhite, { parent: of, y: 3.7 });                          // upper floor
    box(14.1, .35, 12.1, mYellow, { parent: of, y: 3.55 });
    box(14.1, .25, 12.1, mRed, { parent: of, y: .3 });
    box(14.4, .6, .35, mRed, { parent: of, y: 7.0, z: 5.95 }); box(14.4, .6, .35, mRed, { parent: of, y: 7.0, z: -5.95 });
    box(.35, .6, 12, mRed, { parent: of, y: 7.0, x: 6.95 }); box(.35, .6, 12, mRed, { parent: of, y: 7.0, x: -6.95 });
    box(13.5, .06, 11.5, mGrey, { parent: of, y: 7.0 });
    if (hi) { rbox(1.6, 1, 1.2, .06, mWhite, { parent: of, x: 3, y: 7.05, z: -2 }); rbox(1.6, 1, 1.2, .06, mWhite, { parent: of, x: -1, y: 7.05, z: -3 }); cyl(.7, .7, 1.4, mBlue, { parent: of, x: -4.5, y: 7.05, z: -3 }); }
    // chunky window panels: frame brick + transparent-blue panel
    const win = (x, y, z, w, h, ry = 0, frame = mBlue) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; of.add(g);
      box(w + .24, h + .24, .12, frame, { parent: g, y: -.12 });
      box(w, h, .16, mGlass, { parent: g, z: .02 });
      box(.1, h, .18, frame, { parent: g, z: .02 });
      box(w + .4, .14, .3, mWhite, { parent: g, y: -.26, z: .1 });
    };
    for (let i = 0; i < 5; i++) win(-5.6 + i * 2.8, 4.45, 6.02, 1.8, 1.55);           // front upper
    for (let i = 0; i < 5; i++) win(-5.6 + i * 2.8, 4.45, -6.02, 1.8, 1.55, PI);      // back upper
    for (let i = 0; i < 4; i++) { win(7.02, 4.45, -4.5 + i * 3, 1.8, 1.55, PI / 2); win(-7.02, 4.45, -4.5 + i * 3, 1.8, 1.55, -PI / 2); }
    for (let i = 0; i < 4; i++) win(7.02, 1.1, -4.5 + i * 3, 1.6, 1.4, PI / 2);
    win(1.15, 1.0, 6.02, 1.3, 1.5); win(5.9, 1.0, 6.02, 1.3, 1.5);
    // reception door + canopy + steps
    box(2.6, 2.75, .2, mRed, { parent: of, x: 3.5, y: .3, z: 6.02 });
    box(2.1, 2.45, .12, mGlass, { parent: of, x: 3.5, y: .32, z: 6.12 });
    box(.08, 2.45, .16, mRed, { parent: of, x: 3.5, y: .32, z: 6.14 });
    box(3.8, .24, 1.7, mYellow, { parent: of, x: 3.5, y: 3.0, z: 6.85 });
    quad(U, rRecep, 2.4, .42, { parent: of, x: 3.5, y: 3.26, z: 7.71 });
    box(2.6, .46, .1, mYellow, { parent: of, x: 3.5, y: 3.22, z: 7.66 });
    box(3.4, .15, 1.0, mGrey, { parent: of, x: 3.5, y: -.0, z: 6.9 });
    // contracts desk room (local x -7..0, z .5..6), glass-fronted
    kit.plane(6.9, 5.4, M.tiles, { parent: of, x: -3.5, z: 3.25, y: .31 });
    box(.25, 3.4, 5.5, mWhite, { parent: of, x: -6.875, y: .3, z: 3.25 });
    box(6.8, 3.3, .05, mGlass, { parent: of, x: -3.5, y: .35, z: 5.96 });
    [-6.9, -5.2, -3.5, -1.8, -.1].forEach(x => box(.14, 3.36, .16, mBlue, { parent: of, x, y: .32, z: 5.96 }));
    box(6.9, .14, .16, mBlue, { parent: of, x: -3.5, y: 2.72, z: 5.96 });
    box(6.9, .2, .18, mBlue, { parent: of, x: -3.5, y: .3, z: 5.96 });
    quad(U, rContr, 3.1, .42, { parent: of, x: -3.5, y: 2.92, z: 6.06 });
    [-5, -2].forEach(x => box(1.4, .04, .7, mWarm, { parent: of, x, y: 3.64, z: 3.2 }));
    quad(U, rClient, 5.9, 2.1, { parent: of, x: -3.5, y: 1.05, z: .52 });
    // table, chairs, folders
    rbox(3.4, .1, 1.3, .03, mTan, { parent: of, x: -3.5, y: 1.02, z: 3.3 });
    box(.4, .72, .8, mDGrey, { parent: of, x: -3.5, y: .3, z: 3.3 });
    if (hi) {
      [-4.7, -3.5, -2.3].forEach(x => [[2.3, 0], [4.3, PI]].forEach(([z, ry]) => {
        const cg = new THREE.Group(); cg.position.set(x, .3, z); cg.rotation.y = ry; of.add(cg);
        rbox(.5, .1, .48, .03, mRed, { parent: cg, y: .42 }); rbox(.5, .55, .08, .03, mRed, { parent: cg, y: .5, z: -.22 }); box(.08, .42, .08, mDGrey, { parent: cg });
      }));
      [[-4.4, C.blue], [-3.7, Y], [-3.0, C.red], [-2.4, C.green]].forEach(([x, c], i) => box(.32, .05 + (i % 2) * .04, .24, M.std(c, { rough: .5 }), { parent: of, x, y: 1.12, z: 3.0 + (i % 2) * .5 }));
      box(.3, 2.0, 2.4, mTan, { parent: of, x: -6.55, y: .31, z: 3.4 });
      for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) box(.24, .32, .26, M.std([C.blue, Y, C.red][(r + k) % 3], { rough: .5 }), { parent: of, x: -6.32, y: .5 + r * .62, z: 2.4 + k * .32 });
      kit.person({ parent: of, pose: 'sit', x: -4.7, y: .3, z: 4.3, ry: PI, seed: 21, shirt: C.white, pants: '#1F2A44', skin: '#C68A62' });
      kit.person({ parent: of, pose: 'sit', x: -2.3, y: .3, z: 2.3, ry: 0, seed: 22, shirt: C.blue, pants: '#2B3442', skin: '#A86B47' });
    }
    // signs
    quad(U, rOffice, 9.2, .86, { parent: of, y: 6.12, z: 6.07 });
    box(9.4, 1.0, .1, mWhite, { parent: of, y: 6.05, z: 6.02 });
    quad(U, rOffice, 6.4, .6, { parent: of, x: 7.1, y: 6.3, z: 0, ry: PI / 2 });
    kit.bush(-70.9, -2.4, { s: .8 }); kit.bush(-75.8, -2.4, { s: .8 }); kit.bush(-83.4, -2.4, { s: .8 });
    cCir(-70.9, -2.4, .6); cCir(-75.8, -2.4, .6); cCir(-83.4, -2.4, .6);
    if (hi) for (let i = 0; i < 4; i++) kit.scooter({ parent: S, x: -68.5, z: -6.8 - i * 1.3, y: GY, ry: PI / 2, box: false, color: [C.red, C.blue, Y, C.green][i] });
    cBox(-77, -9, 14.6, 12.5);
  }

  /* ---------------- dispatch tower + crew briefing ---------------- */
  const screen = { x: -88.5, y: GY + 1.0, z: -5.85, w: 3.4, h: 2.0 };
  {
    const tw = new THREE.Group(); tw.position.set(-88.5, GY, -8); S.add(tw);
    rbox(4, 4.2, 4, .06, mWhite, { parent: tw });
    box(4.06, .3, 4.06, mRed, { parent: tw, y: 0 });
    box(.1, 2.3, 1.1, mBlue, { parent: tw, x: 2.02, y: .2, z: 1 });
    rbox(3.7, 2.3, .16, .05, mDGrey, { parent: tw, y: .85, z: 2.04 });
    quad(U, rMap, screen.w, screen.h, { parent: tw, y: 1.0, z: 2.14 });
    rbox(5.8, .35, 5.8, .05, mYellow, { parent: tw, y: 4.2 });
    box(5.5, .65, 5.5, mWhite, { parent: tw, y: 4.55 });
    [[0, 2.72, 5.5, .05], [0, -2.72, 5.5, .05], [2.72, 0, .05, 5.5], [-2.72, 0, .05, 5.5]].forEach(([x, z, w, d]) => box(w, 1.75, d, mGlass, { parent: tw, x, z, y: 5.2 }));
    [[-2.7, -2.7], [2.7, -2.7], [-2.7, 2.7], [2.7, 2.7], [0, 2.72], [0, -2.72], [2.72, 0], [-2.72, 0]].forEach(([x, z]) => box(.16, 1.75, .16, mBlue, { parent: tw, x, z, y: 5.2 }));
    quad(U, rMap, 2.4, 1.0, { parent: tw, x: -.9, y: 5.35, z: -2.62 });
    quad(U, rSched, 1.6, 1.0, { parent: tw, x: 1.5, y: 5.35, z: -2.62 });
    rbox(3.6, .1, .7, .03, mTan, { parent: tw, y: 5.9, z: -1.7 });
    if (hi) { kit.person({ parent: tw, pose: 'sit', x: -.8, y: 5.2, z: -.9, ry: PI, seed: 31, shirt: '#8FB8DE', pants: '#2B3442', skin: '#A86B47' }); kit.person({ parent: tw, pose: 'sit', x: 1, y: 5.2, z: -.9, ry: PI, seed: 32, shirt: C.white, pants: '#2B3442', skin: '#C68A62' }); }
    rbox(6.5, .5, 6.5, .08, mWhite, { parent: tw, y: 6.95 });
    box(6.56, .14, 6.56, mBlue, { parent: tw, y: 7.45 });
    quad(U, rDisp, 4.6, .4, { parent: tw, y: 7.0, z: 3.26 });
    quad(U, rDisp, 4.6, .4, { parent: tw, x: 3.26, y: 7.0, ry: PI / 2 });
    cyl(.05, .05, 2.4, mDGrey, { parent: tw, x: 2.2, y: 7.59, z: -2.2 });
    cyl(.32, .32, .25, mWhite, { parent: tw, x: -2, y: 7.59, z: -2 }); kit.sphere(.3, mWhite, { parent: tw, x: -2, y: 7.7, z: -2 });
    rbox(.5, .5, .5, .06, mRed, { parent: tw, x: 2.2, y: 9.95, z: -2.2 });
    // stair up the east side
    if (hi) {
      for (let i = 0; i < 14; i++) box(.85, .1, .32, mDGrey, { parent: tw, x: 3.25, y: .3 * (i + 1), z: 2.4 - i * .33 });
      [2.82, 3.68].forEach(x => { const r = box(.06, .06, 6.2, mYellow, { parent: tw, x, y: 3.1, z: .1 }); r.rotation.x = Math.atan2(4.2, 4.6); });
      box(.85, .12, 1, mDGrey, { parent: tw, x: 3.25, y: 4.2, z: -2.6 });
    }
    cBox(-88.5, -8, 4.3, 4.3); cBox(-85.25, -8.4, 1.1, 5.6);
  }
  {
    const bx = -95.3, bz = -8.8;
    [[-92.4, -5.2], [-98.2, -5.2], [-92.4, -12.2], [-98.2, -12.2]].forEach(([x, z]) => { cyl(.12, .12, 3.2, mRed, { parent: S, x, z, y: GY }); cCir(x, z, .25); });
    rbox(6.9, .3, 7.8, .06, mYellow, { parent: S, x: bx, z: bz, y: 3.3 });
    box(6.6, 2.9, .3, mWhite, { parent: S, x: bx, z: -12.45, y: GY });
    box(6.6, .25, .32, mBlue, { parent: S, x: bx, z: -12.45, y: GY + 2.9 });
    rbox(3.9, 1.7, .1, .03, mDGrey, { parent: S, x: bx, z: -12.25, y: GY + .9 });
    quad(U, rBoard, 3.7, 1.52, { x: bx, y: GY + .99, z: -12.19 });
    cBox(bx, -12.4, 6.7, .6);
    [[-93.4, -8.4], [-94.7, -8.9], [-96.0, -8.3], [-97.2, -9.0]].forEach(([x, z], i) => person(x, z, PI, { y: GY, shirt: i % 2 ? '#8FB8DE' : C.tan, seed: 40 + i }));
    if (hi) person(-93.2, -11.2, 0, { y: GY, shirt: C.white, seed: 49 });
    kit.bench(-97.6, -6.2, { ry: PI });
  }

  /* ---------------- records office ---------------- */
  {
    const rc = new THREE.Group(); rc.position.set(-101.75, GY, -9); S.add(rc);   // local x ±2.75, front z +5
    box(5.9, .25, 10.2, mGrey, { parent: rc });
    rbox(5.5, 3.6, 8.6, .06, mBlue, { parent: rc, y: .25, z: -.7 });
    box(.25, 3.6, 1.4, mBlue, { parent: rc, x: 2.63, y: .25, z: 4.3 }); box(.25, 3.6, 1.4, mBlue, { parent: rc, x: -2.63, y: .25, z: 4.3 });
    kit.plane(5.2, 1.4, M.tiles, { parent: rc, z: 4.3, y: .26 });
    rbox(5.9, .4, 10.4, .06, mWhite, { parent: rc, y: 3.85 });
    box(5.5, .25, 1.4, mWhite, { parent: rc, y: 3.6, z: 4.3 });
    // door (left) + big window (right) showing shelves turning into a screen
    box(1.2, 2.5, .2, mWhite, { parent: rc, x: -1.95, y: .25, z: 4.95 });
    box(.95, 2.3, .1, mYellow, { parent: rc, x: -1.95, y: .27, z: 5.02 });
    box(3.9, .7, .2, mWhite, { parent: rc, x: .75, y: .25, z: 4.95 });
    box(3.8, 2.2, .05, mGlass, { parent: rc, x: .75, y: .95, z: 4.98 });
    [-1.2, .75, 2.7].forEach(x => box(.14, 2.3, .16, mWhite, { parent: rc, x, y: .92, z: 4.98 }));
    box(3.9, .14, .16, mWhite, { parent: rc, x: .75, y: 3.12, z: 4.98 });
    box(1.1, 2.6, .35, mTan, { parent: rc, x: -.6, y: .26, z: 3.85 });
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) box(.2, .34, .26, M.std([C.red, Y, C.green, C.blue][(r + k) % 4], { rough: .5 }), { parent: rc, x: -.95 + k * .24, y: .45 + r * .6, z: 3.95 });
    box(.9, 1.4, .35, mTan, { parent: rc, x: .5, y: .26, z: 3.85 });
    for (let k = 0; k < 2; k++) box(.2, .34, .26, M.std(C.red, { rough: .5 }), { parent: rc, x: .3 + k * .24, y: 1.05, z: 3.95 });
    box(1.3, .06, .6, mWhite, { parent: rc, x: 1.85, y: 1.0, z: 4.0 });
    box(.08, .3, .08, mDGrey, { parent: rc, x: 1.85, y: 1.06, z: 3.9 });
    rbox(1.2, .78, .06, .02, mDark, { parent: rc, x: 1.85, y: 1.3, z: 3.86 });
    quad(U, rRecMon, 1.08, .66, { parent: rc, x: 1.85, y: 1.36, z: 3.9 });
    box(1.2, .04, .5, mWarm, { parent: rc, x: .6, y: 3.57, z: 4.2 });
    box(4.4, .58, .08, mWhite, { parent: rc, x: 0, y: 3.15, z: 5.06 });
    quad(U, rRecSign, 4.2, .5, { parent: rc, y: 3.19, z: 5.11 });
    if (hi) rbox(.9, .6, .35, .05, mWhite, { parent: rc, x: 3.0, y: 2.2, z: -1 });
    cyl(.32, .3, .9, mBlue, { parent: S, x: -104.1, z: -3.5, y: GY }); cCir(-104.1, -3.5, .4);
    cBox(-101.75, -9.2, 5.9, 10.2);
  }

  /* ---------------- maintenance shed (open roller door, bus on a service pit) ---------------- */
  {
    const sh = new THREE.Group(); sh.position.set(-111, 0, -9.25); S.add(sh);   // local x ±6, z ±6.75; front +z
    const clad = M.tex('roof', '#F1EEE6', { rough: .6 });
    box(12, 6, .3, clad, { parent: sh, z: -6.6 });
    box(.3, 6, 13.5, clad, { parent: sh, x: -5.85 }); box(.3, 6, 13.5, clad, { parent: sh, x: 5.85 });
    box(3, 6, .3, clad, { parent: sh, x: -4.5, z: 6.6 }); box(3, 6, .3, clad, { parent: sh, x: 4.5, z: 6.6 });
    box(6, 1, .3, clad, { parent: sh, y: 5, z: 6.6 });
    box(12.1, .4, 13.6, mRed, { parent: sh, y: 0 });
    box(12.1, .3, .34, mYellow, { parent: sh, y: 6, z: 6.6 });
    for (let k = 0; k < 10; k++) [-3.05, 3.05].forEach(x => box(.14, .5, .34, k % 2 ? mDark : mYellow, { parent: sh, x, y: k * .5, z: 6.62 }));
    // roof: two red slopes + gable ends
    const th = Math.atan2(1.6, 6);
    [-1, 1].forEach(s => { const r = box(6.5, .2, 14.2, mRed, { parent: sh, x: s * 3.05, y: 6.75 }); r.rotation.z = -s * th; });
    [6.6, -6.6].forEach(z => { const sp = new THREE.Shape([new THREE.Vector2(-6, 0), new THREE.Vector2(6, 0), new THREE.Vector2(0, 1.6)]); const geo = new THREE.ExtrudeGeometry(sp, { depth: .3, bevelEnabled: false }); geo.translate(0, 0, -.15); kit.worldUV(geo, 2); const m = new THREE.Mesh(geo, clad); m.position.set(0, 6, z); m.castShadow = m.receiveShadow = true; sh.add(m); });
    // roller shutter rolled up
    box(6.2, .6, .6, mGrey, { parent: sh, y: 4.75, z: 6.15 });
    box(6, .45, .06, mGrey, { parent: sh, y: 4.35, z: 6.45 });
    quad(U, rWork, 5.4, .6, { parent: sh, y: 5.22, z: 6.77 });
    [-3, 0, 3].forEach(x => box(.18, .06, 11, mWarm, { parent: sh, x, y: 5.85 }));
    // service pit + bus
    kit.paint(0, 0, 1.2, 9.5, '#2A2C30', { parent: sh, y: .06 });
    kit.paint(-.7, 0, .15, 9.5, '#FFD23F', { parent: sh, y: .065 }); kit.paint(.7, 0, .15, 9.5, '#FFD23F', { parent: sh, y: .065 });
    parkBus('coach', -111, -9.15, 0);
    person(-108.4, -4.6, -PI / 2, { shirt: C.blue, pants: C.blue, seed: 61 });
    rbox(.8, .9, .5, .05, mRed, { parent: sh, x: 2.6, z: 3.8 }); cCir(-108.4, -5.45, .5);
    // workbench + pegboard on the east wall, tyre stacks on the west wall
    box(.8, .9, 3.6, mTan, { parent: sh, x: 5.25, z: -2 });
    quad(U, rPeg, 3.4, 1.5, { parent: sh, x: 5.69, y: 1.25, z: -2, ry: -PI / 2 });
    cBox(-105.75, -11.25, 1, 3.8);
    const tyres = hi ? [[-5, 2.5, 4], [-5, 1.3, 3], [-5, -3.5, 4]] : [[-5, 2.5, 3]];
    tyres.forEach(([x, z, n]) => { for (let k = 0; k < n; k++) cyl(.5, .5, .3, M.rubber, { parent: sh, x, z, y: k * .31, seg: low ? 10 : 16 }); });
    cBox(-116, -8.2, 1.2, 7.8);
    // outside: old tyres + oil drums on the apron corner
    for (let k = 0; k < 3; k++) cyl(.5, .5, .3, M.rubber, { parent: S, x: -115.9, z: -.9, y: .05 + k * .31, seg: low ? 10 : 16 });
    [[-116, .6, C.blue], [-115, .8, C.red]].forEach(([x, z, c]) => cyl(.32, .32, .9, M.std(c, { rough: .5 }), { parent: S, x, z, y: .05 }));
    cCir(-115.9, -.9, .6); cCir(-115.5, .7, .8);
    cBox(-111, -15.85, 12, .5); cBox(-116.85, -9.25, .5, 13.5); cBox(-105.15, -9.25, .5, 13.5);
    cBox(-115.5, -2.65, 3, .5); cBox(-106.5, -2.65, 3, .5);
  }

  /* ---------------- fuel island ---------------- */
  {
    const fu = new THREE.Group(); fu.position.set(-76.3, 0, 22); S.add(fu);
    rbox(1.5, .24, 11.5, .06, mGrey, { parent: fu, y: .05 });
    [-5.75, 5.75].forEach(z => rbox(1.54, .28, .6, .06, mYellow, { parent: fu, y: .05, z }));
    [-3.6, 3.6].forEach(z => { cyl(.32, .32, 5.0, mWhite, { parent: fu, z, y: .29 }); cyl(.38, .38, .6, mRed, { parent: fu, z, y: .29 }); });
    rbox(11, .9, 14, .1, mWhite, { parent: fu, y: 5.2 });
    box(11.06, .26, 14.06, mYellow, { parent: fu, y: 5.5 });
    box(11.06, .12, 14.06, mRed, { parent: fu, y: 5.25 });
    for (let i = -1; i <= 1; i++) [-2.6, 2.6].forEach(x => box(1.5, .04, 1.2, mWarm, { parent: fu, x, y: 5.17, z: i * 4.2 }));
    quad(U, rFuel, 5.4, .6, { parent: fu, y: 5.82, z: 7.04 });
    quad(U, rFuel, 5.4, .6, { parent: fu, y: 5.82, x: 5.54, ry: PI / 2 });
    quad(U, rFuel, 5.4, .6, { parent: fu, y: 5.82, z: -7.04, ry: PI });
    [-2.5, 2.5].forEach(z => {
      rbox(.7, 1.9, 1.0, .06, mWhite, { parent: fu, y: .29, z });
      rbox(.76, .32, 1.06, .06, mRed, { parent: fu, y: 2.19, z });
      [-1, 1].forEach(s => { quad(U, rPump, .52, .4, { parent: fu, x: s * .36, y: 1.3, z, ry: s * PI / 2 }); box(.1, .3, .16, mDark, { parent: fu, x: s * .39, y: .9, z: z + .3 }); });
    });
    // hose from pump 1 to the bus fuel cap
    { const a = new THREE.Vector3(-.4, 1.1, -2.2), b = new THREE.Vector3(-1.62, .95, -1.4), mid = a.clone().add(b).multiplyScalar(.5), len = a.distanceTo(b);
      const h = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, len, 6), mDark); h.position.copy(mid); h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); h.castShadow = true; fu.add(h); }
    person(-76.5, 20.6, -PI / 2, { y: .29, shirt: C.red, seed: 71 });
    cyl(.14, .14, .5, mRed, { parent: fu, x: .3, z: -3.6, y: .6 });
    if (hi) [[-1.5, 6.5], [-3, 6.5], [-4.5, 6.5]].forEach(([x, z]) => cyl(.3, .3, .04, mDGrey, { parent: fu, x: x + 4.3, z, y: .06 }));
    parkBus('school', -79.25, 21.7, 0);
    cBox(-76.3, 22, 1.7, 11.8);
  }

  /* ---------------- parked fleet ---------------- */
  const aKinds = ['school', null, 'school', 'coach', 'school', 'school', 'school'];
  aKinds.forEach((k, i) => {
    const z = 7.8 + 3.6 * i;
    if (hi) box(.25, .14, 1.8, mYellow, { parent: S, x: -115.5, z });
    if (!k) return;
    const Lb = k === 'school' ? 11 : 12;
    parkBus(k, -116.1 + Lb / 2, z + (i % 2 ? .06 : -.05), -PI / 2);
  });
  ['premium', 'premium', 'premium', 'coach', 'coach'].forEach((k, i) => {
    const z = 15.8 + 3.6 * i;
    if (hi) box(.25, .14, 1.8, mYellow, { parent: S, x: -85, z });
    parkBus(k, -84.5 - 6, z + (i % 2 ? -.05 : .05), PI / 2);
  });

  /* ---------------- dynamic: bus easing into bay 02, screen dot, walking driver ---------------- */
  const mv = new THREE.Group(); mv.userData.dynamic = true;
  if (hi) { mv.add(busModel('school')); root.add(mv); kit.bake(mv); mv.userData.dynamic = true; }
  const path = new THREE.CurvePath();
  path.add(new THREE.CubicBezierCurve3(new THREE.Vector3(-84, 0, 5.2), new THREE.Vector3(-97, 0, 5.2), new THREE.Vector3(-97, 0, 11.4), new THREE.Vector3(-104, 0, 11.4)));
  path.add(new THREE.LineCurve3(new THREE.Vector3(-104, 0, 11.4), new THREE.Vector3(-110.6, 0, 11.4)));
  const N = 160, PX = new Float32Array(N + 1), PZ = new Float32Array(N + 1), PR = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) { const p = path.getPointAt(i / N), t = path.getTangentAt(i / N); PX[i] = p.x; PZ[i] = p.z; PR[i] = Math.atan2(t.x, t.z); }
  const setBus = u => { const f = Math.max(0, Math.min(1, u)) * N, i = Math.min(N - 1, Math.floor(f)), k = f - i; mv.position.set(PX[i] + (PX[i + 1] - PX[i]) * k, 0, PZ[i] + (PZ[i + 1] - PZ[i]) * k); mv.rotation.y = PR[i] + (PR[i + 1] - PR[i]) * k; };
  setBus(0);
  const ease = x => x * x * (3 - 2 * x);

  let dot = null;
  if (hi) {
    dot = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .03), M.emit('#FF5A1F', 1.2)); dot.userData.dynamic = true; root.add(dot);
  }
  const top = .14;   // header fraction of the map
  const dotPts = mapPts.map(([u, v]) => [screen.x - screen.w / 2 + u * screen.w, screen.y + screen.h - (top + v * (1 - top)) * screen.h]);
  const dotLen = []; let dsum = 0; for (let i = 1; i < dotPts.length; i++) { dsum += Math.hypot(dotPts[i][0] - dotPts[i - 1][0], dotPts[i][1] - dotPts[i - 1][1]); dotLen.push(dsum); }

  let walker = null;
  if (hi) {
    walker = new THREE.Group(); root.add(walker);
    kit.person({ parent: walker, seed: 88, shirt: '#8FB8DE', pants: '#2B3442', skin: '#A86B47' });
    kit.bake(walker); walker.userData.dynamic = true;
  }

  /* ---------------- spots ---------------- */
  spots.push(
    { id: 'main', x: -73.5, z: -.4, y: 4.6 },
    { id: 'contracts', x: -80.6, z: -.4, y: 4.2 },
    { id: 'dispatch', x: -90.4, z: -1.8, y: 4.8 },
    { id: 'records', x: -101.6, z: -1.3, y: 4.4 },
    { id: 'fleet', x: -98.0, z: 19.4, y: 4.8 },
    { id: 'fuel', x: -73.0, z: 21.0, y: 3.4 },
  );

  kit.bake(S);

  return {
    group: root, colliders, spots,
    update(dt, t) {
      // boom barriers: each lifts for a few seconds every 16 s, offset from each other
      for (let i = 0; i < arms.length; i++) {
        const c = (t + i * 8) % 16, a = c < 1.6 ? ease(c / 1.6) : c < 5.5 ? 1 : c < 7.1 ? 1 - ease((c - 5.5) / 1.6) : 0;
        arms[i].g.rotation.x = -arms[i].dir * a * 1.45;
      }
      // bus: wait at the dispatch line, ease into bay 02, park, reverse out
      const c = t % 46;
      setBus(c < 6 ? 0 : c < 21 ? ease((c - 6) / 15) : c < 33 ? 1 : 1 - ease((c - 33) / 13));
      if (dot) {
        const d = ((t * .35) % dsum);
        let i = 0; while (i < dotLen.length - 1 && dotLen[i] < d) i++;
        const s0 = i ? dotLen[i - 1] : 0, k = (d - s0) / (dotLen[i] - s0 || 1), a = dotPts[i], b = dotPts[i + 1];
        dot.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, screen.z + .06);
      }
      if (walker) {
        const span = 17, c2 = (t * 1.1) % (span * 2), fwd = c2 < span, x = fwd ? -79 - c2 : -96 + (c2 - span);
        walker.position.set(x, GY + Math.abs(Math.sin(t * 6)) * .04, -.9); walker.rotation.y = fwd ? -PI / 2 : PI / 2;
      }
    },
  };
}
