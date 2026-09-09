# Design Line Agency ERP

This folder contains a deploy-ready ERP MVP for Design Line Agency.

## Modules
- Dashboard: Sales, Profit, Expenses, Pending Bills
- Orders: Flex, Wallpaper, Digital Print, Photocopy, Sublimation, Offset/Packaging, Passport Photos, Wedding Cards, Graphic Design, Other
- Advance / Balance
- Vendor / production cost and profit
- Two quotation types: Offset / Packaging and Digital Print
- Customers + WhatsApp reminder button
- Expenses
- Vendors
- Reports: Today / Week / Month / All Time
- CSV export
- Invoice / quotation print
- CEO/Admin and Staff role display
- Light / Dark theme
- Google Sheets backend connector

## Run from GitHub
Open `index.html` from this folder for code review. For GitHub Pages, deploy the repository from the `main` branch and use `/chatgpt-erp/` as the app path if the root project remains unchanged.

Expected Pages path after Pages is enabled:
`https://todesignlineagency-stack.github.io/DesignlineERP/chatgpt-erp/`

## Connect Google Sheets
1. Create a blank Google Sheet and copy its spreadsheet ID.
2. Open Extensions > Apps Script.
3. Copy `Code.gs` from this folder.
4. Replace `PASTE_GOOGLE_SHEET_ID_HERE` with your spreadsheet ID.
5. Deploy > New deployment > Web app.
6. Execute as: Me.
7. Who has access: Anyone with the link.
8. Copy the Web App URL.
9. Open ERP > Settings > Google Sheets Backend and paste the URL.

## Production upgrades recommended
- Google Sign-In with approved staff Gmail accounts
- Real Admin / Staff authentication instead of the demo role selector
- Server-side CRUD and data loading from Google Sheets
- Audit log
- Automatic backup
- More detailed quotation calculators per service
- Vendor payment ledger
- Customer ledger
