import frappe
from frappe.utils.csvutils import to_csv

@frappe.whitelist()
def export_dataset_csv(dataset: str, filters: str | None = None):
    from .datasets import run_dataset
    res = run_dataset(dataset=dataset, filters=filters, limit=5000, offset=0)
    columns = res.get("columns") or []
    rows = res.get("rows") or []
    header = [c.get("label") or c.get("fieldname") for c in columns]
    csv = to_csv([header] + rows)
    frappe.local.response.filename = f"{dataset}.csv"
    frappe.local.response.filecontent = csv
    frappe.local.response.type = "download"
    return
