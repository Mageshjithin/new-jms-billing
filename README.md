# JMS Textiles Billing System

A React + Vite billing and stock app with an Express + Node.js API that stores data in a local JSON file. The app supports barcode/QR scanner keyboard input, inventory, checkout, sales history and a daily summary.

## Features

- Scan a product barcode/QR code with a phone camera or USB/Bluetooth scanner (the scanner types into the focused barcode field and sends Enter), or search by name/SKU. Camera access requires permission and HTTPS (or localhost).
- Add items to a bill, adjust quantities, set an optional discount and GST percentage, and save the sale.
- Invoice numbers use the format `JMS-YYYYMMDD-N`; the final number starts at 1 and increments across days.
- Stock is checked and decremented on the server when a bill is saved. The invoice has a printable layout.
- Add and edit products, including SKU, barcode, price and opening stock.
- View recent bills and sales totals.

## Run locally

Requirements: Node.js 20+. No database server is needed: data is saved to `server/data/db.json` (created automatically on the first save). Set `DATA_FILE` to store it elsewhere.

1. Copy `server/.env.example` to `server/.env` and set the admin login and `JWT_SECRET`.
2. From this folder run:

   ```bash
   npm install
   npm run install:all
   npm run dev
   ```

3. Open <http://localhost:5180>. The API runs on <http://localhost:5000/api>.

The development Vite server proxies `/api` to the backend.

## Deploy manually with Vercel

The root `vercel.json` deploys the frontend and backend together as one Vercel project using Services:

- `client` (Vite) serves every path except `/api/*`.
- `server` (Express, entry `server/src/app.js`) handles `/api/*` on the same domain, so no `VITE_API_URL` or CORS setup is needed.

Steps:

- Import this GitHub repository and keep **Root Directory** as the repository root.
- Add `ADMIN_USERNAME`, a strong `ADMIN_PASSWORD`, a random `JWT_SECRET` of at least 32 characters, and optionally `INVOICE_PREFIX` in Project Settings → Environment Variables.
- Deploy.

**Note:** Vercel's serverless file system is temporary, so data saved by a backend deployed there will be lost. Run the backend on a machine with a persistent disk (for example the shop PC with `npm start`) if you rely on local storage. Never commit `.env` or credentials.

## API overview

- `GET /api/health`
- `GET /api/products?search=`
- `POST /api/products`
- `DELETE /api/products` (clear all inventory products; bills are retained)
- `PATCH /api/products/:id`
- `GET /api/bills?limit=30`
- `POST /api/bills`
- `GET /api/dashboard/summary`

## Notes

- Billing and inventory APIs require an admin sign-in; the 12-hour session token is held in browser local storage. Use a strong unique server password and JWT secret.
- This is a starter billing system. Confirm the shop's GST, invoice numbering, receipt format and legal requirements before using invoices for statutory accounting.
- Each save (product or bill) is applied as a single all-or-nothing write to the data file, so a failed bill never reduces stock. Run only one server process against the same data file.
- Back up `server/data/db.json` regularly. Configure your shop's actual product catalogue and opening stock before billing.
