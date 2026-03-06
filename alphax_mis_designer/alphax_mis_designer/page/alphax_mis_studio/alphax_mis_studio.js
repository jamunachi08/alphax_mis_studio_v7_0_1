
frappe.pages['alphax-mis-studio'].on_page_load = function(wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __('AlphaX MIS Studio'),
    single_column: true
  });

  $(wrapper).find('.layout-main-section').html(`
    <div class="alphax-mis-wrap">
      <div class="alphax-card" style="margin-bottom:12px;">
        <div class="hd">
          <div>${__('Run MIS')}</div>
          <div class="alphax-toolbar">
            <span class="alphax-pill" id="pill_profile">${__('Profile')}: <b id="profile_name">CFO</b></span>
            <button class="btn btn-default btn-sm" id="btn_profiles">${__('Profiles')}</button>
            <button class="btn btn-secondary btn-sm" id="btn_saved_runs">${__('Saved Runs')}</button>
          </div>
        </div>
        <div class="bd">
          <div class="alphax-toolbar">
            <div style="min-width:260px">
              <label class="control-label">${__('Template')}</label>
              <select class="form-control" id="mis_template"></select>
            </div>
            <div style="min-width:220px">
              <label class="control-label">${__('Company')}</label>
              <input class="form-control" id="company" placeholder="Company">
            </div>
            <div style="min-width:160px">
              <label class="control-label">${__('From Date')}</label>
              <input class="form-control" type="date" id="from_date">
            </div>
            <div style="min-width:160px">
              <label class="control-label">${__('To Date')}</label>
              <input class="form-control" type="date" id="to_date">
            </div>
            <div style="min-width:140px">
              <label class="control-label">${__('Mode')}</label>
              <select class="form-control" id="mode">
                <option>Actual</option>
                <option>Budget</option>
                <option>Both</option>
              </select>
            </div>
            <div style="margin-top:18px; display:flex; gap:8px;">
              <button class="btn btn-primary" id="btn_preview">${__('Preview')}</button>
              <button class="btn btn-default" id="btn_export_xlsx">${__('Export XLSX')}</button>
              <button class="btn btn-default" id="btn_export_csv">${__('Export CSV')}</button>
              <button class="btn btn-success" id="btn_save_run">${__('Save Run')}</button>
            </div>
          </div>

          <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;" id="dim_filters"></div>
        </div>
      </div>

      <div class="alphax-kpis" id="kpis" style="margin-bottom:12px;"></div>

      <div class="alphax-mis-grid">
        <div class="alphax-card">
          <div class="hd">
            <div>${__('Rows')}</div>
            <div class="alphax-toolbar">
              <button class="btn btn-default btn-sm" id="btn_open_template">${__('Open Template')}</button>
              <button class="btn btn-default btn-sm" id="btn_reorder_reset">${__('Reset Order')}</button>
            </div>
          </div>
          <div class="bd">
            <div class="alphax-rowlist" id="row_list"></div>
            <div class="text-muted" style="font-size:11px;">${__('Tip: Drag rows to reorder. Click drill icon to open General Ledger.')}</div>
          </div>
        </div>

        <div class="alphax-card">
          <div class="hd">
            <div>${__('Preview')}</div>
            <div class="alphax-toolbar">
              <button class="btn btn-default btn-sm" id="btn_variance">${__('Variance')}</button>
              <button class="btn btn-default btn-sm" id="btn_pivot">${__('Pivot')}</button>
            </div>
          </div>
          <div class="bd">
            <div id="preview_area" style="max-height:70vh; overflow:auto;"></div>
            <div id="chart_area" style="margin-top:10px;"></div>
          </div>
        </div>
      </div>
    </div>
  `);

  // --- state ---
  const state = {
    templates: [],
    template_doc: null,
    rows: [],
    rowOrder: [],
    dataset: null,
    profile: 'CFO',
    lastView: 'flat', // flat|variance|pivot
  };

  const profiles = {
    'CEO': { mode: 'Both' },
    'CFO': { mode: 'Both' },
    'Department Head': { mode: 'Actual' }
  };

  function setProfile(name) {
    state.profile = name;
    $('#profile_name').text(name);
    const p = profiles[name] || profiles['CFO'];
    $('#mode').val(p.mode || 'Both');
  }

  function getFilters() {
    const filters = {
      company: $('#company').val(),
      from_date: $('#from_date').val(),
      to_date: $('#to_date').val(),
      mode: $('#mode').val()
    };
    // collect dimension chips
    $('#dim_filters').find('[data-fieldname]').each(function() {
      const fn = $(this).attr('data-fieldname');
      const v = $(this).attr('data-value');
      if (fn && v) filters[fn] = v;
    });
    return filters;
  }

  async function loadTemplates() {
    const r = await frappe.db.get_list('MIS Report Template', { fields: ['name','template_title'], limit: 200 });
    state.templates = r || [];
    const $sel = $('#mis_template').empty();
    $sel.append(`<option value="">${__('Select')}</option>`);
    for (const t of state.templates) {
      $sel.append(`<option value="${frappe.utils.escape_html(t.name)}">${frappe.utils.escape_html(t.template_title || t.name)}</option>`);
    }
  }

  async function loadSettingsAndDims() {
    // settings
    try {
      const s = await frappe.call('alphax_mis_designer.api.get_settings');
      // dims list
      const d = await frappe.call('alphax_mis_designer.api.get_dimensions');
      const dims = d.message || [];
      const $chips = $('#dim_filters').empty();

      // show three default quick filters as pickers (Cost Center, Project, Department/LOB if configured)
      const quick = [];
      const dept_fn = (s.message && s.message.department_dimension_fieldname) ? s.message.department_dimension_fieldname : 'department';
      const lob_fn  = (s.message && s.message.lob_dimension_fieldname) ? s.message.lob_dimension_fieldname : 'custom_lob';
      quick.push({label: __('Cost Center'), fieldname:'cost_center'});
      quick.push({label: __('Project'), fieldname:'project'});
      quick.push({label: __('Department'), fieldname:dept_fn});
      quick.push({label: __('LOB'), fieldname:lob_fn});

      for (const q of quick) {
        const id = `dim_${q.fieldname}`;
        $chips.append(`
          <div style="min-width:220px">
            <label class="control-label">${frappe.utils.escape_html(q.label)}</label>
            <input class="form-control input-xs" id="${id}" placeholder="${q.fieldname}">
          </div>
        `);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async function loadTemplateDoc(name) {
    state.template_doc = await frappe.db.get_doc('MIS Report Template', name);
    state.rows = (state.template_doc.row_mappings || []).map(r => ({
      row_key: r.row_key, label: r.label, base_cell: r.base_cell,
      accounts: r.accounts, account_groups: r.account_groups, sign_factor: r.sign_factor
    }));
    state.rowOrder = state.rows.map(r => r.row_key);
    renderRowList();
  }

  function renderRowList() {
    const $list = $('#row_list').empty();
    const map = new Map(state.rows.map(r => [r.row_key, r]));
    const ordered = state.rowOrder.map(k => map.get(k)).filter(Boolean);
    for (const r of ordered) {
      const lbl = frappe.utils.escape_html(r.label || r.row_key);
      const meta = frappe.utils.escape_html(r.base_cell || '');
      $list.append(`
        <div class="alphax-row" draggable="true" data-rowkey="${frappe.utils.escape_html(r.row_key)}">
          <div class="drag">⋮⋮</div>
          <div class="lbl">
            <div><b>${lbl}</b></div>
            <div class="meta">${meta}</div>
          </div>
          <div class="btns">
            <button class="btn btn-default btn-xs btn-drill" title="${__('Drill to General Ledger')}">↗</button>
          </div>
        </div>
      `);
    }
    wireDnD();
  }

  function wireDnD() {
    let dragKey = null;
    $('#row_list .alphax-row').on('dragstart', function(e) {
      dragKey = $(this).data('rowkey');
      e.originalEvent.dataTransfer.effectAllowed = 'move';
    });
    $('#row_list .alphax-row').on('dragover', function(e) {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'move';
    });
    $('#row_list .alphax-row').on('drop', function(e) {
      e.preventDefault();
      const targetKey = $(this).data('rowkey');
      if (!dragKey || !targetKey || dragKey === targetKey) return;
      const arr = state.rowOrder.slice();
      const from = arr.indexOf(dragKey);
      const to = arr.indexOf(targetKey);
      if (from < 0 || to < 0) return;
      arr.splice(from, 1);
      arr.splice(to, 0, dragKey);
      state.rowOrder = arr;
      renderRowList();
      // re-render preview using current order
      renderPreview();
    });

    // drill-down button
    $('#row_list .btn-drill').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const rowkey = $(this).closest('.alphax-row').data('rowkey');
      drillDown(rowkey);
    });
  }

  function computeKPIs(rows) {
    // rows are flat dataset entries
    const total = rows.reduce((a,r)=>a + (Number(r.value)||0), 0);
    const actual = rows.reduce((a,r)=>a + (Number(r.actual)||0), 0);
    const budget = rows.reduce((a,r)=>a + (Number(r.budget)||0), 0);
    const variance = actual - budget;
    return { total, actual, budget, variance };
  }

  function renderKPIs(k) {
    const fmt = (v)=> frappe.format(v || 0, {fieldtype:'Currency'});
    $('#kpis').html(`
      <div class="alphax-kpi"><div class="t">${__('Total (Mode)')}</div><div class="v">${fmt(k.total)}</div></div>
      <div class="alphax-kpi"><div class="t">${__('Actual')}</div><div class="v">${fmt(k.actual)}</div></div>
      <div class="alphax-kpi"><div class="t">${__('Budget')}</div><div class="v">${fmt(k.budget)}</div></div>
      <div class="alphax-kpi"><div class="t">${__('Variance')}</div><div class="v">${fmt(k.variance)}</div></div>
    `);
  }

  function rowsOrderedForPreview(rows) {
    const idx = new Map(state.rowOrder.map((k,i)=>[k,i]));
    return rows.slice().sort((a,b)=> (idx.get(a.row_key)??999999) - (idx.get(b.row_key)??999999));
  }

  function renderPreview() {
    const area = $('#preview_area').empty();
    if (!state.dataset) {
      area.html(`<div class="text-muted">${__('No data. Click Preview.')}</div>`);
      return;
    }
    const view = state.lastView || 'flat';
    if (view === 'pivot') {
      const cols = state.dataset.period_columns || [];
      const rows = state.dataset.rows || [];
      const ordered = rowsOrderedForPreview(rows);
      let html = `<table class="alphax-table"><thead><tr><th>${__('Row')}</th><th>${__('Dimension')}</th>`;
      for (const c of cols) html += `<th>${frappe.utils.escape_html(c)}</th>`;
      html += `</tr></thead><tbody>`;
      for (const r of ordered) {
        html += `<tr><td><b>${frappe.utils.escape_html(r.label||r.row_key)}</b></td><td>${frappe.utils.escape_html(r.dimension||'')}</td>`;
        for (const c of cols) html += `<td style="text-align:right;">${frappe.format(r[c]||0, {fieldtype:'Currency'})}</td>`;
        html += `</tr>`;
      }
      html += `</tbody></table>`;
      area.html(html);
      return;
    }

    // flat / variance
    const rows = state.dataset.rows || [];
    const ordered = rowsOrderedForPreview(rows);

    // compact table: group by row_key + dimension + show last period only + totals by row
    const group = new Map();
    for (const r of ordered) {
      const key = `${r.row_key}||${r.dimension}`;
      const g = group.get(key) || { row_key:r.row_key, label:r.label, dimension:r.dimension, last:null, sum:0, actual:0, budget:0, variance:0, variance_percent:null };
      g.sum += Number(r.value)||0;
      g.actual += Number(r.actual)||0;
      g.budget += Number(r.budget)||0;
      if (r.period) g.last = r.period;
      group.set(key, g);
    }
    const compact = Array.from(group.values()).map(g => {
      g.variance = g.actual - g.budget;
      g.variance_percent = g.budget ? (g.variance / g.budget * 100.0) : null;
      return g;
    });

    let html = `<table class="alphax-table"><thead><tr>
      <th>${__('Row')}</th><th>${__('Dimension')}</th>
      <th style="text-align:right;">${__('Actual')}</th>
      <th style="text-align:right;">${__('Budget')}</th>
      <th style="text-align:right;">${__('Variance')}</th>
      <th style="text-align:right;">${__('Total')}</th>
    </tr></thead><tbody>`;
    for (const r of compact) {
      html += `<tr data-rowkey="${frappe.utils.escape_html(r.row_key)}">
        <td><b>${frappe.utils.escape_html(r.label||r.row_key)}</b></td>
        <td>${frappe.utils.escape_html(r.dimension||'')}</td>
        <td style="text-align:right;">${frappe.format(r.actual||0,{fieldtype:'Currency'})}</td>
        <td style="text-align:right;">${frappe.format(r.budget||0,{fieldtype:'Currency'})}</td>
        <td style="text-align:right;">${frappe.format(r.variance||0,{fieldtype:'Currency'})}</td>
        <td style="text-align:right;">${frappe.format(r.sum||0,{fieldtype:'Currency'})}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    area.html(html);

    // row click drill
    area.find('tr[data-rowkey]').on('click', function() {
      drillDown($(this).data('rowkey'));
    });
  }

  async function drillDown(row_key) {
    if (!state.template_doc) return;
    const rm = (state.template_doc.row_mappings || []).find(x => x.row_key === row_key);
    if (!rm) return;

    // Choose first account if available, else open template for mapping
    const accounts = (rm.accounts || '').split('\n').map(s=>s.trim()).filter(Boolean);
    const filters = getFilters();
    if (!filters.company || !filters.from_date || !filters.to_date) {
      frappe.msgprint(__('Set Company, From Date, To Date first.'));
      return;
    }
    if (!accounts.length) {
      frappe.msgprint(__('No accounts mapped for this row. Please fill Accounts / Account Groups in template.'));
      return;
    }
    // Open General Ledger query report with route options
    frappe.route_options = {
      company: filters.company,
      from_date: filters.from_date,
      to_date: filters.to_date,
      account: accounts[0]
    };
    frappe.set_route('query-report', 'General Ledger');
  }

  async function preview(view='flat') {
    const template = $('#mis_template').val();
    const filters = getFilters();
    if (!template) return frappe.msgprint(__('Template is required.'));
    if (!filters.company || !filters.from_date || !filters.to_date) return frappe.msgprint(__('Company, From Date and To Date are mandatory'));

    // attach quick filters from input fields (cost_center/project/department/lob)
    $('#dim_filters input').each(function() {
      const id = $(this).attr('id') || '';
      const fn = id.replace(/^dim_/, '');
      const v = $(this).val();
      if (fn && v) filters[fn] = v;
    });

    frappe.dom.freeze(__('Fetching...'));
    try {
      let method = 'alphax_mis_designer.bi.get_dataset';
      if (view === 'variance') method = 'alphax_mis_designer.bi.get_variance_dataset';
      if (view === 'pivot') method = 'alphax_mis_designer.bi.get_pivot_dataset';
      const r = await frappe.call(method, { template, filters });
      state.dataset = r.message;
      state.lastView = view;
      // KPIs from flat/variance; for pivot, compute from flattening
      let flat = [];
      if (view === 'pivot') {
        // approx: sum all period cells
        const rows = (state.dataset.rows || []);
        const cols = (state.dataset.period_columns || []);
        for (const rr of rows) {
          for (const c of cols) flat.push({ value: Number(rr[c]||0), actual: 0, budget:0 });
        }
      } else {
        flat = state.dataset.rows || [];
      }
      renderKPIs(computeKPIs(flat));
      renderPreview();
    } finally {
      frappe.dom.unfreeze();
    }
  }

  async function exportXLSX() {
    const template = $('#mis_template').val();
    const filters = getFilters();
    if (!template) return frappe.msgprint(__('Template is required.'));
    if (!filters.company || !filters.from_date || !filters.to_date) return frappe.msgprint(__('Company, From Date and To Date are mandatory'));
    $('#dim_filters input').each(function() {
      const fn = ($(this).attr('id')||'').replace(/^dim_/, '');
      const v = $(this).val();
      if (fn && v) filters[fn] = v;
    });
    frappe.dom.freeze(__('Generating file...'));
    try {
      const r = await frappe.call('alphax_mis_designer.api.generate_xlsx', { template, filters });
      const url = r.message && r.message.file_url;
      if (url) window.open(url);
    } finally {
      frappe.dom.unfreeze();
    }
  }

  async function exportCSV() {
    const template = $('#mis_template').val();
    const filters = getFilters();
    if (!template) return frappe.msgprint(__('Template is required.'));
    if (!filters.company || !filters.from_date || !filters.to_date) return frappe.msgprint(__('Company, From Date and To Date are mandatory'));
    $('#dim_filters input').each(function() {
      const fn = ($(this).attr('id')||'').replace(/^dim_/, '');
      const v = $(this).val();
      if (fn && v) filters[fn] = v;
    });
    frappe.dom.freeze(__('Generating file...'));
    try {
      const r = await frappe.call('alphax_mis_designer.bi.export_csv', { template, filters });
      const url = r.message && r.message.file_url;
      if (url) window.open(url);
    } finally {
      frappe.dom.unfreeze();
    }
  }

  async function saveRun() {
    const template = $('#mis_template').val();
    const filters = getFilters();
    if (!template) return frappe.msgprint(__('Template is required.'));
    if (!filters.company || !filters.from_date || !filters.to_date) return frappe.msgprint(__('Company, From Date and To Date are mandatory'));
    $('#dim_filters input').each(function() {
      const fn = ($(this).attr('id')||'').replace(/^dim_/, '');
      const v = $(this).val();
      if (fn && v) filters[fn] = v;
    });
    const values = await frappe.prompt([{ fieldname:'notes', fieldtype:'Small Text', label: __('Notes') }], null, __('Save Run'), __('Save'));
    frappe.dom.freeze(__('Saving...'));
    try {
      const r = await frappe.call('alphax_mis_designer.runs.save_run', { template, filters, notes: values?.notes });
      frappe.msgprint(__('Saved Run: {0}', [r.message?.name || '']));
    } finally {
      frappe.dom.unfreeze();
    }
  }

  async function openProfilesDialog() {
    const d = new frappe.ui.Dialog({
      title: __('Dashboard Profiles'),
      fields: [
        { fieldtype:'HTML', fieldname:'html' }
      ]
    });
    d.fields_dict.html.$wrapper.html(`
      <div class="alphax-split">
        <div class="alphax-card"><div class="hd">CEO</div><div class="bd">
          <div class="text-muted">${__('High-level KPIs + variance view')}</div>
          <button class="btn btn-primary btn-sm" data-prof="CEO">${__('Use CEO')}</button>
        </div></div>
        <div class="alphax-card"><div class="hd">CFO</div><div class="bd">
          <div class="text-muted">${__('Budget vs Actual + export + saved runs')}</div>
          <button class="btn btn-primary btn-sm" data-prof="CFO">${__('Use CFO')}</button>
        </div></div>
        <div class="alphax-card"><div class="hd">Department Head</div><div class="bd">
          <div class="text-muted">${__('Actual-focused, drill-down to GL')}</div>
          <button class="btn btn-primary btn-sm" data-prof="Department Head">${__('Use Dept Head')}</button>
        </div></div>
      </div>
    `);
    d.show();
    d.$wrapper.find('button[data-prof]').on('click', function() {
      setProfile($(this).data('prof'));
      d.hide();
    });
  }

  // wire events
  $('#btn_preview').on('click', ()=> preview('flat'));
  $('#btn_export_xlsx').on('click', exportXLSX);
  $('#btn_export_csv').on('click', exportCSV);
  $('#btn_save_run').on('click', saveRun);
  $('#btn_variance').on('click', ()=> preview('variance'));
  $('#btn_pivot').on('click', ()=> preview('pivot'));
  $('#btn_profiles').on('click', openProfilesDialog);
  $('#btn_saved_runs').on('click', ()=> frappe.set_route('List','MIS Report Run'));
  $('#btn_open_template').on('click', ()=> {
    const t = $('#mis_template').val();
    if (t) frappe.set_route('Form','MIS Report Template', t);
  });
  $('#btn_reorder_reset').on('click', ()=> {
    if (!state.template_doc) return;
    state.rowOrder = (state.template_doc.row_mappings||[]).map(r=>r.row_key);
    renderRowList();
    renderPreview();
  });

  $('#mis_template').on('change', async function() {
    const name = $(this).val();
    if (!name) return;
    frappe.dom.freeze(__('Loading template...'));
    try {
      await loadTemplateDoc(name);
    } finally {
      frappe.dom.unfreeze();
    }
  });

  // init defaults
  (async () => {
    setProfile('CFO');
    await loadTemplates();
    await loadSettingsAndDims();
    // attempt set default company
    try {
      const c = frappe.defaults.get_default('Company');
      if (c) $('#company').val(c);
    } catch(e) {}
  })();
};
