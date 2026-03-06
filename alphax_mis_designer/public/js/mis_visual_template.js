frappe.ui.form.on('MIS Visual Template', {
  refresh(frm){
    if (!frm.is_new()){
      frm.add_custom_button(__('Import Layout'), async () => {
        await frm.call('import_layout');
        frappe.msgprint(__('Layout imported successfully.'));
        frm.reload_doc();
      });
    }
  }
});
