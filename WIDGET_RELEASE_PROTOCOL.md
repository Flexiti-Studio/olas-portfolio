# 📋 Blackboard Protocol: Desktop Companion Widget Release Guide

This protocol outlines the exact step-by-step procedures to build, upload, track, and publish new desktop companion widget updates directly via your Web Admin Dashboard (`https://ola.flexitistudio.com/admin/widget-updates`).

---

## 🛠️ Step 1: Prepare & Increment Version Numbers

Before building a new release, bump version numbers across all project files:

1. **`package.json`**: `"version": "1.2.0"`
2. **`src-tauri/tauri.conf.json`**: `"version": "1.2.0"`
3. **`src-tauri/Cargo.toml`**: `version = "1.2.0"`
4. **`src/components/WidgetFooter.tsx`**: `version = 'v1.2.0'`

---

## ⚙️ Step 2: Compile Production Installers

Open PowerShell or terminal in the `ola's Portfolio Widget` root directory and execute:

```powershell
npm run tauri build
```

This automated command will compile the Rust desktop binary and package installers into:
- **NSIS Setup EXE**: `src-tauri/target/release/bundle/nsis/olas-todo-widget_1.2.0_x64-setup.exe`
- **MSI Installer**: `src-tauri/target/release/bundle/msi/olas-todo-widget_1.2.0_x64_en-US.msi`

---

## ☁️ Step 3: Drag & Drop Installer on Admin Dashboard (One-Click Upload)

1. Open your Web Admin Dashboard: 👉 `https://ola.flexitistudio.com/admin/widget-updates`.
2. **Drag & Drop** your built `.exe` or `.msi` file directly onto the upload dropzone on the dashboard.
3. The dashboard streams the installer directly to your **Cloudflare R2 S3 CDN bucket** (`olasportfolio`), automatically populates the **S3 CDN Download URL** (`https://pub-611c6bf0623f4d68be69771944118b95.r2.dev/downloads/...`), and auto-detects version `1.2.0`.
4. Click **Publish Update Manifest**.

---

## 🔄 Step 4: Version History Tracking & One-Click Rollback

Every published version is stored persistently in your PostgreSQL database (`widget_releases` table).

If a newly released version needs to be rolled back:
1. Open `https://ola.flexitistudio.com/admin/widget-updates`.
2. Scroll to the **"Database Release History & Version Rollback"** section.
3. Locate any past version (e.g. `v1.1.0`) and click **"Revert to v1.1.0"**.
4. The dashboard will instantly activate `v1.1.0` as the active release served to desktop clients!

---

## 🤖 Step 5: AI Assistant Automated Release Details Protocol

After every version change built in our chat conversation, the AI Assistant will automatically provide the following release summary formatted ready for your dashboard:

```markdown
### 📦 Version 1.2.0 Release Details
- **Version String**: `1.2.0`
- **Compiled Installer File**: `src-tauri/target/release/bundle/nsis/olas-todo-widget_1.2.0_x64-setup.exe`
- **Release Notes Summary**: 
  - Ability to create projects directly from the widget dropdown.
  - Full Offline Mode with automatic background syncing when internet reconnects.
  - Tauri v2 Auto-Updater integration with one-click update prompts.
  - Database release history tracking & one-click version rollback.
- **Admin Dashboard Action**: Drag & drop the built `.exe` onto https://ola.flexitistudio.com/admin/widget-updates and paste notes above.
```
