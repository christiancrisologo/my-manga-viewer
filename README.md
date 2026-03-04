# 📚 MyMangaViewer

A premium, feature-rich web-based manga and archive viewer.

## ✨ Key Features

- **Multi-Format Support**: Seamlessly view images, ZIP, CBZ, and COZ archives.
- **Encrypted Archives**: Full support for password-protected ZIP/CBZ files using `@zip.js/zip.js`.
- **Smart URL Import**: Auto-load archives using the `?a=[filename]` parameter (supports `.cbz` and `.zip`).
- **JSON Library**: Import and manage your catalog via JSON files or direct editor.
- **Mobile Optimized**: Fully responsive interface with touch-friendly controls and always-visible actions.
- **Premium UI**: Modern design with smooth animations, dark mode, and glassmorphism.

## 🚀 Getting Started

Ensure you have **Node.js** installed.

1. **Install dependencies**:
   ```bash
   yarn install
   # or
   npm install
   ```

2. **Configure Environment**:
   Set your `API_KEY` in `.env.local` for AI-enhanced features.

3. **Run Development Server**:
   ```bash
   yarn dev
   # or
   npm run dev
   ```

## 🛠️ Advanced Usage

### Auto-Loading from Public Folder
Place your `.cbz` or `.zip` files in the `public/` directory and append `?a=filename` to the URL.
The viewer will automatically detect, fetch, and process the archive for you.

### Encrypted Files
If an archive is password-protected, the viewer will automatically prompt for decryption before creating the catalog.

## 📦 Tech Stack
- **React 19** + **Vite**
- **Tailwind CSS 4**
- **zip.js** (for high-performance archive extraction)
- **Node-Unrar-js** (for RAR support)
- **Motion** (for premium animations)
- **IndexedDB** (via idb-keyval for storage)
