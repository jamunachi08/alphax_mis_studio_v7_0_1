import frappe
from alphax_mis_designer.utils.runner import run_template
from alphax_mis_designer.utils.xlsx_exporter import export_filled_template
from alphax_mis_designer.utils.accounting_dimensions import get_dimension_fields
from alphax_mis_designer.utils.mis_settings import get_mis_settings

@frappe.whitelist()
def get_dimensions():
    return get_dimension_fields()

@frappe.whitelist()
def get_settings():
    return get_mis_settings()

@frappe.whitelist()
def preview(template: str, filters: dict | None = None):
    filters = filters or {}
    return run_template(template_name=template, filters=filters, preview_only=True)

@frappe.whitelist()
def generate_xlsx(template: str, filters: dict | None = None):
    filters = filters or {}
    wb_bytes, filename = export_filled_template(template_name=template, filters=filters)
    f = frappe.get_doc({
        "doctype": "File",
        "file_name": filename,
        "is_private": 1,
        "content": wb_bytes,
        "attached_to_doctype": "MIS Report Template",
        "attached_to_name": template,
    }).insert(ignore_permissions=True)
    return {"file_url": f.file_url, "file_name": f.file_name}

@frappe.whitelist()
def get_tour_markdown(name='tour'):
    import os
    base=os.path.dirname(__file__)
    path=os.path.join(base,'docs',f"{name}.md")
    if not os.path.exists(path):
        return {'title':name,'markdown':f"# {name}\nNot found."}
    return {'title':name,'markdown':open(path,'r',encoding='utf-8').read()}

@frappe.whitelist()
def get_board_kpis(visual_template: str, filters: dict, mode: str = "Both"):
    """Return KPI tiles and section totals for board page using Visual Template."""
    from alphax_mis_designer.visual import preview_visual
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)

    res = preview_visual(visual_template=visual_template, filters=filters, mode=mode)
    rows = res.get("rows", [])

    sec_tot = {}
    total_actual = 0.0
    total_budget = 0.0

    for r in rows:
        if r.get("is_hidden"):
            continue
        if r.get("row_type") == "Heading":
            continue
        sec = r.get("section") or "General"
        sec_tot.setdefault(sec, {"actual": 0.0, "budget": 0.0})
        sec_tot[sec]["actual"] += float(r.get("actual") or 0.0)
        sec_tot[sec]["budget"] += float(r.get("budget") or 0.0)
        total_actual += float(r.get("actual") or 0.0)
        total_budget += float(r.get("budget") or 0.0)

    variance = total_actual - total_budget
    variance_pct = (variance / total_budget * 100.0) if total_budget else None

    return {
        "title": res.get("title"),
        "total_actual": total_actual,
        "total_budget": total_budget,
        "variance": variance,
        "variance_pct": variance_pct,
        "section_totals": sec_tot,
        "rows": rows
    }

@frappe.whitelist()
def list_board_presets(profile: str = None):
    profile = (profile or "").strip()
    filters = {"user": frappe.session.user}
    if profile:
        filters["profile"] = profile
    return frappe.get_all("MIS Board Preset",
        filters=filters,
        fields=["name","preset_title","profile","visual_template","company","mode","date_range","from_date","to_date","dimensions","is_default"],
        order_by="is_default desc, modified desc",
        limit_page_length=200
    )

@frappe.whitelist()
def save_board_preset(preset: dict):
    if isinstance(preset, str):
        preset = frappe.parse_json(preset)

    docname = preset.get("name")
    if docname and frappe.db.exists("MIS Board Preset", docname):
        doc = frappe.get_doc("MIS Board Preset", docname)
    else:
        doc = frappe.new_doc("MIS Board Preset")
        doc.user = frappe.session.user

    for k in ["preset_title","profile","visual_template","company","mode","date_range","from_date","to_date","dimensions","is_default"]:
        if k in preset:
            setattr(doc, k, preset.get(k))

    # enforce ownership
    doc.user = frappe.session.user

    doc.save(ignore_permissions=True)

    # if set default, unset other defaults for same profile
    if int(doc.is_default or 0):
        frappe.db.sql("""
            update `tabMIS Board Preset`
            set is_default = 0
            where user=%s and profile=%s and name != %s
        """, (frappe.session.user, doc.profile, doc.name))
    return {"name": doc.name}

