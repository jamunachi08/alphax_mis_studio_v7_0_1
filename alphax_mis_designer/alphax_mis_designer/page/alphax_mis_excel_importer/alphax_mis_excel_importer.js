frappe.pages['alphax-mis-excel-importer'].on_page_load = function(wrapper) {
  frappe.ui.make_app_page({ parent: wrapper, title: __('AlphaX MIS Excel Importer'), single_column: true });
  const $main = $(wrapper).find('.layout-main-section');

  $main.html(`
    <div class="alphax-dash">
      <div class="alphax-dash-header">
        <div>
          <h3 style="margin:0;">${__('Excel Layout Importer')}</h3>
          <div class="text-muted">${__('Upload your MIS Excel format → analyze → auto-create Visual Template with mapping suggestions.')}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-default" id="tour">${__('Help & Tour')}</button>
          <button class="btn btn-default" id="builder">${__('Open Builder')}</button>
        </div>
      </div>

      <div class="alphax-dash-card">
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px;">
          <div>
            <label>${__('Company')}</label>
            <input class="form-control" id="company">
          </div>
          <div>
            <label>${__('Excel File (Attach URL)')}</label>
            <input class="form-control" id="file" placeholder="/files/your.xlsx">
            <div class="text-muted" style="font-size:11px;">${__('Tip: Upload to File/Attach first, then paste the file URL.')}</div>
          </div>
          <div>
            <label>${__('Sheet Name (optional)')}</label>
            <input class="form-control" id="sheet" placeholder="Sheet1">
          </div>
          <div>
            <label>${__('Label Column / Start Row')}</label>
            <div style="display:flex; gap:8px;">
              <input class="form-control" id="col" type="number" value="1" style="max-width:110px;">
              <input class="form-control" id="row" type="number" value="1" style="max-width:110px;">
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="analyze">${__('Analyze')}</button>
          <button class="btn btn-success" id="create" disabled>${__('Create Visual Template')}</button>
        </div>

        <div id="out" style="margin-top:12px;"></div>
      </div>
    </div>
  `);

  const state = { analysis: null };

  $('#tour').on('click', ()=> frappe.set_route('alphax-mis-tour'));
  $('#builder').on('click', ()=> frappe.set_route('alphax-mis-builder'));

  const c = frappe.defaults.get_default('Company');
  if (c) $('#company').val(c);

  function esc(s){ return frappe.utils.escape_html(s||''); }

  $('#analyze').on('click', async ()=>{
    const excel_file = $('#file').val();
    if (!excel_file) return frappe.msgprint(__('Please paste Excel file URL (Attach).'));
    frappe.dom.freeze(__('Analyzing...'));
    try {
      const r = await frappe.call('alphax_mis_designer.utils.excel_importer.analyze_excel_whitelist', {
        excel_file,
        sheet_name: $('#sheet').val() || null,
        label_column: Number($('#col').val()||1),
        start_row: Number($('#row').val()||1)
      });
      state.analysis = r.message;
      $('#create').prop('disabled', false);

      const labels = (state.analysis.labels||[]).slice(0, 80);
      $('#out').html(`
        <div class="text-muted">${__('Found')} <b>${state.analysis.total_labels}</b> ${__('labels in sheet')} <b>${esc(state.analysis.sheet_name)}</b></div>
        <hr>
        <div style="max-height:50vh; overflow:auto;">
          <table class="table table-bordered">
            <thead><tr><th>#</th><th>${__('Row')}</th><th>${__('Label')}</th></tr></thead>
            <tbody>
              ${labels.map((x,i)=>`<tr><td>${i+1}</td><td>${x.row}</td><td>${esc(x.label)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="text-muted" style="font-size:11px;">${__('Showing first 80 labels only.')}</div>
        </div>
      `);
    } finally {
      frappe.dom.unfreeze();
    }
  });

  $('#create').on('click', async ()=>{
    if (!state.analysis) return;
    const company = $('#company').val();
    if (!company) return frappe.msgprint(__('Company is required.'));
    const title = await frappe.prompt([{fieldname:'title', fieldtype:'Data', label:__('Visual Template Title'), reqd:1}], __('Create Visual Template'), __('Create'));
    frappe.dom.freeze(__('Creating...'));
    try {
      const r = await frappe.call('alphax_mis_designer.utils.excel_importer.create_visual_template_from_excel', {
        company,
        title: title.title,
        analysis: state.analysis,
        section_name: __('Imported')
      });
      frappe.msgprint(__('Created Visual Template: {0}', [r.message.visual_template]));
      frappe.set_route('Form','MIS Visual Template', r.message.visual_template);
    } finally {
      frappe.dom.unfreeze();
    }
  });
};
