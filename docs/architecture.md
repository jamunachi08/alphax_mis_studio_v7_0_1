# Architecture

## Data Flow
Excel Template → Layout Import → Mapping → Runner → Outputs (UI + BI + XLSX)

## Components
1) **Excel Import Engine** (`utils/xlsx_importer.py`)
2) **Mapping Layer** (Row/Column mapping)
3) **GL Engine** (`utils/gl_engine.py`) for actuals from `GL Entry`
4) **Budget Engine** (`utils/budget_engine.py`) from ERPNext `Budget`
5) **Runner** (`utils/runner.py`) computes values + produces BI rows
6) **Export Engine** (`utils/xlsx_exporter.py`) produces filled XLSX
7) **BI Endpoints** (`bi.py`) flat + variance + pivot + exports
8) **Saved Runs** (`MIS Report Run`) stores snapshots for audit/comparison
