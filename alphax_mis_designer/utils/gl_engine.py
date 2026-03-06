import frappe

def sum_gl(company: str, from_date: str, to_date: str, accounts: list[str], dim_filters: dict) -> float:
    if not accounts:
        return 0.0
    conditions = [
        "gle.company = %(company)s",
        "gle.posting_date between %(from_date)s and %(to_date)s",
        "gle.is_cancelled = 0",
        "gle.account in %(accounts)s"
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date, "accounts": tuple(accounts)}
    for k, v in (dim_filters or {}).items():
        if v:
            conditions.append(f"gle.`{k}` = %({k})s")
            params[k] = v
    q = f"""
        select coalesce(sum(gle.credit),0) - coalesce(sum(gle.debit),0)
        from `tabGL Entry` gle
        where {' and '.join(conditions)}
    """
    return float(frappe.db.sql(q, params)[0][0] or 0.0)
