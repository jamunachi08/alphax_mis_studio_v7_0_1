frappe.pages['alphax-mis-canvas'].on_page_load = function(wrapper) {
  frappe.ui.make_app_page({ parent: wrapper, title: __('AlphaX MIS Canvas (v6.2)'), single_column: true });
  const $main = $(wrapper).find('.layout-main-section');
  const state = { layout_doc: null, result: null, rows_by_key: {} };

  $main.html(`
    <div class="alphax-canvas">
      <div style="display:flex; gap:8px; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
        <div>
          <h3 style="margin:0;">${__('MIS Canvas')}</h3>
          <div class="text-muted">${__('True move/resize canvas + advanced widgets (v6.2).')}</div>
        </div>
        <div class="alphax-no-print" style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-default" id="tour">${__('Help & Tour')}</button>
          <button class="btn btn-default" id="designer">${__('Canvas Designer')}</button>
          <button class="btn btn-default" id="board">${__('Executive Board')}</button>
        </div>
      </div>

      <div class="alphax-dash-card alphax-no-print" style="margin-bottom:12px; border:1px solid var(--border-color,#e5e7eb); border-radius:12px; background:#fff; padding:12px;">
        <div style="display:grid; grid-template-columns:220px 1fr 1fr 1fr; gap:10px; align-items:end;">
          <div>
            <label>${__('Profile')}</label>
            <select class="form-control" id="profile"><option>CEO</option><option selected>CFO</option><option>Department Head</option></select>
          </div>
          <div>
            <label>${__('Layout')}</label>
            <select class="form-control" id="layout_sel"></select>
          </div>
          <div>
            <label>${__('Company')}</label>
            <input class="form-control" id="company">
          </div>
          <div>
            <label>${__('Mode')}</label>
            <select class="form-control" id="mode"><option>Actual</option><option>Budget</option><option selected>Both</option></select>
          </div>
          <div>
            <label>${__('From Date')}</label>
            <input class="form-control" type="date" id="from_date">
          </div>
          <div>
            <label>${__('To Date')}</label>
            <input class="form-control" type="date" id="to_date">
          </div>
          <div style="grid-column: 3 / -1;">
            <label>${__('Dimensions (optional)')}</label>
            <input class="form-control" id="dims" placeholder="cost_center=Main, department=Finance, custom_lob=Logistics">
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="run">${__('Run')}</button>
          <button class="btn btn-default" id="export_excel" disabled>${__('Export Excel')}</button>
          <button class="btn btn-default" id="print" disabled>${__('Print PDF')}</button>
        </div>
      </div>

      <div class="alphax-canvas-stage">
        <div class="alphax-grid" id="stage"></div>
      </div>
    </div>
  `);

  $('#tour').on('click', ()=> frappe.set_route('alphax-mis-tour'));
  $('#designer').on('click', ()=> frappe.set_route('alphax-mis-canvas-designer'));
  $('#board').on('click', ()=> frappe.set_route('alphax-mis-board'));

  function parseDims(txt){
    const out = {};
    (txt||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(p=>{
      const i = p.indexOf('=');
      if (i>0) out[p.slice(0,i).trim()] = p.slice(i+1).trim();
    });
    return out;
  }
  function fmt(v){ return frappe.format(v||0,{fieldtype:'Currency'}); }
  function esc(s){ return frappe.utils.escape_html(s||''); }

  function gridMetrics(){
    const stage = document.getElementById('stage');
    const rect = stage.getBoundingClientRect();
    const cols = 12;
    const gap = 10;
    const rowH = 34;
    const colW = Math.max(50, Math.floor((rect.width - gap*(cols-1) - 20) / cols));
    return { cols, gap, rowH, colW };
  }
  function toPx(x,y,w,h){
    const m = gridMetrics();
    const left = 10 + (x-1) * (m.colW + m.gap);
    const top  = 10 + (y-1) * (m.rowH + m.gap);
    const width = w*m.colW + (w-1)*m.gap;
    const height = h*m.rowH + (h-1)*m.gap;
    return { left, top, width, height };
  }

  async function loadLayouts(){
    const profile = $('#profile').val();
    const r = await frappe.call('alphax_mis_designer.api.list_canvas_layouts', { profile });
    const list = r.message || [];
    const $s = $('#layout_sel');
    $s.empty();
    list.forEach(x=>{
      const tag = x.is_default ? ' ★' : '';
      $s.append(`<option value="${x.name}">${esc(x.layout_title||x.name)}${tag}</option>`);
    });
    if (list.length){
      $s.val(list[0].name);
      await loadLayoutDoc(list[0].name);
      $('#stage').html(`<div class="text-muted" style="padding:12px;">${__('Click Run to load data')}</div>`);
    } else {
      $('#stage').html(`<div class="text-muted" style="padding:12px;">${__('No layouts found. Create one in Canvas Designer.')}</div>`);
    }
  }

  async function loadLayoutDoc(name){
    if (!name) return;
    state.layout_doc = await frappe.db.get_doc('MIS Canvas Layout', name);
  }

  $('#profile').on('change', loadLayouts);
  $('#layout_sel').on('change', async function(){ await loadLayoutDoc($(this).val()); });

  function renderWidgetShell(w){
    const x=w.x||1,y=w.y||1,ww=w.w||6,hh=w.h||6;
    const px=toPx(x,y,ww,hh);
    const meta = w.type + (w.row_key ? ` | ${w.row_key}` : w.section ? ` | ${w.section}` : '');
    return `
      <div class="alphax-widget-abs alphax-print-card" style="left:${px.left}px; top:${px.top}px; width:${px.width}px; height:${px.height}px;">
        <div class="hdr">
          <div>
            <div class="ttl">${esc(w.title||w.type)}</div>
            <div class="sub">${esc(meta)}</div>
          </div>
        </div>
        <div class="body" id="body_${esc(w.id)}"></div>
      </div>
    `;
  }

  async function renderWidgets(){
    const doc = state.layout_doc;
    if (!doc) return;
    const layout = JSON.parse(doc.layout_json || '{"version":2,"widgets":[]}');
    const widgets = layout.widgets || [];
    const $stage = $('#stage');
    $stage.empty();
    $stage.append(widgets.map(renderWidgetShell).join('') || `<div class="text-muted" style="padding:12px;">${__('No widgets')}</div>`);

    for (const w of widgets){
      await renderWidgetContent(w);
    }
  }

  async function renderWidgetContent(w){
    const el = document.getElementById('body_'+w.id);
    if (!el) return;
    el.innerHTML = '';
    const mode = $('#mode').val();

    const rows = (state.result && state.result.rows) ? state.result.rows : [];
    const rows_by_key = state.rows_by_key;
    const r = w.row_key ? (rows_by_key[w.row_key] || {}) : {};

    function variancePct(){
      const b = (r.budget||0);
      if (!b) return 0;
      return (((r.actual||0) - b) / b) * 100;
    }
    function chart(type, data, height){
      if (!(window.frappe && frappe.Chart)) {
        el.innerHTML = `<div class="text-muted">${__('Chart library not available')}</div>`;
        return;
      }
      new frappe.Chart(el, { data, type, height: height || 240 });
    }

    if (w.type === 'kpi'){
      el.innerHTML = `
        <div style="font-size:22px;font-weight:800;">${mode==='Budget' ? fmt(r.budget) : fmt(r.actual)}</div>
        <div class="text-muted" style="font-size:11px;">
          ${mode==='Both' ? `${__('Budget')}: ${fmt(r.budget)} | ${__('Var')}: ${fmt(r.variance)}` : `${__('Row Key')}: ${esc(w.row_key)}`}
        </div>
      `;
      return;
    }

    if (w.type === 'donut'){
      const a = r.actual||0, b = r.budget||0;
      const values = mode==='Actual' ? [a] : mode==='Budget' ? [b] : [a,b];
      const labels = mode==='Both' ? [__('Actual'),__('Budget')] : [__('Value')];
      const data = { labels, datasets:[{ name: __('Value'), values }] };
      chart('pie', data, 220);
      return;
    }

    if (w.type === 'gauge'){
      const pct = variancePct();
      const clamped = Math.max(-100, Math.min(100, pct));
      const val = (clamped + 100) / 200 * 100;
      const data = { labels:[__('Variance')], datasets:[{ name: __('%'), values:[val] }] };
      chart('percentage', data, 180);
      el.insertAdjacentHTML('beforeend', `<div class="text-muted" style="font-size:11px;margin-top:6px;">${__('Variance %')}: <b>${clamped.toFixed(2)}%</b></div>`);
      return;
    }

    if (w.type === 'trend'){
      const filters = { company: $('#company').val(), from_date: $('#from_date').val(), to_date: $('#to_date').val(), ...parseDims($('#dims').val()) };
      const resp = await frappe.call('alphax_mis_designer.api.get_row_timeseries', { visual_template: state.layout_doc.visual_template, row_key: w.row_key, filters });
      const m = resp.message || {labels:[],values:[]};
      const data = { labels: m.labels || [], datasets:[{ name: __('Actual'), values: m.values || [] }] };
      chart('line', data, 240);
      return;
    }

    if (w.type === 'section_bar'){
      const sec = w.section;
      const bucket = rows.filter(x=>!x.is_hidden && x.row_type!=='Heading' && (x.section||'')===sec);
      const totalA = bucket.reduce((s,x)=>s+(x.actual||0),0);
      const totalB = bucket.reduce((s,x)=>s+(x.budget||0),0);
      const data = {
        labels:[sec],
        datasets: mode==='Both' ? [
          { name: __('Actual'), values:[totalA] },
          { name: __('Budget'), values:[totalB] },
        ] : [{ name: __('Value'), values:[mode==='Actual'?totalA:totalB] }]
      };
      chart('bar', data, 220);
      return;
    }

    if (w.type === 'top_bar'){
      const kpis = rows.filter(x=>!x.is_hidden && x.row_type!=='Heading').slice(0,10);
      const labels = kpis.map(x=>x.label||x.row_key||'');
      const vals = kpis.map(x=> mode==='Actual' ? (x.actual||0) : mode==='Budget' ? (x.budget||0) : (x.actual||0));
      const data = { labels, datasets:[{ name: __('Value'), values: vals }] };
      chart('bar', data, 240);
      return;
    }

    if (w.type === 'mini_table'){
      const sec = w.section;
      const bucket = rows.filter(x=>!x.is_hidden && x.row_type!=='Heading' && (x.section||'')===sec).slice(0, 15);
      el.innerHTML = `
        <div style="max-height:240px; overflow:auto;">
          <table class="table table-bordered">
            <thead><tr><th>${__('Label')}</th><th>${__('Actual')}</th><th>${__('Budget')}</th><th>${__('Var')}</th></tr></thead>
            <tbody>
              ${bucket.map(x=>`<tr>
                <td>${esc(x.label||x.row_key||'')}</td>
                <td>${fmt(x.actual)}</td>
                <td>${fmt(x.budget)}</td>
                <td>${fmt(x.variance)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    el.innerHTML = `<div class="text-muted">${__('Unknown widget')}</div>`;
  }

  async function run(){
    const doc = state.layout_doc;
    if (!doc) return frappe.msgprint(__('Select a layout first.'));
    const vt = doc.visual_template;
    const company = $('#company').val();
    const from_date = $('#from_date').val();
    const to_date = $('#to_date').val();
    const mode = $('#mode').val();
    if (!vt || !company || !from_date || !to_date) return frappe.msgprint(__('Company + From Date + To Date required.'));

    const filters = { company, from_date, to_date, ...parseDims($('#dims').val()) };

    frappe.dom.freeze(__('Running...'));
    try {
      const r = await frappe.call('alphax_mis_designer.api.get_board_kpis', { visual_template: vt, filters, mode });
      state.result = r.message || {};
      state.rows_by_key = {};
      (state.result.rows||[]).forEach(x=>{ if (x.row_key) state.rows_by_key[x.row_key] = x; });
      await renderWidgets();
      $('#export_excel').prop('disabled', false);
      $('#print').prop('disabled', false);
    } finally {
      frappe.dom.unfreeze();
    }
  }

  $('#run').on('click', run);

  $('#export_excel').on('click', async ()=>{
    if (!state.result) return;
    const doc = state.layout_doc;
    const rows = (state.result.rows||[]).filter(r=>!r.is_hidden && r.row_type!=='Heading');
    const meta = {
      company: $('#company').val(),
      from_date: $('#from_date').val(),
      to_date: $('#to_date').val(),
      mode: $('#mode').val(),
      dimensions: $('#dims').val(),
      visual_template: doc.visual_template,
      layout_title: doc.layout_title
    };
    frappe.dom.freeze(__('Exporting...'));
    try {
      const r = await frappe.call('alphax_mis_designer.utils.exporter.export_canvas_excel', { title: doc.layout_title || 'AlphaX MIS Canvas', rows, meta });
      const m = r.message;
      frappe.msgprint(__('Excel ready: <a href="{0}" target="_blank">{1}</a>', [m.file_url, m.file_name]));
    } finally {
      frappe.dom.unfreeze();
    }
  });

  $('#print').on('click', ()=> window.print());

  const c = frappe.defaults.get_default('Company');
  if (c) $('#company').val(c);
  const today = frappe.datetime.now_date();
  $('#to_date').val(today);
  $('#from_date').val(frappe.datetime.add_days(today, -30));

  loadLayouts();
};
