// ClipScene Content Script
// Detects videos and injects download button

const DOWNLOAD_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
  <polyline points="7 10 12 15 17 10"></polyline>
  <line x1="12" y1="15" x2="12" y2="3"></line>
</svg>
`;

// Helper to create the button
function createDownloadButton(videoElement) {
  // Check if already injected
  if (videoElement.dataset.clipsceneInjected) return null;
  videoElement.dataset.clipsceneInjected = "true";

  const btn = document.createElement("button");
  btn.className = "clipscene-download-btn";
  btn.innerHTML = `${DOWNLOAD_ICON} Download`;
  btn.title = "Download with ClipScene";

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prefer the Page URL so yt-dlp can do its magic (best for YouTube)
    // For direct files, we might want src, but Page URL is safer for parsers.
    const urlToDownload = window.location.href;
    
    const protocolUrl = `clipscene://download?url=${encodeURIComponent(urlToDownload)}`;
    window.location.assign(protocolUrl);
  });

  return btn;
}

// Wrapper to position button relative to video
function injectOverlay(video) {
  // Skip small videos / ads / previews (heuristic)
  if (video.clientWidth < 100 || video.clientHeight < 100) return;

  // Find a stable parent to attach to. 
  // Ideally we want a parent that has the same dimensions as the video.
  const parent = video.parentElement;
  if (!parent) return;

  // Add wrapper class for hover effects
  parent.classList.add("clipscene-overlay-wrapper");
  
  // Make sure parent is relative so absolute button works
  const style = window.getComputedStyle(parent);
  if (style.position === "static") {
    parent.style.position = "relative";
  }

  const btn = createDownloadButton(video);
  if (btn) {
    parent.appendChild(btn);
  }
}

// Process existing videos
document.querySelectorAll("video").forEach(injectOverlay);

// Watch for new videos (YouTube SPA behavior)
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) {
        if (node.tagName === "VIDEO") {
          injectOverlay(node);
        } else {
          // Check children
          node.querySelectorAll?.("video").forEach(injectOverlay);
        }
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
