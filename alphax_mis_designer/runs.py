import json
import frappe
from frappe import _
from alphax_mis_designer.utils.runner import run_template

@frappe.whitelist()
def save_run(template: str, filters: dict | None = None, notes: str | None = None):
    filters = filters or {}
    if not template:
        frappe.throw(_("template is required"))
    if not filters.get("company"):
        frappe.throw(_("filters.company is required"))
    if not filters.get("from_date") or not filters.get("to_date"):
        frappe.throw(_("filters.from_date and filters.to_date are required"))

    # compute BOTH so snapshot carries actual + budget
    filters = dict(filters)
    filters["mode"] = filters.get("mode") or "Both"

    res = run_template(template_name=template, filters=filters, preview_only=True)
    dims = {k: v for k, v in (filters or {}).items() if k not in ("company","from_date","to_date","mode") and v}

    doc = frappe.get_doc({
        "doctype": "MIS Report Run",
        "template": template,
        "company": res.get("company"),
        "from_date": res.get("from_date"),
        "to_date": res.get("to_date"),
        "mode": res.get("mode"),
        "dimensions_json": json.dumps(dims, ensure_ascii=False),
        "dataset_json": json.dumps(res.get("preview", []), ensure_ascii=False),
        "created_by": frappe.session.user,
        "notes": notes or ""
    }).insert(ignore_permissions=True)
    return {"name": doc.name}

@frappe.whitelist()
def load_run(name: str):
    doc = frappe.get_doc("MIS Report Run", name)
    return {
        "name": doc.name,
        "template": doc.template,
        "company": doc.company,
        "from_date": str(doc.from_date),
        "to_date": str(doc.to_date),
        "mode": doc.mode,
        "dimensions": json.loads(doc.dimensions_json or "{}"),
        "rows": json.loads(doc.dataset_json or "[]"),
    }
