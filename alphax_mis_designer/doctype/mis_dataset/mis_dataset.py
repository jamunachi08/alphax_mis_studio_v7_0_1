import frappe
from frappe.model.document import Document
from frappe import _

class MISDataset(Document):
    def execute(self, filters=None, limit=2000, offset=0):
        filters = filters or {}
        st = (self.source_type or "").strip()

        if st == "Query Report":
            if not self.query_report:
                frappe.throw(_("Query Report is required"))
            from frappe.desk.query_report import run
            res = run(self.query_report, filters=filters)
            columns = res.get("columns") or []
            rows = res.get("result") or []

            norm_cols = []
            for c in columns:
                if isinstance(c, str):
                    parts = c.split(":")
                    norm_cols.append({"label": parts[0], "fieldname": frappe.scrub(parts[0])})
                else:
                    norm_cols.append({"label": c.get("label"), "fieldname": c.get("fieldname")})
            return {"columns": norm_cols, "rows": rows[offset:offset+limit]}

        if st == "SQL Template":
            sql = (self.sql_template or "").strip()
            if not sql:
                frappe.throw(_("SQL Template is required"))
            first = sql.lstrip().split(None, 1)[0].lower() if sql else ""
            if first != "select":
                frappe.throw(_("Only SELECT queries are allowed"))
            sql2 = sql + f" LIMIT {int(limit)} OFFSET {int(offset)}"
            data = frappe.db.sql(sql2, filters, as_dict=True)
            cols = [{"label": k, "fieldname": k} for k in (data[0].keys() if data else [])]
            rows = [[d.get(c['fieldname']) for c in cols] for d in data]
            return {"columns": cols, "rows": rows}

        frappe.throw(_("Source Type not implemented in v7.0 skeleton: {0}").format(st))
