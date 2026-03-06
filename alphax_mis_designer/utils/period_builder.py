from frappe.utils import getdate, add_months, add_days, formatdate

def build_month_periods(from_date: str, to_date: str):
    f = getdate(from_date)
    t = getdate(to_date)
    periods = []
    cur = f.replace(day=1)
    while cur <= t:
        start = cur
        end = add_months(cur, 1).replace(day=1)
        end = add_days(end, -1)
        if start < f: start = f
        if end > t: end = t
        key = f"{cur.year:04d}-{cur.month:02d}"
        label = formatdate(cur, "MMM-yyyy")
        periods.append({"key": key, "label": label, "from": str(start), "to": str(end)})
        cur = add_months(cur, 1)
    return periods
