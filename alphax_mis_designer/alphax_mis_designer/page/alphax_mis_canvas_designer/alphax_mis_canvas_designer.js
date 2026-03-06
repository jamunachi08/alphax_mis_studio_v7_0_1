frappe.pages['alphax-mis-canvas-designer'].on_page_load = function(wrapper) {
  frappe.ui.make_app_page({ parent: wrapper, title: __('AlphaX MIS Canvas Designer (v6.6 Reality Bender)'), single_column: true });
  const $main = $(wrapper).find('.layout-main-section');

  const state = {
    vt_doc: null,
    layout: { version: 6, widgets: [] },
    current_layout_name: null,
    drag: null,
    resize: null,
    group_resize: null,
    ghost: null,
    selected: new Set(),
    clipboard: null,
    guides: { lines: [] },
    history: [],
    hist_i: -1
  };

  $main.html(`
    <div class="alphax-canvas-designer">
      <div class="alphax-canvas-toolbar alphax-no-print" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn btn-default" id="tour">${__('Help')}</button>
        <button class="btn btn-default" id="open_canvas">${__('Open Canvas')}</button>

        <span class="text-muted" style="margin-left:6px;">|</span>

        <button class="btn btn-default" id="undo">${__('Undo')}</button>
        <button class="btn btn-default" id="redo">${__('Redo')}</button>

        <span class="text-muted">|</span>

        <button class="btn btn-default" id="lock_pos">${__('Lock Pos')}</button>
        <button class="btn btn-default" id="lock_size">${__('Lock Size')}</button>
        <button class="btn btn-default" id="unlock">${__('Unlock')}</button>

        <span class="text-muted">|</span>

        <button class="btn btn-default" id="front">${__('Bring Front')}</button>
        <button class="btn btn-default" id="back">${__('Send Back')}</button>

        <span class="text-muted">|</span>

        <button class="btn btn-default" id="align_left">${__('Align Left')}</button>
        <button class="btn btn-default" id="align_top">${__('Align Top')}</button>
        <button class="btn btn-default" id="dist_h">${__('Distribute H')}</button>
        <button class="btn btn-default" id="dist_v">${__('Distribute V')}</button>

        <span class="text-muted">|</span>

        <button class="btn btn-default" id="copy">${__('Copy')}</button>
        <button class="btn btn-default" id="paste">${__('Paste')}</button>
        <button class="btn btn-default" id="export">${__('Export JSON')}</button>
        <button class="btn btn-default" id="import">${__('Import JSON')}</button>

        <span style="flex:1;"></span>

        <button class="btn btn-default" id="dup_layout">${__('Duplicate Layout')}</button>
        <button class="btn btn-default" id="load">${__('Load Layout')}</button>
        <button class="btn btn-primary" id="save">${__('Save Layout')}</button>
      </div>

      <div class="alphax-dash-card" style="margin-bottom:12px;">
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px;">
          <div>
            <label>${__('Profile')}</label>
            <select class="form-control" id="profile"><option>CEO</option><option selected>CFO</option><option>Department Head</option></select>
          </div>
          <div>
            <label>${__('Visual Template')}</label>
            <select class="form-control" id="vt"></select>
          </div>
          <div>
            <label>${__('Layout Title')}</label>
            <input class="form-control" id="title" placeholder="CFO Canvas v6">
          </div>
          <div style="display:flex; gap:10px; align-items:end;">
            <label style="margin:0;"><input type="checkbox" id="is_default"> ${__('Default')}</label>
            <label style="margin:0;"><input type="checkbox" id="is_public"> ${__('Public')}</label>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; margin-top:10px;">
          <div>
            <label>${__('Widget Type')}</label>
            <select class="form-control" id="widget_type">
              <option value="kpi">${__('KPI Tile')}</option>
              <option value="donut">${__('Donut (Actual vs Budget)')}</option>
              <option value="gauge">${__('Gauge (Variance %)')}</option>
              <option value="trend">${__('Trend Line (Monthly Actual)')}</option>
              <option value="section_bar">${__('Section Totals (Bar)')}</option>
              <option value="top_bar">${__('Top KPIs (Bar)')}</option>
              <option value="mini_table">${__('Mini Table (Section)')}</option>
            </select>
          </div>
          <div>
            <label>${__('Row Key / Section')}</label>
            <select class="form-control" id="row_key"></select>
          </div>
          <div>
            <label>${__('Default Size')}</label>
            <select class="form-control" id="size">
              <option value="3x4">3x4</option>
              <option value="4x4">4x4</option>
              <option value="6x4">6x4</option>
              <option value="6x6" selected>6x6</option>
              <option value="12x6">12x6</option>
              <option value="12x10">12x10</option>
            </select>
          </div>
          <div>
            <label>${__('Collision')}</label>
            <select class="form-control" id="collision">
              <option value="nearest" selected>${__('Minimal Displacement')}</option>
              <option value="push">${__('Push Down')}</option>
              <option value="none">${__('None')}</option>
            </select>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn btn-default" id="add">${__('Add Widget')}</button>
          <button class="btn btn-default" id="dup_widget">${__('Duplicate Selected')}</button>
          <button class="btn btn-danger" id="clear">${__('Clear')}</button>
        </div>
      </div>

      <div class="text-muted" style="font-size:11px; margin-bottom:8px;">
        <b>${__('Reality Bender Tips')}</b>:
        ${__('Shift+Click multi-select. Drag header = group move. Group resize handle appears when 2+ selected. Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z for undo/redo. Lock Pos/Size for governance.')}
      </div>

      <div class="alphax-canvas-stage">
        <div class="alphax-grid" id="stage"></div>
      </div>
    </div>
  `);

  $('#tour').on('click', ()=> frappe.set_route('alphax-mis-tour'));
  $('#open_canvas').on('click', ()=> frappe.set_route('alphax-mis-canvas'));

  function esc(s){ return frappe.utils.escape_html(s||''); }
  function uid(){ return 'w_' + Math.random().toString(36).slice(2,10); }
  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
  function parseSize(s){
    const parts=(s||'6x6').split('x');
    const w=parseInt(parts[0]||'6',10);
    const h=parseInt(parts[1]||'6',10);
    return { w: Math.max(2, Math.min(12, w||6)), h: Math.max(2, Math.min(12, h||6) )};
  }
  function snap(v,min,max){ v=Math.round(v); return Math.max(min, Math.min(max, v)); }

  // History
  function pushHistory(reason){
    const snapShot = deepClone({ layout: state.layout, selected: Array.from(state.selected) });
    state.history = state.history.slice(0, state.hist_i + 1);
    state.history.push({ t: Date.now(), reason: reason||'', s: snapShot });
    state.hist_i = state.history.length - 1;
  }
  function restoreHistory(i){
    if (i < 0 || i >= state.history.length) return;
    const s = state.history[i].s;
    state.layout = deepClone(s.layout);
    state.selected = new Set(s.selected || []);
    state.hist_i = i;
    render();
  }
  function undo(){ restoreHistory(state.hist_i - 1); }
  function redo(){ restoreHistory(state.hist_i + 1); }

  $('#undo').on('click', undo);
  $('#redo').on('click', redo);

  function rowOptions(){
    const rows=(state.vt_doc && state.vt_doc.rows) ? state.vt_doc.rows : [];
    return rows.filter(r=>!r.is_hidden && (r.row_key||'').trim())
      .map(r=>({ value:r.row_key, label:`${r.row_key} — ${r.label||''}`, section:r.section||'' }));
  }
  function sectionOptions(){
    const rows=(state.vt_doc && state.vt_doc.rows) ? state.vt_doc.rows : [];
    const s={}; rows.forEach(r=>{ if (r.section) s[r.section]=1; });
    return Object.keys(s).sort();
  }
  function renderRowKeySelect(){
    const $s=$('#row_key'); $s.empty();
    const t=$('#widget_type').val();
    if (t==='mini_table' || t==='section_bar'){
      sectionOptions().forEach(sec=>$s.append(`<option value="${esc(sec)}">${esc(sec)}</option>`));
      return;
    }
    rowOptions().forEach(o=>$s.append(`<option value="${esc(o.value)}">${esc(o.label)}</option>`));
  }
  $('#widget_type').on('change', renderRowKeySelect);

  function gridMetrics(){
    const stage=document.getElementById('stage');
    const rect=stage.getBoundingClientRect();
    const cols=12, gap=10, rowH=34;
    const colW=Math.max(50, Math.floor((rect.width - gap*(cols-1) - 20)/cols));
    document.documentElement.style.setProperty('--ax-gap', gap+'px');
    document.documentElement.style.setProperty('--ax-row-h', rowH+'px');
    return { cols, gap, rowH, colW };
  }
  function toPx(x,y,w,h){
    const m=gridMetrics();
    const left=10 + (x-1)*(m.colW+m.gap);
    const top=10 + (y-1)*(m.rowH+m.gap);
    const width=w*m.colW + (w-1)*m.gap;
    const height=h*m.rowH + (h-1)*m.gap;
    return {left,top,width,height};
  }

  function overlaps(a,b){
    return !(a.x+a.w-1 < b.x || b.x+b.w-1 < a.x || a.y+a.h-1 < b.y || b.y+b.h-1 < a.y);
  }
  function getBox(w){ return { x:w.x||1, y:w.y||1, w:w.w||6, h:w.h||6, id:w.id }; }

  // lock_mode: '' | 'pos' | 'size'
  function isLockPos(w){ return w.lock_mode === 'pos'; }
  function isLockSize(w){ return w.lock_mode === 'size'; }
  function lockBadge(w){ return w.lock_mode === 'pos' ? '📍' : (w.lock_mode === 'size' ? '📐' : ''); }

  // Collision
  function pushDown(activeIds){
    const widgets = state.layout.widgets;
    const actives = new Set(activeIds);
    let changed = true, guard=0;
    while (changed && guard < 300) {
      guard++; changed=false;
      for (const a of widgets.filter(w=>actives.has(w.id))) {
        const A = getBox(a);
        for (const b of widgets.filter(w=>!actives.has(w.id))) {
          if (isLockPos(b)) continue;
          const B = getBox(b);
          if (overlaps(A,B)) { b.y = (A.y + A.h); changed=true; }
        }
      }
    }
  }
  function firstFreeNear(target, fixedBoxes){
    const cols = 12;
    const w = target.w, h = target.h;
    const ox = target.x, oy = target.y;
    function okAt(x,y){
      if (x < 1 || x > cols - w + 1) return false;
      if (y < 1 || y > 200) return false;
      const t = {x,y,w,h};
      for (const b of fixedBoxes){ if (overlaps(t,b)) return false; }
      return true;
    }
    if (okAt(ox,oy)) return {x:ox,y:oy};
    const maxR = 60;
    for (let r=1; r<=maxR; r++){
      for (let dy=-r; dy<=r; dy++){
        for (let dx=-r; dx<=r; dx++){
          if (Math.abs(dx)!==r && Math.abs(dy)!==r) continue;
          const x = ox + dx, y = oy + dy;
          if (okAt(x,y)) return {x,y};
        }
      }
    }
    return {x:1, y: oy + maxR + 1};
  }
  function minimalDisplacement(activeIds){
    const widgets = state.layout.widgets;
    const actives = new Set(activeIds);
    const fixed = widgets.filter(w => actives.has(w.id) || isLockPos(w)).map(getBox);
    const movers = widgets.filter(w => !actives.has(w.id) && !isLockPos(w));
    for (const m of movers){
      const box = getBox(m);
      if (!fixed.some(b=>overlaps(box,b))) continue;
      const slot = firstFreeNear(box, fixed);
      m.x = slot.x; m.y = slot.y;
      fixed.push(getBox(m));
    }
  }
  function applyCollision(activeIds){
    const mode = $('#collision').val();
    if (mode === 'none') return;
    if (mode === 'push') return pushDown(activeIds);
    return minimalDisplacement(activeIds);
  }

  // Guides
  function clearGuides(){
    const stage = document.getElementById('stage');
    state.guides.lines.forEach(el=>el.remove());
    state.guides.lines = [];
  }
  function addGuide(cls, style){
    const stage = document.getElementById('stage');
    const el = document.createElement('div');
    el.className = 'alphax-guide ' + cls;
    Object.keys(style).forEach(k=> el.style[k]=style[k]);
    stage.appendChild(el);
    state.guides.lines.push(el);
  }
  function showGuidesFor(activeBox, activeId){
    clearGuides();
    const others = state.layout.widgets.filter(w=>w.id!==activeId).map(getBox);
    const axL = activeBox.x;
    const axC = activeBox.x + (activeBox.w/2);
    const axR = activeBox.x + activeBox.w;
    const ayT = activeBox.y;
    const ayM = activeBox.y + (activeBox.h/2);
    const ayB = activeBox.y + activeBox.h;

    const foundXL = others.find(o=>o.x===axL);
    const foundXC = others.find(o=>(o.x + o.w/2)===axC);
    const foundXR = others.find(o=>(o.x + o.w)===axR);

    const foundYT = others.find(o=>o.y===ayT);
    const foundYM = others.find(o=>(o.y + o.h/2)===ayM);
    const foundYB = others.find(o=>(o.y + o.h)===ayB);

    if (foundXL){ const gx = toPx(foundXL.x, 1, 1, 1).left; addGuide('v', { left: gx+'px', top:'0px', bottom:'0px', display:'block' }); }
    if (foundXC){ const gx = toPx(foundXC.x + foundXC.w/2, 1, 1, 1).left; addGuide('v center', { left: gx+'px', top:'0px', bottom:'0px', display:'block' }); }
    if (foundXR){ const gx = toPx(foundXR.x + foundXR.w, 1, 1, 1).left; addGuide('v', { left: gx+'px', top:'0px', bottom:'0px', display:'block' }); }

    if (foundYT){ const gy = toPx(1, foundYT.y, 1, 1).top; addGuide('h', { top: gy+'px', left:'0px', right:'0px', display:'block' }); }
    if (foundYM){ const gy = toPx(1, foundYM.y + foundYM.h/2, 1, 1).top; addGuide('h center', { top: gy+'px', left:'0px', right:'0px', display:'block' }); }
    if (foundYB){ const gy = toPx(1, foundYB.y + foundYB.h, 1, 1).top; addGuide('h', { top: gy+'px', left:'0px', right:'0px', display:'block' }); }
  }

  // Ghost
  function ghostEnsure(){
    if (state.ghost) return state.ghost;
    const g = document.createElement('div');
    g.className = 'alphax-ghost';
    document.getElementById('stage').appendChild(g);
    state.ghost = g;
    return g;
  }
  function ghostHide(){ if (state.ghost) state.ghost.style.display='none'; }
  function ghostShow(x,y,w,h){
    const g = ghostEnsure();
    const px = toPx(x,y,w,h);
    g.style.display = 'block';
    g.style.left = px.left+'px';
    g.style.top = px.top+'px';
    g.style.width = px.width+'px';
    g.style.height = px.height+'px';
  }

  function selectedWidgets(){
    const ids = Array.from(state.selected);
    return state.layout.widgets.filter(w=>ids.includes(w.id));
  }
  function maxZ(){ return Math.max(10, ...state.layout.widgets.map(w=>parseInt(w.z||10,10)||10)); }
  function minZ(){ return Math.min(10, ...state.layout.widgets.map(w=>parseInt(w.z||10,10)||10)); }

  function selectionBBox(ws){
    const xs = ws.map(w=>w.x||1);
    const ys = ws.map(w=>w.y||1);
    const xe = ws.map(w=>(w.x||1)+(w.w||6));
    const ye = ws.map(w=>(w.y||1)+(w.h||6));
    return { x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...xe), y2: Math.max(...ye) };
  }

  function render(){
    const $stage=$('#stage'); $stage.empty();
    state.ghost = null;
    clearGuides();

    const widgets = (state.layout.widgets||[]).slice().sort((a,b)=>(parseInt(a.z||10,10)||10) - (parseInt(b.z||10,10)||10));
    widgets.forEach(w=>{
      const x=w.x||1,y=w.y||1,ww=w.w||6,hh=w.h||6;
      const px=toPx(x,y,ww,hh);
      const meta=w.type + (w.row_key?` | ${w.row_key}`: w.section?` | ${w.section}`:'');
      const selected = state.selected.has(w.id) ? 'alphax-selected' : '';
      const lock = lockBadge(w);
      const z = parseInt(w.z||10,10) || 10;
      const hideResize = isLockSize(w) ? 'style="display:none;"' : '';

      const $el=$(`
        <div class="alphax-widget-abs ${selected}" data-id="${w.id}" style="left:${px.left}px;top:${px.top}px;width:${px.width}px;height:${px.height}px; z-index:${z};">
          <div class="hdr alphax-move-handle">
            <div>
              <div class="ttl">${esc((lock? (lock+' ') : '') + (w.title||w.type))}</div>
              <div class="sub">${esc(meta)} | z:${z}</div>
            </div>
            <div class="alphax-widget-tools alphax-no-print">
              <button class="btn btn-xs btn-default dup" data-id="${w.id}">⧉</button>
              <button class="btn btn-xs btn-danger del" data-id="${w.id}">✕</button>
            </div>
          </div>
          <div class="sub">${__('x')}: ${x}, ${__('y')}: ${y}, ${__('w')}: ${ww}, ${__('h')}: ${hh}</div>
          <div class="alphax-resize-handle alphax-no-print" data-id="${w.id}" ${hideResize}></div>
        </div>
      `);
      $stage.append($el);
    });

    // Group resize overlay (2+ selection)
    const ws = selectedWidgets();
    if (ws.length >= 2){
      const bb = selectionBBox(ws);
      const bw = bb.x2 - bb.x;
      const bh = bb.y2 - bb.y;
      const px = toPx(bb.x, bb.y, bw, bh);
      const $box = $(`
        <div class="alphax-group-box alphax-no-print" style="left:${px.left}px;top:${px.top}px;width:${px.width}px;height:${px.height}px; z-index:10005;">
          <div class="alphax-group-resize-handle" data-gr="1" title="${esc(__('Group Resize'))}"></div>
        </div>
      `);
      $stage.append($box);
    }

    $('.del').on('click', function(e){
      e.preventDefault(); e.stopPropagation();
      pushHistory('delete');
      const id=$(this).attr('data-id');
      state.layout.widgets=state.layout.widgets.filter(x=>x.id!==id);
      state.selected.delete(id);
      render();
    });
    $('.dup').on('click', function(e){
      e.preventDefault(); e.stopPropagation();
      pushHistory('dup');
      const id=$(this).attr('data-id');
      duplicateWidgets([id], 1, 1, '(Copy)');
      render();
    });
    $('.alphax-widget-abs').on('click', function(e){
      const id=$(this).attr('data-id');
      if (!e.shiftKey) state.selected.clear();
      if (state.selected.has(id)) state.selected.delete(id);
      else state.selected.add(id);
      render();
    });

    bindMoveResize();
  }

  function duplicateWidgets(ids, dx, dy, suffix){
    const source = state.layout.widgets.filter(w=>ids.includes(w.id));
    source.forEach(w=>{
      const nw = deepClone(w);
      nw.id = uid();
      nw.x = (w.x||1) + (dx||1);
      nw.y = (w.y||1) + (dy||1);
      nw.z = (parseInt(w.z||10,10)||10) + 1;
      nw.lock_mode = '';
      nw.title = (w.title||w.type) + ' ' + (suffix||'(Copy)');
      state.layout.widgets.push(nw);
      state.selected.add(nw.id);
    });
    applyCollision(Array.from(state.selected));
  }

  function bindMoveResize(){
    const stage=document.getElementById('stage');

    // group resize
    $(stage).find('[data-gr="1"]').off('pointerdown').on('pointerdown', function(e){
      const ws = selectedWidgets().filter(w=>!isLockSize(w));
      if (ws.length < 2) return;
      pushHistory('group-resize');

      const bb = selectionBBox(ws);
      const bw = bb.x2 - bb.x;
      const bh = bb.y2 - bb.y;

      state.group_resize = {
        start: { px:e.clientX, py:e.clientY, bb, bw, bh },
        items: ws.map(w=>({ id:w.id, x:w.x||1, y:w.y||1, w:w.w||6, h:w.h||6 }))
      };
      e.target.setPointerCapture(e.pointerId);
      e.preventDefault(); e.stopPropagation();
    });

    // move
    $(stage).find('.alphax-move-handle').off('pointerdown').on('pointerdown', function(e){
      const id=$(e.target).closest('[data-id]').attr('data-id');
      const w=state.layout.widgets.find(x=>x.id===id);
      if (!w || isLockPos(w)) return;

      if (!state.selected.has(id)) {
        if (!e.shiftKey) state.selected.clear();
        state.selected.add(id);
        render();
      }

      const movable = selectedWidgets().filter(sw=>!isLockPos(sw));
      if (!movable.length) return;

      pushHistory('move');

      const snap0 = {};
      movable.forEach(sw=>{ snap0[sw.id]={ x:sw.x||1, y:sw.y||1 }; });
      state.drag={ id, start:{ px:e.clientX, py:e.clientY }, snap0, movableIds: movable.map(x=>x.id) };
      e.target.setPointerCapture(e.pointerId);
    });

    // resize
    $(stage).find('.alphax-resize-handle').off('pointerdown').on('pointerdown', function(e){
      const id=$(this).attr('data-id');
      const w=state.layout.widgets.find(x=>x.id===id);
      if (!w || isLockSize(w)) return;
      pushHistory('resize');

      if (!state.selected.has(id)){
        state.selected.clear(); state.selected.add(id); render();
      }
      state.resize={ id, start:{ w:w.w||6, h:w.h||6, px:e.clientX, py:e.clientY } };
      e.target.setPointerCapture(e.pointerId);
      e.preventDefault(); e.stopPropagation();
    });

    $(stage).off('pointermove').on('pointermove', function(e){
      const m=gridMetrics();

      if (state.group_resize){
        const dx=e.clientX - state.group_resize.start.px;
        const dy=e.clientY - state.group_resize.start.py;
        const gx=dx/(m.colW+m.gap);
        const gy=dy/(m.rowH+m.gap);

        const nbw = Math.max(2, state.group_resize.start.bw + gx);
        const nbh = Math.max(2, state.group_resize.start.bh + gy);

        const sx = nbw / state.group_resize.start.bw;
        const sy = nbh / state.group_resize.start.bh;

        const ax = state.group_resize.start.bb.x;
        const ay = state.group_resize.start.bb.y;

        state.group_resize.items.forEach(it=>{
          const w = state.layout.widgets.find(x=>x.id===it.id);
          if (!w) return;

          const nx = snap(ax + (it.x - ax) * sx, 1, 12);
          const ny = snap(ay + (it.y - ay) * sy, 1, 200);

          w.x = Math.min(nx, 12 - 1);
          w.y = ny;

          w.w = snap(Math.max(2, it.w * sx), 2, 12 - (w.x||1) + 1);
          w.h = snap(Math.max(2, it.h * sy), 2, 200);
        });

        const bb = selectionBBox(selectedWidgets());
        ghostShow(bb.x, bb.y, bb.x2-bb.x, bb.y2-bb.y);
        applyCollision(state.group_resize.items.map(i=>i.id));
        render();
      }

      if (state.drag){
        const dx=e.clientX - state.drag.start.px;
        const dy=e.clientY - state.drag.start.py;
        const gx=dx/(m.colW+m.gap);
        const gy=dy/(m.rowH+m.gap);

        state.drag.movableIds.forEach(id=>{
          const sw=state.layout.widgets.find(x=>x.id===id);
          const s0=state.drag.snap0[id];
          if (!sw || !s0) return;
          sw.x = snap((s0.x + gx), 1, m.cols - (sw.w||6) + 1);
          sw.y = snap((s0.y + gy), 1, 200);
        });

        const active = state.layout.widgets.find(x=>x.id===state.drag.id);
        ghostShow(active.x||1, active.y||1, active.w||6, active.h||6);
        showGuidesFor(getBox(active), active.id);
        applyCollision(state.drag.movableIds);
        render();
      }

      if (state.resize){
        const w=state.layout.widgets.find(x=>x.id===state.resize.id);
        const dx=e.clientX - state.resize.start.px;
        const dy=e.clientY - state.resize.start.py;
        const gw=dx/(m.colW+m.gap);
        const gh=dy/(m.rowH+m.gap);
        w.w = snap(state.resize.start.w + gw, 2, m.cols - (w.x||1) + 1);
        w.h = snap(state.resize.start.h + gh, 2, 200);
        ghostShow(w.x||1, w.y||1, w.w||6, w.h||6);
        showGuidesFor(getBox(w), w.id);
        applyCollision([w.id]);
        render();
      }
    });

    $(stage).off('pointerup pointercancel').on('pointerup pointercancel', function(){
      state.drag=null; state.resize=null; state.group_resize=null;
      ghostHide(); clearGuides();
    });
  }

  function autoPlace(ww,hh){
    const maxY=state.layout.widgets.reduce((a,w)=>Math.max(a,(w.y||1)+(w.h||6)),1);
    return { x:1, y:maxY+1, w:ww, h:hh };
  }

  $('#add').on('click', ()=>{
    pushHistory('add');
    const type=$('#widget_type').val();
    const sel=$('#row_key').val();
    const size=parseSize($('#size').val());
    const pos=autoPlace(size.w,size.h);
    const w={ id:uid(), type, x:pos.x, y:pos.y, w:pos.w, h:pos.h, z:maxZ()+1, lock_mode:'' };

    if (type==='section_bar' || type==='mini_table'){
      w.section=sel;
      w.title=(type==='section_bar')? __('Section Totals')+' — '+sel : __('Mini Table')+' — '+sel;
    } else { w.row_key=sel; w.title=sel || type; }

    state.layout.widgets.push(w);
    state.selected.clear(); state.selected.add(w.id);
    render();
  });

  $('#dup_widget').on('click', ()=>{
    const ids = Array.from(state.selected);
    if (!ids.length) return frappe.msgprint(__('Select at least one widget.'));
    pushHistory('dup-selected');
    state.selected.clear();
    duplicateWidgets(ids, 1, 1, '(Copy)');
    render();
  });

  $('#copy').on('click', ()=>{
    const ids = Array.from(state.selected);
    if (!ids.length) return frappe.msgprint(__('Select widgets to copy.'));
    state.clipboard = state.layout.widgets.filter(w=>ids.includes(w.id)).map(w=>deepClone(w));
    frappe.show_alert({message: __('Copied') + ': ' + ids.length, indicator:'green'});
  });

  $('#paste').on('click', ()=>{
    if (!state.clipboard || !state.clipboard.length) return frappe.msgprint(__('Clipboard is empty.'));
    pushHistory('paste');
    state.selected.clear();
    state.clipboard.forEach(w=>{
      const nw = deepClone(w);
      nw.id = uid();
      nw.x = (w.x||1) + 1; nw.y = (w.y||1) + 1;
      nw.z = maxZ()+1; nw.lock_mode='';
      nw.title = (w.title||w.type) + ' (Paste)';
      state.layout.widgets.push(nw);
      state.selected.add(nw.id);
    });
    applyCollision(Array.from(state.selected));
    render();
  });

  $('#export').on('click', ()=>{
    const d=new frappe.ui.Dialog({
      title: __('Export Layout JSON'),
      fields:[{fieldname:'json', fieldtype:'Code', label:__('JSON'), options:'JSON', reqd:1}],
      primary_action_label: __('Close'),
      primary_action: ()=>d.hide()
    });
    d.set_value('json', JSON.stringify(state.layout, null, 2));
    d.show();
  });

  $('#import').on('click', ()=>{
    const d=new frappe.ui.Dialog({
      title: __('Import Layout JSON'),
      fields:[{fieldname:'json', fieldtype:'Code', label:__('JSON'), options:'JSON', reqd:1}],
      primary_action_label: __('Import'),
      primary_action: ()=>{
        try{
          const obj=JSON.parse(d.get_value('json')||'{}');
          if (!obj || !obj.widgets) throw new Error('Invalid JSON');
          pushHistory('import');
          state.layout=obj;
          state.selected.clear();
          d.hide();
          render();
          frappe.show_alert({message: __('Imported'), indicator:'green'});
        } catch(err){
          frappe.msgprint(__('Import failed')+': '+err.message);
        }
      }
    });
    d.show();
  });

  function setLockMode(mode){
    const ids=Array.from(state.selected);
    if (!ids.length) return frappe.msgprint(__('Select widgets first.'));
    pushHistory('lock');
    ids.forEach(id=>{
      const w=state.layout.widgets.find(x=>x.id===id);
      if (w) w.lock_mode = mode;
    });
    render();
  }
  $('#lock_pos').on('click', ()=> setLockMode('pos'));
  $('#lock_size').on('click', ()=> setLockMode('size'));
  $('#unlock').on('click', ()=> setLockMode(''));

  $('#front').on('click', ()=>{
    const ids=Array.from(state.selected);
    if (!ids.length) return;
    pushHistory('front');
    const mz=maxZ();
    ids.forEach((id,i)=>{ const w=state.layout.widgets.find(x=>x.id===id); if (w) w.z = mz+1+i; });
    render();
  });
  $('#back').on('click', ()=>{
    const ids=Array.from(state.selected);
    if (!ids.length) return;
    pushHistory('back');
    const mn=minZ();
    ids.forEach((id,i)=>{ const w=state.layout.widgets.find(x=>x.id===id); if (w) w.z = mn-1-i; });
    render();
  });

  function sortByX(a,b){ return (a.x||1)-(b.x||1); }
  function sortByY(a,b){ return (a.y||1)-(b.y||1); }

  $('#align_left').on('click', ()=>{
    const ws=selectedWidgets().filter(w=>!isLockPos(w));
    if (ws.length<2) return;
    pushHistory('align-left');
    const left=Math.min(...ws.map(w=>w.x||1));
    ws.forEach(w=>w.x=left);
    applyCollision(ws.map(w=>w.id));
    render();
  });
  $('#align_top').on('click', ()=>{
    const ws=selectedWidgets().filter(w=>!isLockPos(w));
    if (ws.length<2) return;
    pushHistory('align-top');
    const top=Math.min(...ws.map(w=>w.y||1));
    ws.forEach(w=>w.y=top);
    applyCollision(ws.map(w=>w.id));
    render();
  });
  $('#dist_h').on('click', ()=>{
    const ws=selectedWidgets().filter(w=>!isLockPos(w)).slice().sort(sortByX);
    if (ws.length<3) return frappe.msgprint(__('Select 3+ widgets.'));
    pushHistory('dist-h');
    const minX=ws[0].x||1, maxX=ws[ws.length-1].x||1;
    const step=(maxX-minX)/(ws.length-1);
    ws.forEach((w,i)=>w.x=snap(minX+step*i,1,12-(w.w||6)+1));
    applyCollision(ws.map(w=>w.id));
    render();
  });
  $('#dist_v').on('click', ()=>{
    const ws=selectedWidgets().filter(w=>!isLockPos(w)).slice().sort(sortByY);
    if (ws.length<3) return frappe.msgprint(__('Select 3+ widgets.'));
    pushHistory('dist-v');
    const minY=ws[0].y||1, maxY=ws[ws.length-1].y||1;
    const step=(maxY-minY)/(ws.length-1);
    ws.forEach((w,i)=>w.y=snap(minY+step*i,1,200));
    applyCollision(ws.map(w=>w.id));
    render();
  });

  $('#dup_layout').on('click', async ()=>{
    const t=($('#title').val()||'Canvas')+' (Copy)';
    const payload={ name: undefined, layout_title: t, profile: $('#profile').val(), visual_template: $('#vt').val(),
      layout_json: JSON.stringify(state.layout, null, 2), is_default: 0, is_public: $('#is_public').is(':checked') ? 1 : 0 };
    if (!payload.visual_template) return frappe.msgprint(__('Select a Visual Template first.'));
    frappe.dom.freeze(__('Duplicating...'));
    try{
      const r=await frappe.call('alphax_mis_designer.api.save_canvas_layout', { layout: payload });
      state.current_layout_name=r.message.name;
      $('#title').val(t); $('#is_default').prop('checked', false);
      frappe.show_alert({message: __('Layout duplicated') + ': ' + r.message.name, indicator:'green'});
    } finally { frappe.dom.unfreeze(); }
  });

  $('#clear').on('click', ()=>{
    pushHistory('clear');
    state.layout.widgets=[]; state.selected.clear(); render();
  });

  $('#save').on('click', async ()=>{
    const payload={ name: state.current_layout_name || undefined, layout_title: $('#title').val(), profile: $('#profile').val(),
      visual_template: $('#vt').val(), layout_json: JSON.stringify(state.layout, null, 2),
      is_default: $('#is_default').is(':checked') ? 1 : 0, is_public: $('#is_public').is(':checked') ? 1 : 0 };
    if (!payload.layout_title || !payload.visual_template) return frappe.msgprint(__('Title + Visual Template required.'));
    frappe.dom.freeze(__('Saving...'));
    try{
      const r=await frappe.call('alphax_mis_designer.api.save_canvas_layout', { layout: payload });
      state.current_layout_name=r.message.name;
      frappe.show_alert({message:__('Saved')+': '+r.message.name, indicator:'green'});
    } finally { frappe.dom.unfreeze(); }
  });

  $('#load').on('click', async ()=>{
    const r=await frappe.call('alphax_mis_designer.api.list_canvas_layouts', { profile: $('#profile').val(), visual_template: $('#vt').val() });
    const list=r.message || [];
    const d=new frappe.ui.Dialog({
      title: __('Load Layout'),
      fields:[{ fieldname:'name', fieldtype:'Select', label:__('Layout'), options:list.map(x=>x.name).join('\n') }],
      primary_action_label: __('Load'),
      primary_action: async (v)=>{
        d.hide();
        if (!v.name) return;
        const doc=await frappe.db.get_doc('MIS Canvas Layout', v.name);
        state.current_layout_name=doc.name;
        $('#title').val(doc.layout_title); $('#profile').val(doc.profile); $('#vt').val(doc.visual_template);
        $('#is_default').prop('checked', !!doc.is_default); $('#is_public').prop('checked', !!doc.is_public);
        await loadVT();
        state.layout=JSON.parse(doc.layout_json || '{"version":6,"widgets":[]}');
        state.selected.clear();
        pushHistory('load');
        render();
      }
    });
    d.show();
  });

  async function loadTemplates(){
    const list=await frappe.db.get_list('MIS Visual Template', { fields:['name','template_title'], limit:200 });
    const $s=$('#vt'); $s.empty();
    (list||[]).forEach(x=>$s.append(`<option value="${x.name}">${esc(x.template_title||x.name)}</option>`));
    await loadVT();
  }
  async function loadVT(){
    const vt=$('#vt').val();
    if (!vt) return;
    state.vt_doc=await frappe.db.get_doc('MIS Visual Template', vt);
    renderRowKeySelect();
  }
  $('#vt').on('change', loadVT);

  // Shortcuts
  $(document).off('keydown.alphax_mis_designer').on('keydown.alphax_mis_designer', function(e){
    if (e.ctrlKey && e.key.toLowerCase()==='c'){ e.preventDefault(); $('#copy').click(); }
    if (e.ctrlKey && e.key.toLowerCase()==='v'){ e.preventDefault(); $('#paste').click(); }
    if (e.ctrlKey && e.key.toLowerCase()==='z' && !e.shiftKey){ e.preventDefault(); undo(); }
    if (e.ctrlKey && (e.key.toLowerCase()==='y' || (e.shiftKey && e.key.toLowerCase()==='z'))){ e.preventDefault(); redo(); }
    if (e.key === 'Escape'){ state.selected.clear(); render(); }
    if (e.key === 'Delete'){
      const ids=Array.from(state.selected);
      if (ids.length){
        pushHistory('delete-key');
        state.layout.widgets = state.layout.widgets.filter(w=>!state.selected.has(w.id));
        state.selected.clear();
        render();
      }
    }
  });

  loadTemplates().then(()=>{
    pushHistory('init');
    render();
  });
};
