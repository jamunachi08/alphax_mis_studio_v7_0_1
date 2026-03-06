<<<<<<< HEAD
# AlphaX MIS Studio — v7.1.0 | Template-driven MIS Reports (Excel-as-is)

ERPNext v15 / Frappe Cloud compatible.

## Core workflow (simple + straightforward)
1. Create **MIS Visual Template** → attach XLSX → **Import Layout**
2. Create **MIS Report Template** → link Visual Template (or attach XLSX) → **Import From Excel**
3. Configure:
   - **Row Mappings**: Heading / Account / Account Group / Total (MVP focuses on Account/Group)
   - **Column Mappings**: Opening / Period Net / Closing / YTD / MTD
4. Click **Preview** → filters: Company, From/To, Department, Cost Center, Project

## Department / LOB mapping
- Configure in **MIS Settings** (Single).
- Default Department field is `cost_center`.

## Notes
- v7.1 uses GL Entry sums (debit-credit) and is Cloud-safe.
- Styling in renderer is minimal; v7.2 can render fonts/fills from layout_json styles.


## v7.3.0 (MAP Sheet Auto Mapping)
- Reads MAP sheet automatically
- Builds row mappings from Account -> Label
- Added MAP Sheet Name field on MIS Report Template
=======
# AlphaX MIS Studio — v7.0.0 (Analytics OS Skeleton) | ERPNext v15 / Frappe Cloud

This package is a **v7 foundation** built on AlphaX MIS Studio v6.x.
It keeps the existing Canvas runtime/designer and introduces a clean **semantic layer**.

## New DocTypes (v7)
- **MIS Dataset**: dataset definitions (Query Report / SQL Template)
- **MIS Metric**: KPI definitions (Sum/Avg/Count/Formula)
- **MIS Dimension**: Department/LOB/etc mapping (no hardcoding)
- **MIS Data Model**: bundles dataset + metrics

## New Pages
- Admin Console: `/app/alphax-mis-admin`
- Builder Alias: `/app/alphax-mis-builder`

## API (v7)
- `alphax_mis_designer.api.datasets.run_dataset`
- `alphax_mis_designer.api.export.export_dataset_csv`

## Security Notes
- SQL templates enforce **SELECT only** in v7.0 skeleton.
- Expand with GL/P&L/Budget sources in v7.1+.
>>>>>>> 9a3a9702254590c7f240162bcd8e4c0d9481f3f4
