// Share a generated file (story image/video) through the OS share sheet,
// falling back to a plain download where file sharing isn't available.
export async function shareOrDownload(file: File, text: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "OLYMPUS Lifting Club", text });
      return;
    } catch (e) {
      // User closed the share sheet themselves — respect that, don't
      // fall back to a surprise download they didn't ask for.
      if ((e as { name?: string }).name === "AbortError") throw e;
      // Any other failure (seen in the wild: "Permission denied" — some
      // Android/OEM builds block passing files to other apps via the
      // share sheet even though canShare() said it should work) — fall
      // through to a plain download so the file still reaches the user.
      console.error("navigator.share failed, falling back to download:", e);
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
