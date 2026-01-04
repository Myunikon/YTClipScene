use serde::Serialize;
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Networks, RefreshKind, System};
use tauri::command;

// Global state for network tracking
static LAST_NET_CHECK: Mutex<Option<(Instant, u64, u64)>> = Mutex::new(None);

#[derive(Serialize)]
pub struct SystemStats {
    cpu_usage: f32,
    memory_used: u64,
    memory_total: u64,
    memory_percent: f32,
    download_speed: f64, // bytes per second
    upload_speed: f64,   // bytes per second
}

#[command]
pub fn get_system_stats() -> SystemStats {
    // Refresh system info
    let mut sys = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );

    // Need to wait a bit for CPU usage to be accurate
    std::thread::sleep(std::time::Duration::from_millis(100));
    sys.refresh_cpu_usage();

    // Get CPU usage (average of all cores)
    let cpu_usage: f32 =
        sys.cpus().iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / sys.cpus().len().max(1) as f32;

    // Memory info
    let memory_used = sys.used_memory();
    let memory_total = sys.total_memory();
    let memory_percent = (memory_used as f64 / memory_total.max(1) as f64 * 100.0) as f32;

    // Network stats
    let networks = Networks::new_with_refreshed_list();
    let mut total_rx: u64 = 0;
    let mut total_tx: u64 = 0;

    for (_name, data) in networks.iter() {
        total_rx += data.total_received();
        total_tx += data.total_transmitted();
    }

    // Calculate speed
    let (download_speed, upload_speed) = {
        let mut last = LAST_NET_CHECK.lock().unwrap();
        let now = Instant::now();

        let speeds = if let Some((last_time, last_rx, last_tx)) = *last {
            let elapsed = now.duration_since(last_time).as_secs_f64();
            if elapsed > 0.0 {
                let dl = (total_rx.saturating_sub(last_rx)) as f64 / elapsed;
                let ul = (total_tx.saturating_sub(last_tx)) as f64 / elapsed;
                (dl, ul)
            } else {
                (0.0, 0.0)
            }
        } else {
            (0.0, 0.0)
        };

        *last = Some((now, total_rx, total_tx));
        speeds
    };

    SystemStats {
        cpu_usage,
        memory_used,
        memory_total,
        memory_percent,
        download_speed,
        upload_speed,
    }
}
