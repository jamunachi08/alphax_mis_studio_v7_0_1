import frappe
from frappe import _
from alphax_mis_designer.utils.gl_engine import sum_gl
from alphax_mis_designer.utils.budget_engine import sum_budget
import ast
import re

_ALLOWED_BINOPS = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow)
_ALLOWED_UNARYOPS = (ast.UAdd, ast.USub)

def _safe_eval_expr(expr: str, values: dict) -> float:
    """Safe expression evaluator: allows numbers, + - * / () and identifiers (row keys)."""
    expr = (expr or "").strip()
    if not expr:
        return 0.0

    # Replace identifiers that are not valid python names (like with dashes) by mapping tokens
    # We support row keys containing letters/numbers/_ only. For others, user should set row_key accordingly.
    tree = ast.parse(expr, mode="eval")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.Name):
            return float(values.get(node.id, 0.0))
        if isinstance(node, ast.BinOp) and isinstance(node.op, _ALLOWED_BINOPS):
            left = _eval(node.left); right = _eval(node.right)
            if isinstance(node.op, ast.Add): return left + right
            if isinstance(node.op, ast.Sub): return left - right
            if isinstance(node.op, ast.Mult): return left * right
            if isinstance(node.op, ast.Div): return left / right if right != 0 else 0.0
            if isinstance(node.op, ast.Mod): return left % right if right != 0 else 0.0
            if isinstance(node.op, ast.Pow): return left ** right
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, _ALLOWED_UNARYOPS):
            val = _eval(node.operand)
            if isinstance(node.op, ast.UAdd): return +val
            if isinstance(node.op, ast.USub): return -val
        raise ValueError("Unsupported expression")
    return float(_eval(tree))

def _split_lines(txt: str) -> list[str]:
    return [x.strip() for x in (txt or "").splitlines() if x.strip()]

def _expand_groups(groups: list[str]) -> list[str]:
    if not groups:
        return []
    out = []
    for g in groups:
        if not g: 
            continue
        # include all children accounts
        out += [a[0] for a in frappe.db.sql("""
            select name from `tabAccount`
            where company=%(company)s and lft >= (select lft from `tabAccount` where name=%(g)s)
              and rgt <= (select rgt from `tabAccount` where name=%(g)s)
              and is_group=0
        """, {"g": g, "company": frappe.defaults.get_default("Company")})]  # company filter best-effort
    return list(dict.fromkeys(out))

