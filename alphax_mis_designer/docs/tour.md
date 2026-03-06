# AlphaX MIS Studio Tour\n\n1) Create template\n2) Map rows\n3) Run in MIS Studio\n\nOpen Visual Builder: /app/alphax-mis-builder\n

## Visual Builder v5.1 — Formula Syntax
- Use **row_key** identifiers: `revenue - cogs - opex`
- Use parentheses: `(revenue - cogs) - opex`
- Use numbers: `revenue * 0.15`

## Row Types
- Heading: just label (section header)
- Account: accounts list
- Account Group: account group list
- Formula: computes from row keys
- Subtotal: formula or default section subtotal


## Executive MIS Board (v5.2)
Open: `/app/alphax-mis-board`
- Select Visual Template
- Run KPIs + Section chart
- Click rows to drill-down to General Ledger


## Final Boss (v5.3)
- Multi-account drilldown: click row → choose account
- Auto Subtotals: Builder button generates subtotal rows per section
- Board Presets: save CEO/CFO/Dept presets
- BI URL: copy dataset URL for PowerBI/Tableau


## Ultra Drilldown (v5.4)
- Drilldown opens **AlphaX General Ledger** with ALL accounts in the row.
- Report supports MultiSelect Accounts + dimensions.


# AlphaX MIS Studio v6 — What’s New
## Excel Layout Importer
Open: `/app/alphax-mis-excel-importer`
1. Upload Excel into File/Attach
2. Paste file URL
3. Analyze
4. Create Visual Template (auto mapping suggestions)

## MIS Canvas
Open: `/app/alphax-mis-canvas`
- Quick KPI layout from Visual Template

## Dashboard Designer
Open: `/app/alphax-mis-dashboard-designer`
- Pick KPI row keys and save dashboard


## v6.1 PowerBI Canvas
- Designer: `/app/alphax-mis-canvas-designer` (DnD reorder + span)
- Canvas: `/app/alphax-mis-canvas` (run + export excel + print)


## v6.2 True Resize + Widgets
- Canvas Designer: x/y move + resize handle.
- Widgets: KPI, Donut, Gauge, Trend, Section Bar, Top KPIs Bar, Mini Table.


## v6.3 Boss Upgrade
- Grid overlay + ghost preview.
- Auto Pack ON/OFF to avoid overlaps.


## v6.4 Ultra Boss
- Multi-select + group move.
- Copy/Paste + Duplicate widget.
- Duplicate layout.
- Collision push + snap guides.


## v6.5 God Mode
- Lock widgets + z-order.
- Align/Distribute.
- Export/Import Layout JSON.
- Minimal displacement collision.


## v6.6 Reality Bender
- Undo/Redo (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z).
- Group resize for multi-selection.
- Smart snap guides (edge/center).
- Lock modes: position vs size.


# v7 Analytics OS (Skeleton)
- Admin Console: /app/alphax-mis-admin
- Builder alias: /app/alphax-mis-builder
- New DocTypes: MIS Dataset / MIS Metric / MIS Dimension / MIS Data Model
<<<<<<< HEAD


# v7.1 Template-driven MIS
Open MIS Visual Template and MIS Report Template, import XLSX, map rows/cols, preview.


# v7.3 MAP Sheet Auto Mapping
MIS Report Template now has Import MAP Sheet. Default sheet name: MAP.
=======
>>>>>>> 9a3a9702254590c7f240162bcd8e4c0d9481f3f4
