// On the Olympus app: the slideshow fires "olympus:music-duck" (true when a
// PR celebration starts, false when it ends). Pass it on to the YouTube tabs.
// Also marks the page so the slideshow can tell the extension is installed.
document.documentElement.dataset.olympusMusik = "1";
window.addEventListener("olympus:music-duck", (e) => {
  const on = e.detail === true;
  try {
    chrome.runtime.sendMessage({ olympusDuck: on });
  } catch {
    // Extension reloaded while the page stayed open: refresh the page.
  }
});
