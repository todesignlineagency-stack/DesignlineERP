# Design Line Agency ERP V2

Independent React + Vite workspace inside the existing repository. The root app, chatgpt-erp and printing-calculator folders remain untouched.

## Run
Install Node.js LTS, then:

```bash
cd design-line-erp-v2
npm install
npm run dev
```

## Current features
- Red/black/grey/white responsive interface, six top navigation tabs
- Branch selection, multi-line flex/wallpaper square-foot and quantity orders
- Design and fitting charges, received and pending amount
- Order history, edit/delete, print invoice, WhatsApp text invoice
- Office expenses, vendor bills and partial vendor payments
- Dashboard payment-based Grand Profit and Current Cash Balance

## Important
Prototype only: data uses localStorage on this device. No CEO authentication, real cloud sync, automated WhatsApp sending, database security, APK or EXE build yet. Do not enter sensitive real customer data until backend and auth are completed.

## Planned production
Supabase Auth/Postgres with row-level security, audit log, file storage, then Vercel web deployment, Tauri desktop, Capacitor Android.