@frappe.whitelist()
def build_bi_url(endpoint: str, params: dict):
    """Return a BI URL (relative) for PowerBI/Tableau connectors."""
    if isinstance(params, str):
        params = frappe.parse_json(params)
    endpoint = (endpoint or "").strip()
    if endpoint not in ("get_dataset","get_variance_dataset","get_pivot_dataset","get_board_kpis"):
        frappe.throw(_("Invalid endpoint"))
    # Build query string safely
    from urllib.parse import urlencode
    qs = urlencode({k: json.dumps(v) if isinstance(v,(dict,list)) else v for k,v in (params or {}).items()})
    return {"url": f"/api/method/alphax_mis_designer.bi.{endpoint}?{qs}" if endpoint.startswith("get_") else f"/api/method/alphax_mis_designer.api.{endpoint}?{qs}"}

@frappe.whitelist()
def list_canvas_layouts(profile: str = None, visual_template: str = None):
    filters_user = {"user": frappe.session.user}
    if profile: filters_user["profile"] = profile
    if visual_template: filters_user["visual_template"] = visual_template
    user_rows = frappe.get_all("MIS Canvas Layout", filters=filters_user,
        fields=["name","layout_title","profile","visual_template","is_default","is_public","modified"],
        order_by="is_default desc, modified desc", limit_page_length=200)

    public_filters = {"is_public": 1}
    if profile: public_filters["profile"] = profile
    if visual_template: public_filters["visual_template"] = visual_template
    pub_rows = frappe.get_all("MIS Canvas Layout", filters=public_filters,
        fields=["name","layout_title","profile","visual_template","is_default","is_public","modified"],
        order_by="modified desc", limit_page_length=200)

    seen=set()
    out=[]
    for r in (user_rows + pub_rows):
        if r.name in seen: continue
        seen.add(r.name)
        out.append(r)
    return out

@frappe.whitelist()
def save_canvas_layout(layout: dict):
    if isinstance(layout, str):
        layout = frappe.parse_json(layout)

    name = layout.get("name")
    if name and frappe.db.exists("MIS Canvas Layout", name):
        doc = frappe.get_doc("MIS Canvas Layout", name)
        if doc.user != frappe.session.user and not frappe.has_permission("MIS Canvas Layout", "write"):
            frappe.throw(_("Not permitted."))
    else:
        doc = frappe.new_doc("MIS Canvas Layout")
        doc.user = frappe.session.user

    for k in ["layout_title","profile","visual_template","layout_json","is_default","is_public"]:
        if k in layout:
            setattr(doc, k, layout.get(k))

    doc.user = frappe.session.user
    doc.save(ignore_permissions=True)

    if int(doc.is_default or 0):
        frappe.db.sql("""update `tabMIS Canvas Layout` set is_default=0
                        where user=%s and profile=%s and name!=%s""", (frappe.session.user, doc.profile, doc.name))
    return {"name": doc.name}

@frappe.whitelist()
def get_row_timeseries(visual_template: str, row_key: str, filters: dict, period: str = "Monthly"):
    """Return monthly actual series for a row based on mapped accounts."""
    if isinstance(filters, str):
        filters = frappe.parse_json(filters) or {}

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    company = filters.get("company")
    if not (company and from_date and to_date):
        frappe.throw(_("Company, From Date, To Date are required."))

    vt = frappe.get_doc("MIS Visual Template", visual_template)
    row = None
    for r in vt.rows:
        if (r.row_key or "").strip() == (row_key or "").strip():
            row = r
            break
    if not row:
        return {"labels": [], "values": []}

    accounts = []
    for a in (row.accounts or "").splitlines():
        a = (a or "").strip()
        if a:
            accounts.append(a)

    if not accounts:
        return {"labels": [], "values": []}

    dim_sql = ""
    dim_vals = []
    ignore = {"company","from_date","to_date","mode"}
    for k,v in (filters or {}).items():
        if k in ignore or v in (None,""):
            continue
        # allow only safe fieldnames
        kk = str(k)
        if not kk.replace("_","").isalnum():
            continue
        dim_sql += f" and gle.`{kk}`=%s"
        dim_vals.append(v)

    rows = frappe.db.sql(f"""
        select date_format(gle.posting_date, '%%Y-%%m') as ym,
               sum(gle.debit - gle.credit) as val
        from `tabGL Entry` gle
        where gle.company=%s
          and gle.posting_date between %s and %s
          and gle.account in ({','.join(['%s']*len(accounts))})
          and gle.is_cancelled=0
          {dim_sql}
        group by ym
        order by ym
    """, [company, from_date, to_date, *accounts, *dim_vals], as_dict=True)

    labels = [r.ym for r in rows]
    values = [float(r.val or 0) for r in rows]
    return {"labels": labels, "values": values, "row_key": row_key, "label": row.label}
