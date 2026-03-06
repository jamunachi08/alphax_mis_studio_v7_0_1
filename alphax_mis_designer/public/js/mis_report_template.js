frappe.ui.form.on('MIS Report Template', {
  refresh(frm){
    if (!frm.is_new()){
      frm.add_custom_button(__('Import From Excel'), async () => {
        await frm.call('import_from_excel');
        frappe.msgprint(__('Imported successfully.'));
        frm.reload_doc();
      });
      frm.add_custom_button(__('Import MAP Sheet'), async () => {
        const res = await frm.call('import_map_sheet');
        const m = res.message || {};
        frappe.msgprint(__('MAP imported. Rows created: {0}', [m.rows_created || 0]));
        frm.reload_doc();
      });
      frm.add_custom_button(__('Preview'), async () => {
        const d = new frappe.ui.Dialog({
          title: __('Preview MIS Template'),
          fields: [
            {fieldname:'company', fieldtype:'Link', options:'Company', label:'Company'},
            {fieldname:'from_date', fieldtype:'Date', label:'From Date', reqd:1},
            {fieldname:'to_date', fieldtype:'Date', label:'To Date', reqd:1},
            {fieldname:'department', fieldtype:'Link', options:'Cost Center', label:'Department (mapped)'},
            {fieldname:'cost_center', fieldtype:'Link', options:'Cost Center', label:'Cost Center'},
            {fieldname:'project', fieldtype:'Link', options:'Project', label:'Project'},
          ],
          primary_action_label: __('Render'),
          primary_action: async (vals) => {
            const res = await frm.call('render_html', {filters: JSON.stringify(vals)});
            const html = res.message && res.message.html ? res.message.html : '<div class="text-muted">No HTML</div>';
            const w = window.open('', '_blank');
            w.document.write(html);
            w.document.close();
          }
        });
        d.show();
      });
    }
  }
});
