# Excel QR Generator

An enterprise-ready, user-friendly web application to transform any Microsoft Excel workbook (`.xlsx`, `.xls`) into a permanent, scan-ready QR code. Recipients can scan the code on any smartphone (iOS / Android) and download the original file directly with zero app installation and no required account.

---

## 🚀 Key Features

- **Direct Excel File Upload**: Drag-and-drop or browse `.xlsx` and `.xls` files with instant validation (file extension, MIME type, file signature magic bytes, and configurable 50MB file size limit).
- **Permanent Routing Architecture**: QR codes encode a stable application route (`/f/:fileId`) rather than temporary or expiring storage URLs. The QR code never breaks even if storage access changes or files are updated.
- **Robust QR Code Engine**:
  - High Error-Correction (Level H – recovers up to 30% of obscured or distorted codes).
  - Scalable vector export (**SVG**) for crisp print posters, brochures, and stickers.
  - Multi-resolution raster export (**PNG 512px, 1024px, 2048px Ultra HD**).
- **Zero-Friction Recipient Experience**:
  - Mobile-optimized landing page when scanned on iPhone or Android.
  - Displays original filename, format, size, and 1-click Download button.
  - Automatically triggers `Content-Disposition: attachment` preserving workbook structure and formulas.
- **Upload History & Management**:
  - Local history tracking per device.
  - Re-download QR codes or original files anytime.
  - Deactivate/delete workbooks with instant QR invalidation.
- **Supabase Powered**:
  - PostgreSQL database table `excel_files` for metadata.
  - Dedicated Supabase Storage bucket `excel-files`.
  - Secure Row-Level Security (RLS) policies and storage access rules.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 + Plus Jakarta Sans & JetBrains Mono typography |
| **Backend & Database** | Supabase PostgreSQL |
| **Storage Engine** | Supabase Storage (`excel-files` bucket) |
| **QR Code Generation** | `qrcode` (PNG DataURL & SVG Vector string generation) |
| **Icons & Notifications** | `lucide-react` + Custom lightweight reactive toast notifications |
| **Deployment** | Vercel (`vercel.json` SPA rewrites) |

---

## 📋 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **pnpm** or **yarn**
- A free **Supabase** account ([supabase.com](https://supabase.com))

### 2. Installation
```bash
git clone <your-repo>
cd "qr code generation"
npm install
```

### 3. Supabase Setup in 3 Minutes

1. **Create a project** in [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/migrations/20250101000000_create_excel_files.sql` from this repository (or copy it from the in-app Supabase Setup modal), paste it into the SQL Editor, and click **Run**.
   - This creates the `excel_files` table with all indexes.
   - Creates the `excel-files` storage bucket with a 50MB limit.
   - Configures public read and anonymous upload policies.
   - Creates the `increment_download_count` RPC function.
4. Go to **Project Settings → API** in Supabase and copy:
   - **Project URL**
   - **anon (public) key**

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key-here

# Optional: Set base URL for QR codes
# For local network phone testing (replace with your computer's LAN IP):
# VITE_PUBLIC_APP_URL=http://192.168.1.100:5173
# For production:
# VITE_PUBLIC_APP_URL=https://your-app.vercel.app
```

> **Tip**: You can also enter or test your Supabase credentials directly through the in-app **Supabase Configuration** modal in the top navigation bar.

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📱 Testing with a Real Smartphone on Local Wi-Fi

1. Find your computer's local Wi-Fi IP address (e.g. `192.168.1.50`).
2. Run Vite with host exposure:
   ```bash
   npx vite --host
   ```
3. Open the app on your computer, click **Setup Supabase**, and set **Public App Base URL** to `http://192.168.1.50:5173`.
4. Upload an Excel workbook.
5. Scan the generated QR code with your iPhone or Android camera—it will instantly load the download page on your phone!

---

## 🚀 Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your repository.
4. Add the following Environment Variables in Vercel:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `VITE_PUBLIC_APP_URL`: Your production Vercel domain (e.g., `https://excel-qr.vercel.app`)
5. Click **Deploy**.
6. The included `vercel.json` automatically handles client-side routing rewrites for permanent URLs like `/f/:fileId`.

---

## 🔒 Security & Reliability

- **No Secrets in Client**: Only the public anon key is used on the client. The service-role key is never exposed.
- **Strict File Validation**: Files are validated before upload by extension, MIME type, and binary magic bytes to prevent masquerading files.
- **Unpredictable Storage Paths**: Every file receives a UUIDv4 and sanitized path (`spreadsheets/<uuid>/<safe_name>`) preventing directory traversal or filename collision.
- **Safe Content Delivery**: Downloads are served with proper headers and original filename preservation without executing or parsing spreadsheet macros or formulas.
- **Soft Deletion**: Deleting a workbook removes the storage object and deactivates the route.
