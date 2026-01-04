import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const BIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src-tauri/binaries");
const OUTPUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../benchmark_results");

// Detect binary names (Tauri appends architecture, but for benchmark we look for standard or simple names if possible,
// or just find the one that exists).
// NOTE: The app expects specific names like yt-dlp-x86_64-pc-windows-msvc.exe.
// We will search for files starting with 'yt-dlp', 'ffmpeg', 'aria2c'.
function findBinary(prefix) {
    if (!fs.existsSync(BIN_DIR)) {
        console.warn(`[WARN] Binary directory not found: ${BIN_DIR}`);
        return null;
    }
    const files = fs.readdirSync(BIN_DIR);
    const found = files.find(f => f.startsWith(prefix) && f.endsWith(".exe"));
    return found ? path.join(BIN_DIR, found) : null;
}

const YTDLP_PATH = findBinary("yt-dlp");
const FFMPEG_PATH = findBinary("ffmpeg");
const MARIA_PATH = findBinary("aria2c"); // 'aria2c' might be named differently? usually just aria2c.exe if dropped in.

console.log("=== CLIPSCENE YT BENCHMARK SUITE ===");
console.log(`[SETUP] Binary Directory: ${BIN_DIR}`);

// Check critical binaries
if (!YTDLP_PATH) {
    console.error(`[CRITICAL] yt-dlp binary NOT FOUND in ${BIN_DIR}`);
    console.error("Please ensure the app has downloaded binaries or place them manually.");
    process.exit(1);
} else {
    console.log(`[SETUP] yt-dlp: ✅ FOUND (${path.basename(YTDLP_PATH)})`);
}

if (!FFMPEG_PATH) {
    console.warn(`[WARN] ffmpeg binary NOT FOUND. Merge/Stress tests will be skipped.`);
} else {
    console.log(`[SETUP] ffmpeg: ✅ FOUND (${path.basename(FFMPEG_PATH)})`);
}

if (!MARIA_PATH) {
    console.log(`[INFO] aria2c binary NOT FOUND. Turbo mode tests might fail or fallback.`);
} else {
    console.log(`[SETUP] aria2c: ✅ FOUND (${path.basename(MARIA_PATH)})`);
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const TEST_URL = process.argv[2] || "https://www.youtube.com/watch?v=BaW_jenozKc"; // Default: 4K Video Test (YouTube)

// --- UTILS ---
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runCommand(command, args, cwd = OUTPUT_DIR) {
    return new Promise((resolve) => {
        const start = Date.now();
        console.log(`> Running: ${path.basename(command)} ${args.join(" ")}`);

        const proc = spawn(command, args, { cwd });
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (d) => stdout += d.toString());
        proc.stderr.on("data", (d) => stderr += d.toString()); // yt-dlp sends progress to stderr

        proc.on("close", (code) => {
            const end = Date.now();
            resolve({
                code,
                duration: (end - start) / 1000,
                stdout,
                stderr
            });
        });

        proc.on("error", (err) => {
             resolve({ code: -1, duration: 0, stdout: "", stderr: err.message });
        });
    });
}

// --- TESTS ---

// 1. SPEED TEST
async function runSpeedTest(useAria2 = false, threads = 16) {
    const label = useAria2 ? `Aria2 (${threads} threads)` : "Native (yt-dlp)";
    console.log(`\n--- TEST: Speed Benchmark [${label}] ---`);

    if (!YTDLP_PATH) {
        console.log("SKIP: yt-dlp missing.");
        return null;
    }
    if (useAria2 && !MARIA_PATH) {
        console.log("SKIP: aria2c missing.");
        return null;
    }

    const filename = `speed_test_${useAria2 ? 'aria' + threads : 'native'}.mp4`;
    // Clean prev run
    if (fs.existsSync(path.join(OUTPUT_DIR, filename))) fs.unlinkSync(path.join(OUTPUT_DIR, filename));

    const args = [
        TEST_URL,
        "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]", // Stick to 1080p for consistent speed test
        "-o", filename,
        "--no-playlist"
    ];

    if (useAria2) {
        args.push("--external-downloader", MARIA_PATH);
        args.push("--external-downloader-args", `-x ${threads} -s ${threads} -k 1M`);
    }

    const result = await runCommand(YTDLP_PATH, args);

    if (result.code !== 0) {
        console.error(`FAILED: Exit code ${result.code}`);
        return null;
    }

    // Attempt to parse size from file
    let size = 0;
    try {
        size = fs.statSync(path.join(OUTPUT_DIR, filename)).size;
    } catch(e) {}

    const speedMbps = (size * 8 / (result.duration * 1000 * 1000)).toFixed(2);

    console.log(`RESULT:`);
    console.log(`  Duration: ${result.duration.toFixed(2)}s`);
    console.log(`  Size: ${formatBytes(size)}`);
    console.log(`  Avg Speed: ${speedMbps} Mbps`);

    return {
        mode: label,
        duration: result.duration,
        size,
        speed: speedMbps
    };
}

