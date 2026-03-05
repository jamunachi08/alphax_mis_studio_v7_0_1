import json
import frappe
from frappe.model.document import Document
from frappe import _
from alphax_mis_designer.utils.xlsx_importer import import_xlsx
from alphax_mis_designer.utils.mapping_suggester import suggest_row_mappings
from alphax_mis_designer.utils.account_matcher import match_accounts, match_account_groups
def _json_safe(obj):
    """Make objects JSON serializable (openpyxl colors/styles, decimals, dates, etc.).
    Fixes: TypeError: Object of type RGB is not JSON serializable
    """
    rgb = getattr(obj, "rgb", None)
    if rgb:
        return str(rgb)

    for attr in ("indexed", "theme", "tint", "type"):
        val = getattr(obj, attr, None)
        if val is not None:
            try:
                return int(val)
            except Exception:
                return str(val)

    try:
        return str(obj)
    except Exception:
        return None


class MISReportTemplate(Document):

    @frappe.whitelist()
    def import_from_excel(self):
        if not self.template_xlsx:
            frappe.throw(_("Attach a Template XLSX first."))
        file_doc = frappe.get_doc("File", {"file_url": self.template_xlsx})
        path = file_doc.get_full_path() if file_doc else None
        if not path:
            frappe.throw(_("Cannot resolve XLSX file path."))
        layout = import_xlsx(path)
        self.layout_json = json.dumps(layout, ensure_ascii=False, default=_json_safe)
        self.import_log = _("Imported {0} sheet(s).").format(len(layout.get("sheets", [])))
        self.save(ignore_permissions=True)
        return {"ok": True, "sheets": [s.get("title") for s in layout.get("sheets", [])]}

    @frappe.whitelist()
    def suggest_row_mappings(self, sheet_name: str | None = None, max_rows: int = 250, overwrite: int = 0,
                            header_row: int | None = None, first_month_col: str | None = None,
                            period_col_step: int | None = None, label_col: int | None = None):
        if not self.template_xlsx:
            frappe.throw(_("Attach a Template XLSX first."))
        file_doc = frappe.get_doc("File", {"file_url": self.template_xlsx})
        path = file_doc.get_full_path() if file_doc else None
        if not path:
            frappe.throw(_("Cannot resolve XLSX file path."))

        data = suggest_row_mappings(
            path,
            sheet_name=sheet_name,
            max_rows=int(max_rows or 250),
            header_row=int(header_row) if header_row else None,
            first_month_col=first_month_col,
            period_col_step=int(period_col_step) if period_col_step else None,
            label_col=int(label_col) if label_col else None,
        )
        if data.get("error"):
            return data

        if int(overwrite or 0):
            self.set("row_mappings", [])

        existing = set([x.base_cell for x in (self.row_mappings or []) if x.base_cell])
        added = 0
        for s in data.get("suggestions", []):
            if s["base_cell"] in existing:
                continue
            self.append("row_mappings", {
                "row_key": s["row_key"],
                "label": s["label"],
                "base_cell": s["base_cell"],
                "period_col_step": s["period_col_step"],
                "sign_factor": 1
            })
            added += 1

        self.import_log = (self.import_log or "") + "\n" + _("Suggested {0} row mappings (added {1}).").format(len(data.get("suggestions", [])), added)
        self.save(ignore_permissions=True)
        data["added"] = added
        return data

    @frappe.whitelist()
    def auto_match_accounts(self, company: str, overwrite: int = 0, limit: int = 5):
        """Fill Accounts/Account Groups based on row label matching."""
        if not company:
            frappe.throw(_("Company is required"))
        overwrite = int(overwrite or 0)
        limit = int(limit or 5)

        updated = 0
        preview = []
        for rm in (self.row_mappings or []):
            label = (rm.label or "").strip()
            if not label:
                continue
            if (rm.accounts or rm.account_groups) and not overwrite:
                continue

            accs = match_accounts(company, label, limit=limit)
            grps = match_account_groups(company, label, limit=limit)

            if accs:
                rm.accounts = "\n".join(accs)
            if grps and not accs:  # prefer leaf accounts; keep groups only if no accounts
                rm.account_groups = "\n".join(grps)

            if accs or grps:
                updated += 1

            preview.append({
                "row_key": rm.row_key,
                "label": label,
                "accounts": accs,
                "account_groups": grps
            })

        self.import_log = (self.import_log or "") + "\n" + _("Auto-matched accounts for {0} row(s).").format(updated)
        self.save(ignore_permissions=True)
        return {"updated": updated, "preview": preview[:200]}
