export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

function isTouchDevice(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/** Opens the phone's share sheet where possible, otherwise downloads the file. */
export async function shareOrDownload(fileName: string, contents: string): Promise<ShareOutcome> {
  const file = new File([contents], fileName, { type: 'application/json' });

  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Moisha backup' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Otherwise fall through to a plain download.
    }
  }

  try {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
