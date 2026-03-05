import frappe
from frappe import _
from frappe.utils import flt

def _parse_accounts(filters):
    acc = filters.get("accounts")
    if not acc:
        return []
    if isinstance(acc, str):
        acc = acc.strip()
        if acc.startswith("[") and acc.endswith("]"):
            try:
                import json
                acc = json.loads(acc)
            except Exception:
                pass
        if isinstance(acc, str):
            acc = [a.strip() for a in acc.split("\n") if a.strip()]
    if not isinstance(acc, (list, tuple)):
        return []
    return [a for a in acc if a]

def _get_dimension_fields():
    meta = frappe.get_meta("GL Entry")
    return set(df.fieldname for df in meta.fields)

def execute(filters=None):
    filters = filters or {}
    for k in ("company", "from_date", "to_date"):
        if not filters.get(k):
            frappe.throw(_("Missing required filter: {0}").format(k))

    company = filters.get("company")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    accounts = _parse_accounts(filters)

    if not accounts:
        frappe.throw(_("Accounts are required for AlphaX General Ledger."))

    dim_fields = _get_dimension_fields()
    conditions = [
        "gle.company = %(company)s",
        "gle.posting_date between %(from_date)s and %(to_date)s"
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    # accounts list
    acc_keys = []
    for i, a in enumerate(accounts):
        k = f"acc_{i}"
        params[k] = a
        acc_keys.append(f"%({k})s")
    conditions.append(f"gle.account in ({', '.join(acc_keys)})")

    # Accept any GL Entry dimension field passed as filter
    for key, val in (filters or {}).items():
        if key in ("company","from_date","to_date","accounts"):
            continue
        if key in dim_fields and val:
            conditions.append(f"gle.{key} = %({key})s")
            params[key] = val

    where = " and ".join(conditions)

    rows = frappe.db.sql(f"""
        select
            gle.posting_date,
            gle.account,
            acc.account_name,
            gle.party_type,
            gle.party,
            gle.voucher_type,
            gle.voucher_no,
            gle.cost_center,
            gle.project,
            gle.debit,
            gle.credit,
            gle.remarks
        from `tabGL Entry` gle
        left join `tabAccount` acc on acc.name = gle.account
        where {where}
        order by gle.posting_date asc, gle.creation asc
        limit 5000
    """, params, as_dict=True)

    balance = 0.0
    for r in rows:
        balance += flt(r.get("debit")) - flt(r.get("credit"))
        r["balance"] = balance

    columns = [
        {"label": _("Posting Date"), "fieldname":"posting_date", "fieldtype":"Date", "width": 100},
        {"label": _("Account"), "fieldname":"account", "fieldtype":"Link", "options":"Account", "width": 160},
        {"label": _("Account Name"), "fieldname":"account_name", "fieldtype":"Data", "width": 180},
        {"label": _("Party Type"), "fieldname":"party_type", "fieldtype":"Data", "width": 100},
        {"label": _("Party"), "fieldname":"party", "fieldtype":"Dynamic Link", "options":"party_type", "width": 140},
        {"label": _("Voucher Type"), "fieldname":"voucher_type", "fieldtype":"Data", "width": 120},
        {"label": _("Voucher No"), "fieldname":"voucher_no", "fieldtype":"Dynamic Link", "options":"voucher_type", "width": 180},
        {"label": _("Cost Center"), "fieldname":"cost_center", "fieldtype":"Link", "options":"Cost Center", "width": 120},
        {"label": _("Project"), "fieldname":"project", "fieldtype":"Link", "options":"Project", "width": 120},
        {"label": _("Debit"), "fieldname":"debit", "fieldtype":"Currency", "width": 110},
        {"label": _("Credit"), "fieldname":"credit", "fieldtype":"Currency", "width": 110},
        {"label": _("Balance"), "fieldname":"balance", "fieldtype":"Currency", "width": 110},
        {"label": _("Remarks"), "fieldname":"remarks", "fieldtype":"Data", "width": 220},
    ]
    return columns, rows