@frappe.whitelist()
def preview_visual(visual_template: str, filters: dict, mode: str = "Both"):
    """Preview a visual template without requiring Excel layout.
    Returns sectioned rows with computed values and formula results.
    """
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
    mode = (mode or "Both").title()

    required = ["company", "from_date", "to_date"]
    for k in required:
        if not (filters or {}).get(k):
            frappe.throw(_("Missing required filter: {0}").format(k))

    company = filters["company"]
    from_date = filters["from_date"]
    to_date = filters["to_date"]

    vt = frappe.get_doc("MIS Visual Template", visual_template)

    dim_filters = dict(filters or {})
    for k in ["company","from_date","to_date","mode"]:
        dim_filters.pop(k, None)

    # compute base values
    computed = []
    values_by_key = {}

    # helper: subtotal default sum in section
    section_running = {}

    for r in (vt.rows or []):
        row_type = (r.row_type or "Account").strip()
        section = (r.section or "").strip() or "General"
        row_key = (r.row_key or frappe.scrub(r.label or "")[:60]).strip()
        if not row_key:
            row_key = frappe.generate_hash(length=8)

        # initialize section running
        section_running.setdefault(section, 0.0)

        actual = 0.0
        budget = 0.0

        if row_type in ("Account", "Account Group"):
            accounts = _split_lines(r.accounts)
            groups = _split_lines(r.account_groups) if row_type == "Account Group" else []
            if groups:
                # expand account groups using ERPNext nested set
                # do it per group with company
                expanded = []
                for g in groups:
                    expanded += [a[0] for a in frappe.db.sql("""
                        select name from `tabAccount`
                        where company=%(company)s
                          and lft >= (select lft from `tabAccount` where name=%(g)s)
                          and rgt <= (select rgt from `tabAccount` where name=%(g)s)
                          and is_group=0
                    """, {"company": company, "g": g})]
                accounts = list(dict.fromkeys(accounts + expanded))

            sign = int(r.sign_factor or 1)
            if mode in ("Actual", "Both"):
                actual = float(sum_gl(company, from_date, to_date, accounts, dim_filters)) * sign
            if mode in ("Budget", "Both"):
                budget = float(sum_budget(company, from_date, to_date, accounts, dim_filters)) * sign

        elif row_type == "Formula":
            expr = (r.formula or "").strip()
            # build value set from already computed rows
            if mode in ("Actual","Both"):
                actual = _safe_eval_expr(expr, {k:v["actual"] for k,v in values_by_key.items()})
            if mode in ("Budget","Both"):
                budget = _safe_eval_expr(expr, {k:v["budget"] for k,v in values_by_key.items()})

        elif row_type == "Subtotal":
            expr = (r.formula or "").strip()
            if expr:
                if mode in ("Actual","Both"):
                    actual = _safe_eval_expr(expr, {k:v["actual"] for k,v in values_by_key.items()})
                if mode in ("Budget","Both"):
                    budget = _safe_eval_expr(expr, {k:v["budget"] for k,v in values_by_key.items()})
            else:
                # default: subtotal of section so far
                if mode in ("Actual","Both"):
                    actual = section_running.get(section, 0.0)
                if mode in ("Budget","Both"):
                    budget = section_running.get(section, 0.0)

        elif row_type == "Heading":
            actual = 0.0
            budget = 0.0

        val = actual if mode == "Actual" else budget if mode == "Budget" else (actual + budget)

        # update running sums for section (exclude headings/hidden)
        if row_type not in ("Heading",) and not int(r.is_hidden or 0):
            section_running[section] = section_running.get(section, 0.0) + (actual if mode in ("Actual","Both") else budget)

        values_by_key[row_key] = {"actual": actual, "budget": budget}

        computed.append({
            "section": section,
            "row_key": row_key,
            "row_type": row_type,
            "label": r.label,
            "indent": int(r.indent or 0),
            "is_bold": int(r.is_bold or 0),
            "is_hidden": int(r.is_hidden or 0),
            "actual": actual,
            "budget": budget,
            "variance": (actual - budget) if mode in ("Both",) else 0.0,
            "variance_percent": ((actual - budget)/budget*100.0) if (mode=="Both" and budget) else None,
            "accounts_resolved": accounts if row_type in ("Account","Account Group") else []
        })

    # group by section
    sections = {}
    for row in computed:
        sections.setdefault(row["section"], []).append(row)

    return {"template": vt.name, "title": vt.template_title, "mode": mode, "rows": computed, "sections": sections}

import frappe
from frappe import _

@frappe.whitelist()
def generate_mis_template_from_visual(visual_template, overwrite=0):
    vt=frappe.get_doc('MIS Visual Template', visual_template)
    title=(vt.template_title or '').strip()
    if not title: frappe.throw(_('Template title is required'))
    existing=frappe.db.exists('MIS Report Template', {'template_title': title})
    overwrite=int(overwrite or 0)
    if existing and not overwrite: frappe.throw(_('MIS Report Template exists. Enable overwrite.'))
    doc=frappe.get_doc('MIS Report Template', existing) if existing else frappe.new_doc('MIS Report Template')
    doc.template_title=title
    doc.description=vt.description or ''
    doc.mode='Both'
    doc.set('row_mappings', [])
    for r in (vt.rows or []):
        doc.append('row_mappings', {'row_key': frappe.scrub(r.label)[:60], 'label': r.label, 'base_cell':'', 'period_col_step':1, 'sign_factor': int(r.sign_factor or 1), 'accounts': r.accounts or '', 'account_groups': r.account_groups or ''})
    doc.save(ignore_permissions=True)
    return {'template_name': doc.name}
