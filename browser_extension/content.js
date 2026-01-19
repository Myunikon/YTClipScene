// SceneClip Content Script
// Detects videos and shows download button using a safe overlay strategy

const DOWNLOAD_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
  <polyline points="7 10 12 15 17 10"></polyline>
  <line x1="12" y1="15" x2="12" y2="3"></line>
</svg>
`;

// Helper: Check if element is visible and large enough
function isSignificantVideo(video) {
  if (video.offsetParent === null) return false; // Hidden
  const rect = video.getBoundingClientRect();
  return rect.width > 200 && rect.height > 150; // Minimum size threshold
}

// Global set of tracked videos
const trackedVideos = new Map();

function updatePosition(video, btn) {
  const rect = video.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  // Position at top-right of the video
  // Collision tweak: Move 50px down and 10px left to avoid common overlaps (Cast/Settings)
  const top = rect.top + scrollY + 16;
  const right = document.documentElement.clientWidth - (rect.right + scrollX) + 16;
  // Note: We use 'right' for better anchoring 

  btn.style.top = `${top}px`;
  btn.style.right = `${right}px`;

  // Visibility check
  if (rect.width === 0 || rect.height === 0 || video.style.display === 'none') {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'flex';
  }
}

function createOverlay(video) {
  if (trackedVideos.has(video)) return;
  if (!isSignificantVideo(video)) return;

  const btn = document.createElement("button");
  btn.className = "clipscene-download-btn";
  btn.innerHTML = `${DOWNLOAD_ICON} Download`;
  btn.title = "Download with SceneClip";

  // Style for body-attachment
  Object.assign(btn.style, {
    position: 'absolute',
    zIndex: '2147483647',
    // Initial hide until positioned
    display: 'none'
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prefer Page URL for YouTube, fallback to src for direct files
    const urlToDownload = window.location.href;
    const protocolUrl = `clipscene://download?url=${encodeURIComponent(urlToDownload)}`;

    // "Blinking Tab" hack for protocol triggering (Reliable cross-browser)
    window.location.assign(protocolUrl);
  });

  // Hover Logic: Show button when hovering video OR button
  const showBtn = () => btn.classList.add('visible');
  const hideBtn = () => {
    // Small delay to allow moving from video to button
    setTimeout(() => {
      if (!btn.matches(':hover') && !video.matches(':hover')) {
        btn.classList.remove('visible');
      }
    }, 100);
  };

  video.addEventListener('mouseenter', showBtn);
  video.addEventListener('mouseleave', hideBtn);
  btn.addEventListener('mouseenter', showBtn);
  btn.addEventListener('mouseleave', hideBtn);

  // Attach to body
  document.body.appendChild(btn);
  trackedVideos.set(video, btn);

  // Initial Position
  updatePosition(video, btn);
}

// Update Loop for positions (efficient 60fps or throttled)
let ticking = false;
function updateAllPositions() {
  trackedVideos.forEach((btn, video) => {
    // Garbage collection if video removed
    if (!document.body.contains(video)) {
      btn.remove();
      trackedVideos.delete(video);
      return;
    }
    updatePosition(video, btn);
  });
  ticking = false;
}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(updateAllPositions);
    ticking = true;
  }
}

// Event Listeners for layout changes
window.addEventListener('resize', requestTick);
window.addEventListener('scroll', requestTick, { passive: true });

// Mutation Observer to detect new videos
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) shouldCheck = true;
  }

  if (shouldCheck) {
    document.querySelectorAll("video").forEach(createOverlay);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Scan initially
document.querySelectorAll("video").forEach(createOverlay);

// Periodic check for layout shifts (for SPAs that resize without window events)
setInterval(requestTick, 1000);
