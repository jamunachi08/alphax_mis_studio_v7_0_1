import frappe

def get_dimension_fields():
    out = [
        {"label": "Cost Center", "fieldname": "cost_center"},
        {"label": "Project", "fieldname": "project"},
        {"label": "Department", "fieldname": "department"},
    ]
    if frappe.db.table_exists("tabAccounting Dimension"):
        rows = frappe.get_all(
            "Accounting Dimension",
            filters={"disabled": 0, "document_type": "GL Entry"},
            fields=["label", "fieldname"]
        )
        for r in rows:
            if r.get("fieldname"):
                out.append({"label": r.get("label") or r["fieldname"], "fieldname": r["fieldname"]})
    seen, uniq = set(), []
    for d in out:
        fn = d.get("fieldname")
        if fn and fn not in seen:
            seen.add(fn)
            uniq.append(d)
    return uniq
