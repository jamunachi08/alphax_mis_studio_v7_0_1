frappe.ui.form.on("MIS Report Template", {
  refresh(frm) {
    frm.add_custom_button(__("Import From Excel"), async () => {
      if (!frm.doc.template_xlsx) return frappe.msgprint(__("Attach Template XLSX first."));
      frappe.dom.freeze(__("Importing..."));
      try {
        const r = await frm.call("import_from_excel");
        frappe.msgprint(__("Imported: {0}", [(r.message?.sheets || []).join(", ")]));
        frm.reload_doc();
      } finally {
        frappe.dom.unfreeze();
      }
    });

    frm.add_custom_button(__("Suggest Row Mappings"), async () => {
      if (!frm.doc.template_xlsx) return frappe.msgprint(__("Attach Template XLSX first."));
      const d = new frappe.ui.Dialog({
        title: __("Suggest Row Mappings (Auto / Manual Override)"),
        fields: [
          {fieldname:"sheet_name", label:"Sheet Name (optional)", fieldtype:"Data"},
          {fieldname:"max_rows", label:"Scan Rows", fieldtype:"Int", default: 250},
          {fieldname:"overwrite", label:"Overwrite existing row mappings", fieldtype:"Check", default: 0},
          {fieldtype:"Section Break", label: __("Manual override (optional)")},
          {fieldname:"header_row", label:"Header Row (month titles)", fieldtype:"Int"},
          {fieldname:"first_month_col", label:"First Month Column (e.g. D)", fieldtype:"Data"},
          {fieldname:"period_col_step", label:"Period Column Step (e.g. 1)", fieldtype:"Int"},
          {fieldname:"label_col", label:"Label Column (1..5)", fieldtype:"Int", default: 1}
        ],
        primary_action_label: __("Run"),
        primary_action: async (values) => {
          frappe.dom.freeze(__("Detecting & generating..."));
          try {
            const r = await frm.call("suggest_row_mappings", values);
            if (r.message?.error) {
              frappe.msgprint(r.message.error);
            } else {
              frappe.msgprint(__("Detected header row {0}, first month col {1}. Added {2} mappings.",
                [r.message.header_row, r.message.first_month_col, r.message.added || 0]));
              frm.reload_doc();
            }
            d.hide();
          } finally {
            frappe.dom.unfreeze();
          }
        }
      });
      d.show();
    });

    frm.add_custom_button(__("Auto Match Accounts"), async () => {
      const d = new frappe.ui.Dialog({
        title: __("Auto Match Accounts"),
        fields: [
          {fieldname:"company", label:"Company", fieldtype:"Link", options:"Company", reqd: 1},
          {fieldname:"overwrite", label:"Overwrite existing accounts/groups", fieldtype:"Check", default: 0},
          {fieldname:"limit", label:"Max matches per row", fieldtype:"Int", default: 5}
        ],
        primary_action_label: __("Run"),
        primary_action: async (values) => {
          frappe.dom.freeze(__("Matching..."));
          try {
            const r = await frm.call("auto_match_accounts", values);
            frappe.msgprint(__("Updated rows: {0}", [r.message?.updated || 0]));
            frm.reload_doc();
            d.hide();
          } finally {
            frappe.dom.unfreeze();
          }
        }
      });
      d.show();
    });

    frm.add_custom_button(__("Open MIS Studio"), () => frappe.set_route("alphax-mis-studio"));
  }
});
