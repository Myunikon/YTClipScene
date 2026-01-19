import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_DIR = path.resolve(__dirname, '../src-tauri/binaries');

if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
}

// Map Node platform/arch to Rust/Tauri target triples
const getTargetTriple = () => {
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
    const platform = process.platform;

    if (platform === 'win32') return `${arch}-pc-windows-msvc`;
    if (platform === 'darwin') return `${arch}-apple-darwin`;
    if (platform === 'linux') return `${arch}-unknown-linux-gnu`;

    throw new Error(`Unknown platform: ${platform}`);
};

const TARGET_TRIPLE = getTargetTriple();
console.log(`[SETUP] Target Triple: ${TARGET_TRIPLE}`);

// Follow redirects and download file
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const makeRequest = (currentUrl) => {
            const protocol = currentUrl.startsWith('https') ? https : require('http');
            protocol.get(currentUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SceneClip/1.0)' }
            }, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    makeRequest(response.headers.location);
                    return;
                }
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }
                const file = createWriteStream(dest);
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(dest));
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => reject(err));
            });
        };
        makeRequest(url);
    });
};

// Extract ZIP file (Windows)
async function extractZip(zipPath, extractDir) {
    if (process.platform === 'win32') {
        await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`);
    } else {
        await execAsync(`unzip -o "${zipPath}" -d "${extractDir}"`);
    }
}

// Extract tar.xz file (Linux/macOS)
async function extractTarXz(tarPath, extractDir) {
    await execAsync(`tar -xf "${tarPath}" -C "${extractDir}"`);
}

async function setupYtDlp() {
    const ytdlpName = process.platform === 'win32' ? `yt-dlp-${TARGET_TRIPLE}.exe` : `yt-dlp-${TARGET_TRIPLE}`;
    const ytdlpPath = path.join(BIN_DIR, ytdlpName);

    if (fs.existsSync(ytdlpPath)) {
        console.log(`[SKIP] yt-dlp already exists: ${ytdlpName}`);
        return;
    }

    let ytdlpUrl = '';
    if (process.platform === 'linux') {
        ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    } else if (process.platform === 'darwin') {
        ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    } else if (process.platform === 'win32') {
        ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    }

    console.log(`[DOWNLOAD] yt-dlp from ${ytdlpUrl}...`);
    await downloadFile(ytdlpUrl, ytdlpPath);
    fs.chmodSync(ytdlpPath, 0o755);
    console.log(`[OK] Saved yt-dlp to ${ytdlpName}`);
}

async function setupFfmpeg() {
    const ffmpegName = process.platform === 'win32' ? `ffmpeg-${TARGET_TRIPLE}.exe` : `ffmpeg-${TARGET_TRIPLE}`;
    const ffmpegPath = path.join(BIN_DIR, ffmpegName);

    if (fs.existsSync(ffmpegPath)) {
        console.log(`[SKIP] ffmpeg already exists: ${ffmpegName}`);
        return;
    }

    const tempDir = path.join(BIN_DIR, 'temp_ffmpeg');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
        if (process.platform === 'win32') {
            // Windows: Download from BtbN/FFmpeg-Builds (GPL build with all codecs)
            const ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
            const zipPath = path.join(tempDir, 'ffmpeg.zip');

            console.log(`[DOWNLOAD] ffmpeg from BtbN/FFmpeg-Builds...`);
            await downloadFile(ffmpegUrl, zipPath);

            console.log(`[EXTRACT] Extracting ffmpeg...`);
            await extractZip(zipPath, tempDir);

            // Find ffmpeg.exe in extracted folder
            const extractedDir = fs.readdirSync(tempDir).find(f => f.startsWith('ffmpeg-'));
            const ffmpegExe = path.join(tempDir, extractedDir, 'bin', 'ffmpeg.exe');

            if (fs.existsSync(ffmpegExe)) {
                fs.copyFileSync(ffmpegExe, ffmpegPath);
                fs.chmodSync(ffmpegPath, 0o755);
                console.log(`[OK] ffmpeg setup complete: ${ffmpegName}`);
            } else {
                throw new Error(`ffmpeg.exe not found in extracted archive`);
            }

        } else if (process.platform === 'darwin') {
            // macOS: Download from evermeet.cx
            const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
            // evermeet.cx provides universal binaries
            const ffmpegUrl = 'https://evermeet.cx/ffmpeg/getrelease/zip';
            const zipPath = path.join(tempDir, 'ffmpeg.zip');

            console.log(`[DOWNLOAD] ffmpeg from evermeet.cx...`);
            await downloadFile(ffmpegUrl, zipPath);

            console.log(`[EXTRACT] Extracting ffmpeg...`);
            await extractZip(zipPath, tempDir);

            const ffmpegBin = path.join(tempDir, 'ffmpeg');
            if (fs.existsSync(ffmpegBin)) {
                fs.copyFileSync(ffmpegBin, ffmpegPath);
                fs.chmodSync(ffmpegPath, 0o755);
                console.log(`[OK] ffmpeg setup complete: ${ffmpegName}`);
            } else {
                throw new Error(`ffmpeg not found in extracted archive`);
            }

        } else if (process.platform === 'linux') {
            // Linux: Download from johnvansickle.com (static build)
            const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
            const ffmpegUrl = `https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${arch}-static.tar.xz`;
            const tarPath = path.join(tempDir, 'ffmpeg.tar.xz');

            console.log(`[DOWNLOAD] ffmpeg from johnvansickle.com...`);
            await downloadFile(ffmpegUrl, tarPath);

            console.log(`[EXTRACT] Extracting ffmpeg...`);
            await extractTarXz(tarPath, tempDir);

            // Find ffmpeg in extracted folder
            const extractedDir = fs.readdirSync(tempDir).find(f => f.startsWith('ffmpeg-'));
            const ffmpegBin = path.join(tempDir, extractedDir, 'ffmpeg');

            if (fs.existsSync(ffmpegBin)) {
                fs.copyFileSync(ffmpegBin, ffmpegPath);
                fs.chmodSync(ffmpegPath, 0o755);
                console.log(`[OK] ffmpeg setup complete: ${ffmpegName}`);
            } else {
                throw new Error(`ffmpeg not found in extracted archive`);
            }
        }
    } finally {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

async function main() {
    console.log('='.repeat(50));
    console.log('SceneClip Binary Setup');
    console.log('='.repeat(50));

    await setupYtDlp();
    await setupFfmpeg();

    console.log('='.repeat(50));
    console.log('[DONE] All binaries ready!');
    console.log('='.repeat(50));
}

main().catch(e => {
    console.error('[ERROR]', e);
    process.exit(1);
});
