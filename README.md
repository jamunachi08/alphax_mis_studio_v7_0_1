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
