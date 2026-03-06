frappe.pages['alphax-mis-admin'].on_page_load = function(wrapper){
  frappe.ui.make_app_page({ parent: wrapper, title: __('AlphaX MIS Admin (v7 Analytics OS)'), single_column: true });
  const $main = $(wrapper).find('.layout-main-section');
  $main.html(`
    <div class="alphax-dash-card">
      <h3>${__('v7 Analytics OS — Admin Console')}</h3>
      <p class="text-muted">${__('Create Datasets, Metrics, Dimensions, and Data Models. Then design canvases using the Builder.')}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-default" id="datasets">${__('MIS Dataset')}</button>
        <button class="btn btn-default" id="metrics">${__('MIS Metric')}</button>
        <button class="btn btn-default" id="dims">${__('MIS Dimension')}</button>
        <button class="btn btn-default" id="models">${__('MIS Data Model')}</button>
        <button class="btn btn-primary" id="builder">${__('Open Builder')}</button>
      </div>
    </div>
  `);

  $('#datasets').on('click', ()=> frappe.set_route('List','MIS Dataset'));
  $('#metrics').on('click', ()=> frappe.set_route('List','MIS Metric'));
  $('#dims').on('click', ()=> frappe.set_route('List','MIS Dimension'));
  $('#models').on('click', ()=> frappe.set_route('List','MIS Data Model'));
  $('#builder').on('click', ()=> frappe.set_route('alphax-mis-canvas-designer'));
};
