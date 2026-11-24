// On the Olympus app: the slideshow fires "olympus:music-duck" (true when a
// PR celebration starts, false when it ends). Pass it on to the extension.
// Also marks the page so the slideshow can tell the extension is installed.
if (!window.__olympusMusik) {
  window.__olympusMusik = true;
  document.documentElement.dataset.olympusMusik = "1";
  window.addEventListener("olympus:music-duck", (e) => {
    try {
      chrome.runtime.sendMessage({ olympusDuck: e.detail === true });
    } catch {
      // Extension reloaded while the page stayed open: refresh the page.
    }
  });
}
