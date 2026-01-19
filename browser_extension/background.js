// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "download-clipscene",
    title: "Download with SceneClip",
    contexts: ["page", "link", "video", "audio"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "download-clipscene") {
    // Priority: Link URL > Src URL > Page URL
    const targetUrl = info.linkUrl || info.srcUrl || info.pageUrl;

    if (targetUrl) {
      const openUrl = `clipscene://download?url=${encodeURIComponent(targetUrl)}`;

      // Use tabs.create to trigger the protocol handler cleanly
      chrome.tabs.create({ url: openUrl }, (newTab) => {
        // Optional: Close the tab after a delay if it stays open (protocol handlers usually don't navigate)
        // usage depends on browser behavior. Chrome often leaves a blank tab.
        setTimeout(() => {
          chrome.tabs.remove(newTab.id);
        }, 1000); // 1s delay to allow protocol handoff
      });
    }
  }
});
