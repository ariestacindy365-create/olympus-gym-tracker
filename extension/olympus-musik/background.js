// Relays "duck / unduck" from the Olympus tab to every open YouTube tab.
chrome.runtime.onMessage.addListener((msg) => {
  if (typeof msg?.olympusDuck !== "boolean") return;
  chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://music.youtube.com/*"] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) chrome.tabs.sendMessage(tab.id, { olympusDuck: msg.olympusDuck }).catch(() => {});
    }
  });
});
