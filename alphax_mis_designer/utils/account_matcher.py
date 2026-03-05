import re
import frappe

def _norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    return s

def match_accounts(company: str, label: str, limit: int = 10):
    """Return a list of matching Accounts (by account_name / name).
    Strategy: exact normalized match first; then contains match.
    """
    if not label:
        return []
    lab = _norm(label)
    if not lab:
        return []

    # Preload accounts for company (light fields)
    rows = frappe.get_all(
        "Account",
        filters={"company": company, "is_group": 0},
        fields=["name", "account_name"]
    )
    # exact match on normalized account_name or name
    exact = []
    contains = []
    for r in rows:
        an = _norm(r.get("account_name") or "")
        nm = _norm(r.get("name") or "")
        if lab and (lab == an or lab == nm):
            exact.append(r["name"])
        elif lab and (lab in an or lab in nm or an in lab or nm in lab):
            contains.append(r["name"])

    out = exact + [x for x in contains if x not in exact]
    return out[:limit]

def match_account_groups(company: str, label: str, limit: int = 10):
    if not label:
        return []
    lab = _norm(label)
    if not lab:
        return []
    rows = frappe.get_all(
        "Account",
        filters={"company": company, "is_group": 1},
        fields=["name", "account_name"]
    )
    exact = []
    contains = []
    for r in rows:
        an = _norm(r.get("account_name") or "")
        nm = _norm(r.get("name") or "")
        if lab and (lab == an or lab == nm):
            exact.append(r["name"])
        elif lab and (lab in an or lab in nm or an in lab or nm in lab):
            contains.append(r["name"])
    out = exact + [x for x in contains if x not in exact]
    return out[:limit]
