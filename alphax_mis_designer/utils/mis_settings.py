import frappe

def get_mis_settings():
    if not frappe.db.exists("DocType", "MIS Settings"):
        return {}
    s = frappe.get_single("MIS Settings")
    return {
        "department_dimension_fieldname": (s.department_dimension_fieldname or "").strip(),
        "lob_dimension_fieldname": (s.lob_dimension_fieldname or "").strip(),
        "budget_use_monthly_distribution": int(s.budget_use_monthly_distribution or 0),
        "budget_fallback_even_if_no_distribution": int(s.budget_fallback_even_if_no_distribution or 0),
    }