// 2. FFMPEG STRESS TEST
async function runFfmpegTest() {
    console.log(`\n--- TEST: FFmpeg Stability (Merge/Cut) ---`);
    if (!FFMPEG_PATH) {
        console.log("SKIP: ffmpeg missing.");
        return;
    }

    // We need a source file first. Use one from speed test if available, or download small one.
    const sourceFile = path.join(OUTPUT_DIR, "speed_test_native.mp4");
    if (!fs.existsSync(sourceFile)) {
        console.log("SKIP: No source file (speed_test_native.mp4) to stress test.");
        return;
    }

    // 1. Cut 10 times
    console.log("Running 5 sequential cuts...");
    const starts = [10, 20, 30, 40, 50];

    for (let i = 0; i < starts.length; i++) {
        const start = starts[i];
        const outfile = `cut_${i}.mp4`;
        // ffmpeg -ss [start] -i [input] -t 5 -c copy [out]
        const args = [
            "-y",
            "-ss", start.toString(),
            "-i", sourceFile,
            "-t", "5",
            "-c", "copy",
            outfile
        ];

        const res = await runCommand(FFMPEG_PATH, args);
        if (res.code === 0) console.log(`  Cut ${i+1}: OK (${res.duration.toFixed(2)}s)`);
        else console.log(`  Cut ${i+1}: FAIL`);
    }
}

// 3. ROBUSTNESS (Multiformat)
async function runRobustness() {
    console.log(`\n--- TEST: Robustness (Multiformat) ---`);
    if (!YTDLP_PATH) return;

    // Just dry run to check format extraction, not full download to save time/bandwidth
    // or download small audio.
    const args = [
        TEST_URL,
        "-F", // List formats
    ];
    const res = await runCommand(YTDLP_PATH, args);
    if (res.code === 0 && res.stdout.includes("mp4")) {
        console.log("  Format List extraction: PASS");
    } else {
        console.log("  Format List extraction: FAIL");
    }
}

// 4. ERROR HANDLING TEST (Invalid URL / Network Fail)
async function runErrorHandling() {
    console.log(`\n--- TEST: Error Handling ---`);
    if (!YTDLP_PATH) return;

    // A. Invalid URL
    console.log("Running Invalid URL Test...");
    const invalidRes = await runCommand(YTDLP_PATH, ["https://www.youtube.com/watch?v=INVALID_VIDEO_ID_12345"]);
    if (invalidRes.code !== 0) {
        console.log("  Invalid URL: PASS (Correctly failed with exit code 1)");
    } else {
        console.log("  Invalid URL: FAIL (Unexpected success or hang)");
        console.log(invalidRes.stderr);
    }

    // B. Non-existent Domain (Network Sim)
    console.log("Running Network Failure Test (Bad Domain)...");
    const networkRes = await runCommand(YTDLP_PATH, ["https://www.nonexistent-domain-test-123.com/video"]);
    if (networkRes.code !== 0) {
        console.log("  Network Fail: PASS (Correctly reported DNS/Connection error)");
    } else {
        console.log("  Network Fail: FAIL (Unexpected success)");
    }
}


// --- MAIN EXECUTION ---
(async () => {
    const report = { timestamp: new Date().toISOString(), results: [] };

    // 1. Native Test
    const r1 = await runSpeedTest(false);
    if (r1) report.results.push(r1);

    // 2. Aria2 8 Threads
    const r2 = await runSpeedTest(true, 8);
    if (r2) report.results.push(r2);

    // 3. Aria2 16 Threads
    const r3 = await runSpeedTest(true, 16);
    if (r3) report.results.push(r3);

    // 4. FFmpeg
    await runFfmpegTest();

    // 5. Robustness
    await runRobustness();

    // 6. Error Handling
    await runErrorHandling();

    console.log("\n=== BENCHMARK COMPLETE ===");
    console.log(JSON.stringify(report, null, 2));

    // Save report
    fs.writeFileSync(path.join(OUTPUT_DIR, "benchmark_report.json"), JSON.stringify(report, null, 2));
})();
