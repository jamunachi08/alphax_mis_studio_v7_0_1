frappe.query_reports["AlphaX General Ledger"] = {
  "filters": [
    { "fieldname":"company", "label": __("Company"), "fieldtype":"Link", "options":"Company", "reqd": 1 },
    { "fieldname":"from_date", "label": __("From Date"), "fieldtype":"Date", "reqd": 1 },
    { "fieldname":"to_date", "label": __("To Date"), "fieldtype":"Date", "reqd": 1 },
    {
      "fieldname":"accounts",
      "label": __("Accounts"),
      "fieldtype":"MultiSelectList",
      "reqd": 1,
      get_data: function(txt) {
        return frappe.db.get_link_options("Account", txt);
      }
    },
    { "fieldname":"cost_center", "label": __("Cost Center"), "fieldtype":"Link", "options":"Cost Center" },
    { "fieldname":"project", "label": __("Project"), "fieldtype":"Link", "options":"Project" },
    { "fieldname":"party_type", "label": __("Party Type"), "fieldtype":"Data" },
    { "fieldname":"party", "label": __("Party"), "fieldtype":"Data" }
  ],
  onload: function(report) {
    const c = frappe.defaults.get_default("Company");
    if (c) report.set_filter_value("company", c);
  }
};
