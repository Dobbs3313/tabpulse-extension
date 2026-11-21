async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});
    chrome.action.setBadgeText({ text: String(tabs.length) });
    chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
  } catch {
    // ignore startup race
  }
}

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
