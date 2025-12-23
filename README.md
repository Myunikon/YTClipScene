# ClipSceneYT 🎬

**ClipSceneYT** is a modern, high-performance video downloader and clipper built with **Tauri v2** and **React**. It leverages the power of `yt-dlp` and `ffmpeg` to provide a seamless experience for downloading full videos or extracting precise clips with correct metadata.

![License](https://img.shields.io/github/license/Myunikon/YTClipScene)
![Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-blue)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB)

## ✨ Features

- **🚀 High Performance**: Built on Rust (Tauri) for a lightweight and fast desktop experience.
- **✂️ Smart Clipping**: Extract specific segments from videos (e.g., "00:00:10" to "00:00:20") without re-encoding the entire stream.
- **🔧 Phantom Duration Fix**: Includes a custom algorithm to correctly rewrite MP4 metadata, ensuring clipped videos show the actual duration (e.g., 10s) instead of the original source duration.
- **📥 yt-dlp Power**: Supports downloading from thousands of sites supported by yt-dlp.
- **🎨 Modern UI**: Beautiful interface built with TailwindCSS and Framer Motion, featuring Dark/Light mode support.
- **🌍 Internationalization**: Fully localized interface (English, Indonesian, etc.).
- **⚙️ Advanced Control**:
  - Custom filename templates.
  - Proxy and User-Agent support.
  - SponsoBlock integration.
  - Cookie importing for premium downloads.

## 🛠️ Tech Stack

- **Core**: [Tauri v2](https://v2.tauri.app/) (Rust + Webview)
- **Frontend**: React, TypeScript, Vite
- **Styling**: TailwindCSS, Lucide Icons
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Backend/Binaries**: `yt-dlp`, `ffmpeg`, `ffprobe`

## 📦 Installation

Releases are available in the [Releases](https://github.com/Myunikon/YTClipScene/releases) page (Coming Soon).

### Building from Source

1.  **Prerequisites**:

    - [Node.js](https://nodejs.org/) (v18+)
    - [Rust](https://www.rust-lang.org/) (latest stable)
    - [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (for Windows)

2.  **Clone the Repository**:

    ```bash
    git clone https://github.com/Myunikon/YTClipScene.git
    cd YTClipScene
    ```

3.  **Install Dependencies**:

    ```bash
    npm install
    ```

4.  **Run Development Mode**:

    ```bash
    npm run tauri dev
    ```

5.  **Build for Production**:
    ```bash
    npm run tauri build
    ```
    The Installer will be located in `src-tauri/target/release/bundle/nsis/`.

## 🐛 Troubleshooting "Phantom Duration"

If you've experienced issues where a 10-second clip shows up as 20 minutes in Windows Media Player (but plays fine in VLC), this app fixes it!

**The Fix:**
ClipSceneYT forces `ffmpeg` as the downloader for clips and disables `embed-metadata` and `embed-thumbnail` specifically during clipping operations. This prevents `yt-dlp` from injecting the original video's global metadata into the cut file.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and open a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Created by [Myunikon](https://github.com/Myunikon)**
