frappe.pages['alphax-mis-dashboard-designer'].on_page_load = function(wrapper) {
  frappe.ui.make_app_page({ parent: wrapper, title: __('AlphaX MIS Dashboard Designer'), single_column: true });
  const $main = $(wrapper).find('.layout-main-section');

  $main.html(`
    <div class="alphax-dash">
      <div class="alphax-dash-header">
        <div>
          <h3 style="margin:0;">${__('Dashboard Designer')}</h3>
          <div class="text-muted">${__('Pick KPI rows from Visual Template and save a reusable dashboard layout (v6).')}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-default" id="tour">${__('Help & Tour')}</button>
          <button class="btn btn-default" id="canvas">${__('Open Canvas')}</button>
        </div>
      </div>

      <div class="alphax-dash-card">
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div>
            <label>${__('Visual Template')}</label>
            <select class="form-control" id="vt"></select>
          </div>
          <div>
            <label>${__('Profile')}</label>
            <select class="form-control" id="profile">
              <option>CEO</option><option selected>CFO</option><option>Department Head</option>
            </select>
          </div>
          <div>
            <label>${__('Dashboard Title')}</label>
            <input class="form-control" id="title" placeholder="CFO MIS Dashboard">
          </div>
        </div>

        <div style="margin-top:10px;">
          <label>${__('Select KPI Rows (by Row Key)')}</label>
          <select class="form-control" id="kpis" multiple style="height:180px;"></select>
          <div class="text-muted" style="font-size:11px; margin-top:6px;">${__('Choose up to 12 KPI rows. You can reorder later in layout JSON.')}</div>
        </div>

        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="save">${__('Save Dashboard')}</button>
          <button class="btn btn-default" id="open">${__('Open Saved')}</button>
        </div>

        <div id="out" style="margin-top:12px;"></div>
      </div>
    </div>
  `);

  $('#tour').on('click', ()=> frappe.set_route('alphax-mis-tour'));
  $('#canvas').on('click', ()=> frappe.set_route('alphax-mis-canvas'));

  async function loadTemplates(){
    const list = await frappe.db.get_list('MIS Visual Template', { fields:['name','template_title'], limit: 200 });
    const $s = $('#vt'); $s.empty();
    (list||[]).forEach(x=> $s.append(`<option value="${x.name}">${frappe.utils.escape_html(x.template_title||x.name)}</option>`));
    await loadRows();
  }

  async function loadRows(){
    const vt = $('#vt').val();
    if (!vt) return;
    const doc = await frappe.db.get_doc('MIS Visual Template', vt);
    const rows = (doc.rows||[]).filter(r=>!r.is_hidden && r.row_type!=='Heading' && (r.row_key||'').trim());
    const $k = $('#kpis'); $k.empty();
    rows.forEach(r=> $k.append(`<option value="${r.row_key}">${frappe.utils.escape_html(r.row_key)} — ${frappe.utils.escape_html(r.label||'')}</option>`));
  }

  $('#vt').on('change', loadRows);

  async function save(){
    const vt = $('#vt').val();
    const title = $('#title').val();
    if (!vt || !title) return frappe.msgprint(__('Template + Title required.'));
    const sel = ($('#kpis').val() || []).slice(0, 12);
    const layout = { kpis: sel, version: 1 };

    frappe.dom.freeze(__('Saving...'));
    try {
      const doc = {
        doctype: 'MIS Dashboard',
        dashboard_title: title,
        visual_template: vt,
        profile: $('#profile').val(),
        layout_json: JSON.stringify(layout, null, 2),
        is_public: 0
      };
      const r = await frappe.call('frappe.client.insert', { doc });
      $('#out').html(`<div class="text-muted">${__('Saved')}: <b>${frappe.utils.escape_html(r.message.name)}</b></div>`);
      frappe.set_route('Form','MIS Dashboard', r.message.name);
    } finally {
      frappe.dom.unfreeze();
    }
  }

  async function openSaved(){
    const list = await frappe.db.get_list('MIS Dashboard', { fields:['name','dashboard_title'], limit: 200 });
    const d = new frappe.ui.Dialog({
      title: __('Open Dashboard'),
      fields: [{ fieldname:'name', fieldtype:'Select', label:__('Dashboard'), options: list.map(x=>x.name).join('\n') }],
      primary_action_label: __('Open'),
      primary_action: async (v)=>{ d.hide(); frappe.set_route('Form','MIS Dashboard', v.name); }
    });
    d.show();
  }

  $('#save').on('click', save);
  $('#open').on('click', openSaved);

  loadTemplates();
};
