# Design Line ERP — Google Sheets Cloud Setup

Frontend: GitHub Pages
Database: Google Sheets
Bridge: Google Apps Script Web App
Firebase: Not used
Login: Not used

## Cloud database
Spreadsheet ID:
`1zm0XvdY6zYREUIvVbHf7pRoZCnWHgandxjgObYNi4uk`

Spreadsheet URL:
`https://docs.google.com/spreadsheets/d/1zm0XvdY6zYREUIvVbHf7pRoZCnWHgandxjgObYNi4uk/edit`

## One-time Apps Script deployment
1. Open the cloud database spreadsheet.
2. Extensions → Apps Script.
3. Delete the default code in `Code.gs`.
4. Copy the complete `chatgpt-erp/Code.gs` file from this GitHub repository and paste it into Apps Script.
5. Save the project as `DesignLine ERP Cloud API`.
6. Deploy → New deployment → Web app.
7. Execute as: Me.
8. Who has access: Anyone.
9. Deploy and authorize the Google account.
10. Copy the `/exec` Web App URL.

## Connect ERP
1. Open the GitHub Pages ERP.
2. Settings → Google Sheets Cloud Sync.
3. Paste the Apps Script `/exec` URL.
4. Click `Save Cloud URL`.
5. Click `Test Cloud`.
6. Click `Push Now` once from the main office PC to upload the current ERP database.
7. On another device, open the ERP, enter the same URL once, then click `Pull Latest`.

## How syncing works
- Every ERP save is stored locally first.
- When a cloud URL is configured, the same save is sent to Google Sheets.
- On startup the ERP checks the cloud state and loads the newest copy.
- The hidden `State` sheet stores the complete JSON database in safe chunks.
- Readable tabs (`Customers`, `Orders`, `OrderItems`, etc.) are refreshed from the same cloud state.

## Important
This setup intentionally has no user login. The Apps Script Web App URL acts as the cloud endpoint. Do not post the `/exec` URL publicly.