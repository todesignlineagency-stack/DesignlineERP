# Design Line Agency ERP

Design Line Agency ERP now runs in **GitHub Direct Mode**.

## Live App
`https://todesignlineagency-stack.github.io/DesignlineERP/chatgpt-erp/`

## Current Mode
- Hosted on GitHub Pages
- No login screen
- No password/authentication gate
- No Firebase Authentication
- No Cloud Firestore
- No Firebase Hosting dependency
- No Google Apps Script / Google Sheets backend
- ERP opens directly on the Dashboard
- Data is saved in the current browser using localStorage
- Use the built-in JSON Backup before changing browser/device or clearing browser data

## Modules
- Dashboard
- Orders with multiple line items
- Quotations and quotation-to-order workflow
- Customers and WhatsApp actions
- Expenses
- Vendors and vendor ledger/payments
- Reports
- Invoice / quotation printing
- Light / Dark theme

## Important Data Note
GitHub Pages is static hosting. ERP source code and deployment live on GitHub, but orders/customers/payments are stored in the browser, not committed into the GitHub repository. This avoids exposing a GitHub write token inside the public website.
