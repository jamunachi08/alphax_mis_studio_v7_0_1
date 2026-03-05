import frappe
from frappe.utils import getdate

def month_abbr(dt: str) -> str:
    return getdate(dt).strftime("%b")

def monthly_distribution_map(md_name: str) -> dict:
    out = {}
    if not md_name:
        return out
    if frappe.db.table_exists("tabMonthly Distribution Percentage"):
        rows = frappe.get_all(
            "Monthly Distribution Percentage",
            filters={"parent": md_name, "parenttype": "Monthly Distribution"},
            fields=["month", "percentage_allocation"]
        )
        for r in rows:
            out[str(r.month)] = float(r.percentage_allocation or 0)
    return out

def resolve_budget_against_field(budget_against: str, settings: dict) -> str:
    ba = (budget_against or "").strip().lower()
    if ba == "cost center":
        return "cost_center"
    if ba == "project":
        return "project"
    dept_fn = (settings.get("department_dimension_fieldname") or "").strip()
    lob_fn = (settings.get("lob_dimension_fieldname") or "").strip()
    if ba == "department" and dept_fn:
        return dept_fn
    if ba in ("lob", "line of business") and lob_fn:
        return lob_fn
    return ""

def sum_budget_for_period(company: str, period_from: str, period_to: str, accounts: list[str], dim_filters: dict, settings: dict) -> float:
    if not accounts:
        return 0.0
    budgets = frappe.get_all(
        "Budget",
        filters={"company": company, "docstatus": ["in", [0, 1]]},
        fields=["name", "budget_against", "monthly_distribution", "distribute_monthly"]
    )
    if not budgets:
        return 0.0
    month = month_abbr(period_from)
    total = 0.0
    use_md = int(settings.get("budget_use_monthly_distribution") or 0)
    fallback_even = int(settings.get("budget_fallback_even_if_no_distribution") or 0)
    for b in budgets:
        against_field = resolve_budget_against_field(b.get("budget_against"), settings)
        if against_field:
            against_value = dim_filters.get(against_field)
            if not against_value:
                continue
            if not frappe.db.has_column("Budget", against_field):
                continue
            b_val = frappe.db.get_value("Budget", b["name"], against_field)
            if b_val != against_value:
                continue
        baccts = frappe.get_all(
            "Budget Account",
            filters={"parent": b["name"], "parenttype": "Budget", "account": ["in", accounts]},
            fields=["budget_amount"]
        )
        yearly_amt = sum(float(x.budget_amount or 0) for x in baccts)
        if not yearly_amt:
            continue
        if use_md and int(b.get("distribute_monthly") or 0) and b.get("monthly_distribution"):
            md = monthly_distribution_map(b["monthly_distribution"])
            pct = float(md.get(month) or 0)
            total += yearly_amt * (pct / 100.0)
        else:
            total += (yearly_amt / 12.0) if fallback_even else 0.0
    return total
