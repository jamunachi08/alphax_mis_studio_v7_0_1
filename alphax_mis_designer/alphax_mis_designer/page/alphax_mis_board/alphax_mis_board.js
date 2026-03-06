frappe.pages['alphax-mis-board'].on_page_load = function(wrapper) {
  frappe.ui.make_app_page({ parent: wrapper, title: __('AlphaX MIS Board'), single_column: true });
  const $main = $(wrapper).find('.layout-main-section');

  $main.html(`
    <div class="alphax-board">
      <div style="display:flex; gap:8px; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
        <div>
          <h3 style="margin:0;">${__('Executive MIS Board')}</h3>
          <div class="text-muted">${__('CEO / CFO / Department Head view. KPI tiles + section chart + quick drilldown.')}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-default" id="btn_tour">${__('Help & Tour')}</button>
          <button class="btn btn-default" id="btn_builder">${__('Visual Builder')}</button>
          <button class="btn btn-default" id="btn_save_preset">${__('Save Preset')}</button>
          <button class="btn btn-default" id="btn_copy_bi">${__('Copy BI URL')}</button>
        </div>
      </div>

      <div class="alphax-card" style="border:1px solid var(--border-color,#e5e7eb); border-radius:12px; background:#fff; padding:12px; margin-bottom:12px;">
        <div style="display:grid; grid-template-columns:220px 1fr 1fr 1fr; gap:10px; align-items:end;">
          <div>
            <label>${__('Profile')}</label>
            <select class="form-control" id="profile">
              <option>CEO</option>
              <option selected>CFO</option>
              <option>Department Head</option>
            </select>
          </div>
          <div>
            <label>${__('Preset')}</label>
            <select class="form-control" id="preset_sel"></select>
          </div>
          <div>
            <label>${__('Visual Template')}</label>
            <select class="form-control" id="vt"></select>
          </div>
          <div>
            <label>${__('From Date')}</label>
            <input class="form-control" type="date" id="from_date">
          </div>
          <div>
            <label>${__('To Date')}</label>
            <input class="form-control" type="date" id="to_date">
          </div>
          <div>
            <label>${__('Company')}</label>
            <input class="form-control" id="company">
          </div>
          <div>
            <label>${__('Mode')}</label>
            <select class="form-control" id="mode">
              <option>Actual</option><option>Budget</option><option selected>Both</option>
            </select>
          </div>
          <div style="grid-column: 3 / -1;">
            <label>${__('Dimensions (optional)')}</label>
            <input class="form-control" id="dims" placeholder="cost_center=Main, department=Finance, custom_lob=Logistics">
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="run">${__('Run')}</button>
        </div>
      </div>

      <div class="alphax-kpis" id="kpis"></div>

      <div class="alphax-card" style="border:1px solid var(--border-color,#e5e7eb); border-radius:12px; background:#fff; padding:12px; margin-bottom:12px;">
        <b>${__('Section Totals')}</b>
        <div id="chart" style="margin-top:10px;"></div>
      </div>

      <div class="alphax-card" style="border:1px solid var(--border-color,#e5e7eb); border-radius:12px; background:#fff; padding:12px;">
        <b>${__('Quick Preview')}</b>
        <div class="text-muted" style="font-size:11px; margin-top:6px;">${__('Click a row to open General Ledger.')}</div>
        <div id="table" style="margin-top:10px; max-height:65vh; overflow:auto;"></div>
      </div>
    </div>
  `);

  function parseDims(txt){
    const out = {};
    (txt||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(p=>{
      const i = p.indexOf('=');
      if (i>0) out[p.slice(0,i).trim()] = p.slice(i+1).trim();
    });
    return out;
  }

  function fmtCurrency(v){
    return frappe.format(v||0, { fieldtype:'Currency' });
  }

async function loadPresets(){
  const profile = $('#profile').val();
  const r = await frappe.call('alphax_mis_designer.api.list_board_presets', { profile });
  const list = (r.message||[]);
  const $p = $('#preset_sel');
  $p.empty();
  $p.append(`<option value="">${__('(none)')}</option>`);
  list.forEach(x=>{
    const tag = x.is_default ? ' ★' : '';
    $p.append(`<option value="${x.name}">${frappe.utils.escape_html(x.preset_title||x.name)}${tag}</option>`);
  });

  // auto apply default
  const def = list.find(x=>x.is_default);
  if (def) {
    $p.val(def.name);
    applyPreset(def);
  }
}

function applyPreset(p){
  if (!p) return;
  $('#vt').val(p.visual_template);
  $('#company').val(p.company);
  $('#mode').val(p.mode||'Both');
  $('#dims').val(p.dimensions||'');

  const today = frappe.datetime.now_date();
  const dr = p.date_range || 'Last 30 Days';
  $('#to_date').val(p.to_date || today);

  if (dr === 'MTD'){
    $('#from_date').val(frappe.datetime.month_start(today));
    $('#to_date').val(today);
  } else if (dr === 'QTD'){
    const m = parseInt(today.split('-')[1],10);
    const qStartMonth = (Math.floor((m-1)/3)*3)+1;
    const y = today.split('-')[0];
    const start = `${y}-${String(qStartMonth).padStart(2,'0')}-01`;
    $('#from_date').val(start);
    $('#to_date').val(today);
  } else if (dr === 'YTD'){
    $('#from_date').val(today.split('-')[0] + '-01-01');
    $('#to_date').val(today);
  } else if (dr === 'Custom'){
    if (p.from_date) $('#from_date').val(p.from_date);
    if (p.to_date) $('#to_date').val(p.to_date);
  } else { // last 30 days
    $('#from_date').val(frappe.datetime.add_days(today, -30));
    $('#to_date').val(today);
  }
}

async function savePreset(){
  const profile = $('#profile').val();
  const preset_title = await frappe.prompt([
    { fieldname:'preset_title', fieldtype:'Data', label: __('Preset Title'), reqd: 1 },
    { fieldname:'is_default', fieldtype:'Check', label: __('Set as default for this profile'), default: 0 },
    { fieldname:'date_range', fieldtype:'Select', label: __('Date Range'), options:'Last 30 Days\nMTD\nQTD\nYTD\nCustom', default:'Last 30 Days' }
  ], __('Save Preset'), __('Save'));

  const payload = {
    preset_title: preset_title.preset_title,
    profile,
    visual_template: $('#vt').val(),
    company: $('#company').val(),
    mode: $('#mode').val(),
    date_range: preset_title.date_range,
    from_date: $('#from_date').val(),
    to_date: $('#to_date').val(),
    dimensions: $('#dims').val(),
    is_default: preset_title.is_default ? 1 : 0
  };

  frappe.dom.freeze(__('Saving preset...'));
  try {
    await frappe.call('alphax_mis_designer.api.save_board_preset', { preset: payload });
    frappe.show_alert({message: __('Preset saved'), indicator:'green'});
    await loadPresets();
  } finally {
    frappe.dom.unfreeze();
  }
}

async function copyBiUrl(){
  const vt = $('#vt').val();
  const company = $('#company').val();
  const from_date = $('#from_date').val();
  const to_date = $('#to_date').val();
  const mode = $('#mode').val();
  if (!vt || !company || !from_date || !to_date) return frappe.msgprint(__('Select template + company + dates first.'));

  const params = { visual_template: vt, filters: { company, from_date, to_date, ...parseDims($('#dims').val()) }, mode };
  const r = await frappe.call('alphax_mis_designer.api.build_bi_url', { endpoint: 'get_pivot_dataset', params });
  const url = (r.message && r.message.url) ? r.message.url : '';
  await navigator.clipboard.writeText(url);
  frappe.msgprint(__('BI URL copied to clipboard:<br><code>{0}</code>', [frappe.utils.escape_html(url)]));
}

  async function loadTemplates(){
    const list = await frappe.db.get_list('MIS Visual Template', { fields:['name','template_title'], limit: 200 });
    const $s = $('#vt');
    $s.empty();
    (list||[]).forEach(x=>{
      $s.append(`<option value="${x.name}">${frappe.utils.escape_html(x.template_title||x.name)}</option>`);
    });
  }

  function renderKPIs(m){
    const items = [
      { lbl:__('Actual Total'), val: fmtCurrency(m.total_actual) },
      { lbl:__('Budget Total'), val: fmtCurrency(m.total_budget) },
      { lbl:__('Variance'), val: fmtCurrency(m.variance) },
      { lbl:__('Variance %'), val: (m.variance_pct==null ? '-' : (m.variance_pct.toFixed(2)+'%')) },
    ];
    $('#kpis').html(items.map(x=>`
      <div class="alphax-kpi">
        <div class="lbl">${x.lbl}</div>
        <div class="val">${x.val}</div>
      </div>
    `).join(''));
  }

  function renderChart(m){
    const el = document.getElementById('chart');
    el.innerHTML = '';
    const sec = m.section_totals || {};
    const labels = Object.keys(sec);
    if (!labels.length) return;

    if (window.frappe && frappe.Chart) {
      const data = {
        labels,
        datasets: [
          { name: __('Actual'), values: labels.map(l=>sec[l].actual) },
          { name: __('Budget'), values: labels.map(l=>sec[l].budget) },
        ]
      };
      const cwrap = document.createElement('div');
      cwrap.style.border = '1px solid var(--border-color,#e5e7eb)';
      cwrap.style.borderRadius = '12px';
      cwrap.style.padding = '10px';
      el.appendChild(cwrap);
      new frappe.Chart(cwrap, { data, type: 'bar', height: 260, colors: undefined });
    } else {
      el.innerHTML = `<div class="text-muted">${__('Chart library not available.')}</div>`;
    }
  }

function chooseAccountDialog(accounts){
  return new Promise(resolve=>{
    if (!accounts || !accounts.length) return resolve(null);
    if (accounts.length === 1) return resolve(accounts[0]);
    const d = new frappe.ui.Dialog({
      title: __('Choose Account for Drilldown'),
      fields: [{ fieldname:'account', fieldtype:'Select', label: __('Account'), options: accounts.join('\n'), reqd:1 }],
      primary_action_label: __('Open General Ledger'),
      primary_action: (v)=>{ d.hide(); resolve(v.account); }
    });
    d.show();
  });
}

function openGL(accounts, filters){
    if (!accounts || !accounts.length) return;
    const f = { company: filters.company, from_date: filters.from_date, to_date: filters.to_date, accounts: accounts };
    Object.keys(filters||{}).forEach(k=>{
      if (['company','from_date','to_date','mode'].includes(k)) return;
      f[k] = filters[k];
    });
    frappe.set_route('query-report', 'AlphaX General Ledger', f);
  }

  function renderTable(m){
    const rows = (m.rows||[]).filter(r=>!r.is_hidden && r.row_type!=='Heading');
    const mode = $('#mode').val();
    let th = mode==='Both' ? `<th style="text-align:right;">${__('Actual')}</th><th style="text-align:right;">${__('Budget')}</th><th style="text-align:right;">${__('Variance')}</th>`
                           : `<th style="text-align:right;">${__('Value')}</th>`;
    let html = `<table class="table table-bordered"><thead><tr><th>${__('Section')}</th><th>${__('Row')}</th>${th}</tr></thead><tbody>`;
    rows.forEach(r=>{
      const pad = (r.indent||0)*14;
      const st = r.is_bold ? 'font-weight:700;' : '';
      let cols='';
      if (mode==='Both'){
        cols = `<td style="text-align:right;">${fmtCurrency(r.actual)}</td><td style="text-align:right;">${fmtCurrency(r.budget)}</td><td style="text-align:right;">${fmtCurrency(r.variance)}</td>`;
      } else if (mode==='Actual'){
        cols = `<td style="text-align:right;">${fmtCurrency(r.actual)}</td>`;
      } else {
        cols = `<td style="text-align:right;">${fmtCurrency(r.budget)}</td>`;
      }
      const acc = encodeURIComponent(JSON.stringify(r.accounts_resolved||[]));
      html += `<tr class="rowlink" data-acc="${acc}"><td>${frappe.utils.escape_html(r.section||'')}</td><td style="${st} padding-left:${pad}px;">${frappe.utils.escape_html(r.label||r.row_key||'')}</td>${cols}</tr>`;
    });
    html += `</tbody></table>`;
    $('#table').html(html);

    $('.rowlink').css('cursor','pointer').on('click', function(){
      const accounts = JSON.parse(decodeURIComponent($(this).attr('data-acc')||'[]'));
      const filters = {
        company: $('#company').val(),
        from_date: $('#from_date').val(),
        to_date: $('#to_date').val(),
        mode: $('#mode').val(),
        ...parseDims($('#dims').val())
      };
      openGL(accounts, filters);
    });
  }

  async function run(){
    const vt = $('#vt').val();
    const company = $('#company').val();
    const from_date = $('#from_date').val();
    const to_date = $('#to_date').val();
    const mode = $('#mode').val();
    if (!vt || !company || !from_date || !to_date) return frappe.msgprint(__('Visual Template, Company, From Date, To Date are required.'));

    const filters = { company, from_date, to_date, ...parseDims($('#dims').val()) };
    frappe.dom.freeze(__('Running...'));
    try {
      const r = await frappe.call('alphax_mis_designer.api.get_board_kpis', { visual_template: vt, filters, mode });
      const m = r.message || {};
      renderKPIs(m);
      renderChart(m);
      renderTable(m);
    } finally {
      frappe.dom.unfreeze();
    }
  }

  $('#btn_tour').on('click', ()=> frappe.set_route('alphax-mis-tour'));
  $('#btn_builder').on('click', ()=> frappe.set_route('alphax-mis-builder'));
  $('#run').on('click', run);
  $('#btn_save_preset').on('click', savePreset);
  $('#btn_copy_bi').on('click', copyBiUrl);
  $('#profile').on('change', loadPresets);
  $('#preset_sel').on('change', async function(){
    const name = $(this).val();
    if (!name) return;
    const doc = await frappe.db.get_doc('MIS Board Preset', name);
    applyPreset(doc);
  });

  const c = frappe.defaults.get_default('Company');
  if (c) $('#company').val(c);

  const today = frappe.datetime.now_date();
  $('#to_date').val(today);
  $('#from_date').val(frappe.datetime.add_days(today, -30));

  loadTemplates();
};
