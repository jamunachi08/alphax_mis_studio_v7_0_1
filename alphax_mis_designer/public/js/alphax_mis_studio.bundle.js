// bundle missing

// v3: Save Run (snapshot)
if (typeof $ !== 'undefined') {
  $(document).on('click', '#btn_save_run', async () => {
    try {
      const template = $('#mis_template').val();
      const filters = (typeof getFilters === 'function') ? getFilters() : {};
      if (!template || !filters.company || !filters.from_date || !filters.to_date) {
        frappe.msgprint(__('Template, Company, From Date, To Date are required.'));
        return;
      }
      const values = await frappe.prompt([{fieldname:'notes', fieldtype:'Small Text', label: __('Notes')}], null, __('Save Run'), __('Save'));
      frappe.dom.freeze(__('Saving...'));
      try {
        const r = await frappe.call('alphax_mis_designer.runs.save_run', { template, filters, notes: values?.notes });
        frappe.msgprint(__('Saved Run: {0}', [r.message?.name || '']));
      } finally {
        frappe.dom.unfreeze();
      }
    } catch (e) {
      console.error(e);
      frappe.msgprint(__('Failed to save run. Check console.'));
    }
  });
}
