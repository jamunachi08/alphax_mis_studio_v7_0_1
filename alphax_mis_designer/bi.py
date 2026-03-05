import csv, io
import frappe
from frappe import _
from alphax_mis_designer.utils.runner import run_template
from alphax_mis_designer.utils.xlsx_exporter import export_filled_template

def _require(template: str, filters: dict):
    if not template:
        frappe.throw(_("template is required"))
    if not (filters or {}).get("company"):
        frappe.throw(_("filters.company is required"))
    if not (filters or {}).get("from_date") or not (filters or {}).get("to_date"):
        frappe.throw(_("filters.from_date and filters.to_date are required"))

@frappe.whitelist()
def get_dataset(template: str, filters: dict | None = None):
    filters = filters or {}
    _require(template, filters)
    res = run_template(template_name=template, filters=filters, preview_only=True)
    return {"meta": {"template": template, "company": res.get("company"), "from_date": res.get("from_date"), "to_date": res.get("to_date"), "mode": res.get("mode")},
            "periods": res.get("periods", []), "rows": res.get("preview", [])}

@frappe.whitelist()
def get_variance_dataset(template: str, filters: dict | None = None):
    filters = filters or {}
    _require(template, filters)
    filters = dict(filters)
    filters["mode"] = "Both"
    res = run_template(template_name=template, filters=filters, preview_only=True)
    out = []
    for r in (res.get("preview") or []):
        actual = float(r.get("actual") or 0)
        budget = float(r.get("budget") or 0)
        variance = actual - budget
        v_pct = (variance / budget * 100.0) if budget else None
        out.append({**r, "variance": variance, "variance_percent": v_pct})
    return {"meta": {"template": template, "company": res.get("company"), "from_date": res.get("from_date"), "to_date": res.get("to_date")},
            "periods": res.get("periods", []), "rows": out}

@frappe.whitelist()
def get_pivot_dataset(template: str, filters: dict | None = None):
    filters = filters or {}
    _require(template, filters)
    res = run_template(template_name=template, filters=filters, preview_only=True)
    periods = [p.get("label") for p in (res.get("periods") or [])]
    grouped = {}
    for r in (res.get("preview") or []):
        key = (r.get("row_key"), r.get("label"), r.get("dimension"))
        g = grouped.setdefault(key, {"row_key": key[0], "label": key[1], "dimension": key[2]})
        g[r.get("period")] = float(r.get("value") or 0)
    return {"meta": {"template": template, "company": res.get("company"), "from_date": res.get("from_date"), "to_date": res.get("to_date"), "mode": res.get("mode")},
            "period_columns": periods, "rows": list(grouped.values())}

@frappe.whitelist()
def export_csv(template: str, filters: dict | None = None):
    filters = filters or {}
    _require(template, filters)
    res = run_template(template_name=template, filters=filters, preview_only=True)
    rows = res.get("preview", []) or []
    headers = ["row_key","label","cell","period","dimension","actual","budget","value"]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=headers)
    w.writeheader()
    for r in rows:
        w.writerow({k: r.get(k) for k in headers})
    content = buf.getvalue().encode("utf-8")
    filename = f"{template}-MIS.csv"
    f = frappe.get_doc({"doctype":"File","file_name":filename,"is_private":1,"content":content,
                        "attached_to_doctype":"MIS Report Template","attached_to_name":template}).insert(ignore_permissions=True)
    return {"file_url": f.file_url, "file_name": f.file_name}

@frappe.whitelist()
def export_xlsx(template: str, filters: dict | None = None):
    filters = filters or {}
    _require(template, filters)
    wb_bytes, filename = export_filled_template(template, filters)
    f = frappe.get_doc({"doctype":"File","file_name":filename,"is_private":1,"content":wb_bytes,
                        "attached_to_doctype":"MIS Report Template","attached_to_name":template}).insert(ignore_permissions=True)
    return {"file_url": f.file_url, "file_name": f.file_name}
