# Excel QR Generator — Local Storage & Cloudflare Tunnel

An enterprise-ready, user-friendly web application to transform Microsoft Excel workbooks (`.xlsx`, `.xls`) into permanent, scan-ready QR codes.

All workbooks are stored **directly on your Windows laptop** in a dedicated local storage directory with metadata persisted in a local **SQLite** database. Remote access from any mobile phone or device is securely enabled through a **Cloudflare Tunnel** while keeping the frontend hosted on **Vercel**.

---

## 🚀 Key Features

- **Local Storage on Windows Laptop**:
  - Files are stored in a dedicated directory on your computer: `C:\ExcelQRStorage\files`.
  - Metadata is persisted in an embedded local SQLite database: `C:\ExcelQRStorage\excel_qr.db`.
  - Exact original workbook bytes and original filenames are preserved without modification or cloud file vendor lock-in.
- **Secure Local Backend (Node.js & Express)**:
  - Validates file signatures (magic bytes for `.xlsx` and legacy `.xls`).
  - Strict UUID v4 file identification and path-traversal prevention.
  - Built-in rate limiting (`express-rate-limit`) and configurable file size limits (50 MB default).
  - Secure deletion authorization via cryptographic delete tokens or optional admin API keys.
- **Permanent Routing Architecture**:
  - QR codes encode a stable application route (`https://YOUR-VERCEL-DOMAIN/f/:fileId`).
  - No localhost, private LAN IPs, or expiring URLs are ever encoded into QR codes.
- **In-Browser Spreadsheet Viewer & Direct Download**:
  - Responsive multi-sheet spreadsheet viewer displaying all worksheets, rows, columns, and search.
  - One-click "Download Original Excel" button delivering the exact unchanged workbook.
  - Deleting a file instantly deactivates its share link across all scanned QR codes.
- **High-Resolution QR Code Engine**:
  - Error correction Level H (recovers up to 30% of obscured or distorted codes).
  - Scalable vector export (**SVG**) and multi-resolution raster export (**PNG 512px, 1024px, 2048px Ultra HD**).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS |
| **Local Backend** | Node.js + Express (ES Modules) |
| **Local Database** | SQLite (`node:sqlite` built into Node.js 24) |
| **Local File Storage** | `C:\ExcelQRStorage\files` |
| **Internet Tunnel** | Cloudflare Tunnel (`cloudflared`) |
| **Spreadsheet Engine** | SheetJS (`xlsx`) |
| **QR Code Engine** | `qrcode` (PNG & SVG generation) |
| **Frontend Hosting** | Vercel |

---

## 💻 Windows Laptop Setup & Startup

### 1. Start the Local Backend Server
Open a terminal in the project directory and run:
```bash
npm run server
```
Or double-click `start-server.bat`.

The server will automatically create `C:\ExcelQRStorage\files` and `C:\ExcelQRStorage\excel_qr.db` and begin listening on `http://localhost:3001`.

### 2. Expose the Backend via Cloudflare Tunnel
To allow recipients to scan QR codes and download files from any mobile network:

1. **Install cloudflared** (if not already installed):
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. **Start the tunnel**:
   ```powershell
   cloudflared tunnel --url http://localhost:3001
   ```
   Or double-click `start-tunnel.bat`.

3. In the tunnel output, find your public HTTPS address:
   ```
   https://xxxx-xxxx-xxxx.trycloudflare.com
   ```

### 3. Connect the Frontend
Open the frontend in your browser, click **Storage & Server Configuration** in the top navigation or footer, and paste your Cloudflare Tunnel URL:
- **Backend API URL**: `https://xxxx.trycloudflare.com` (or `http://localhost:3001` for local testing)
- **Public Frontend Base URL**: `https://your-app.vercel.app` (leave blank to use current domain)
- Click **Test Backend Connection & Storage**, then click **Save & Connect**.

---

## ⚡ Important: Windows Laptop Availability

> [!IMPORTANT]
> Because uploaded workbooks are stored locally on your laptop's hard drive and served directly by your local backend:
> 1. **Keep your laptop powered on**: Prevent your laptop from going to sleep or hibernating while files need to remain available.
> 2. **Maintain an active internet connection**.
> 3. **Keep the backend server (`start-server.bat`) and Cloudflare Tunnel (`start-tunnel.bat`) running**.
>
> If your laptop is closed, shut down, or offline, recipients scanning QR codes will see a friendly unavailable notice until your laptop is back online.

---

## 🌐 Deploying Frontend to Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Settings → Environment Variables**, add:
   - `VITE_API_BASE_URL`: Your Cloudflare Tunnel URL (e.g. `https://your-tunnel.trycloudflare.com` or custom domain).
   - `VITE_PUBLIC_APP_URL`: Your Vercel production URL (e.g. `https://excel-qr.vercel.app`).
4. Deploy.

---

## 🔒 Security & Safe Handling

- **Filesystem Isolation**: File operations are strictly bound to `C:\ExcelQRStorage\files` using path canonicalization (`path.resolve`) to prevent directory traversal.
- **UUID Validation**: File identifiers are validated against strict UUID v4 expressions.
- **MIME & Magic Bytes**: Files are verified against genuine Microsoft Excel binary signatures (`PK..` for XLSX, `D0 CF 11 E0` for XLS).
- **Authorized Deletion**: Files include a unique cryptographic deletion token so only the original uploader or administrator can delete them.
