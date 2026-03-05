import frappe
from frappe import _

@frappe.whitelist()
def list_metrics(model: str):
    if not model:
        frappe.throw(_("Model is required"))
    doc = frappe.get_doc("MIS Data Model", model)
    return [{"metric": m.metric, "label": m.metric_label, "format": m.format} for m in (doc.metrics or [])]
