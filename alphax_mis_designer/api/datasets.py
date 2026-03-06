import json
import frappe
from frappe import _

@frappe.whitelist()
def run_dataset(dataset: str, filters: str | None = None, limit: int = 2000, offset: int = 0):
    """Run a dataset safely and return rows + meta (v7.0 skeleton)."""
    if not dataset:
        frappe.throw(_("Dataset is required"))

    f = json.loads(filters) if filters else {}
    limit = min(int(limit or 2000), 5000)
    offset = max(int(offset or 0), 0)

    doc = frappe.get_doc("MIS Dataset", dataset)
    return doc.execute(filters=f, limit=limit, offset=offset)
