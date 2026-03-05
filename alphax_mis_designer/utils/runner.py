import re
import frappe
from frappe import _
from alphax_mis_designer.utils.period_builder import build_month_periods
from alphax_mis_designer.utils.accounting_dimensions import get_dimension_fields
from alphax_mis_designer.utils.mis_settings import get_mis_settings
from alphax_mis_designer.utils.gl_engine import sum_gl
from alphax_mis_designer.utils.budget_engine import sum_budget_for_period

def _account_list_from_mapping(company: str, rm) -> list[str]:
    accounts = []
    if rm.accounts:
        accounts += [a.strip() for a in rm.accounts.splitlines() if a.strip()]
    if rm.account_groups:
        groups = [g.strip() for g in rm.account_groups.splitlines() if g.strip()]
        if groups:
            accounts += frappe.get_all("Account", filters={"company": company, "parent_account": ["in", groups]}, pluck="name") or []
    seen, out = set(), []
    for a in accounts:
        if a not in seen:
            seen.add(a)
            out.append(a)
    return out

def _shift_cell(cell: str, col_offset: int, row_offset: int = 0) -> str:
    m = re.match(r"^([A-Z]+)(\d+)$", cell)
    if not m:
        return cell
    col, row = m.group(1), int(m.group(2))
    def col_to_num(c):
        n = 0
        for ch in c:
            n = n * 26 + (ord(ch) - 64)
        return n
    def num_to_col(n):
        s = ""
        while n > 0:
            n, r = divmod(n - 1, 26)
            s = chr(65 + r) + s
        return s
    new_col = num_to_col(col_to_num(col) + col_offset)
    return f"{new_col}{row + row_offset}"

def run_template(template_name: str, filters: dict, preview_only: bool = True) -> dict:
    tpl = frappe.get_doc("MIS Report Template", template_name)
    settings = get_mis_settings()
    company = filters.get("company") or frappe.defaults.get_user_default("Company")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    if not company:
        frappe.throw(_("Company is required"))
    if not from_date or not to_date:
        frappe.throw(_("From Date and To Date are mandatory"))
    mode = (filters.get("mode") or "Actual").strip()
    periods = build_month_periods(from_date, to_date)
    dim_fields = [d["fieldname"] for d in get_dimension_fields()]
    base_dim_filters = {k: filters.get(k) for k in dim_fields if filters.get(k)}
    writes, preview_rows = [], []
    col_maps = tpl.column_mappings or []
    if not col_maps:
        col_maps = [{"dimension_field": None, "dimension_value": None, "col_offset": 0, "label": "Consolidated"}]
    for rm in tpl.row_mappings:
        accounts = _account_list_from_mapping(company, rm)
        sign = float(rm.sign_factor or 1)
        base_cell = (rm.base_cell or "").strip()
        if not base_cell:
            continue
        sheet_prefix, addr = "", base_cell
        if "!" in base_cell:
            sheet_prefix, addr = base_cell.split("!", 1)
            sheet_prefix = sheet_prefix + "!"
        period_step = int(rm.period_col_step or 1)
        for colm in col_maps:
            cdim_field = getattr(colm, "dimension_field", None) if hasattr(colm, "dimension_field") else colm.get("dimension_field")
            cdim_value = getattr(colm, "dimension_value", None) if hasattr(colm, "dimension_value") else colm.get("dimension_value")
            col_offset = int(getattr(colm, "col_offset", 0) if hasattr(colm, "col_offset") else colm.get("col_offset", 0))
            dim_filters = dict(base_dim_filters)
            if cdim_field and cdim_value:
                dim_filters[cdim_field] = cdim_value
            for i, p in enumerate(periods):
                target_addr = _shift_cell(addr, col_offset + (i * period_step), 0)
                target_cell = sheet_prefix + target_addr
                actual = sum_gl(company, p["from"], p["to"], accounts, dim_filters) * sign
                budget = sum_budget_for_period(company, p["from"], p["to"], accounts, dim_filters, settings) * sign
                value = budget if mode == "Budget" else actual
                writes.append({"cell": target_cell, "value": value})
                preview_rows.append({
                    "row_key": rm.row_key,
                    "label": rm.label,
                    "cell": target_cell,
                    "period": p["label"],
                    "dimension": f"{cdim_field}:{cdim_value}" if cdim_field else "Consolidated",
                    "actual": actual,
                    "budget": budget,
                    "value": value
                })
    return {"template": template_name, "company": company, "from_date": from_date, "to_date": to_date, "mode": mode, "periods": periods, "writes": writes, "preview": preview_rows[:2000]}
