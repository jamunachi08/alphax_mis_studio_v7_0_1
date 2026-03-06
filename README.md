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
