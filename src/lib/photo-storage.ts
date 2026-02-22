// Photos are compressed client-side and stored as base64 data URLs in Firestore.
// No Firebase Storage dependency — eliminates CORS, rules, and bucket issues.

const MAX_DIM = 500;
const QUALITY = 0.5;

export async function uploadReportPhoto(
  _firmId: string,
  _reportId: string,
  file: File,
  onStage?: (stage: string) => void,
): Promise<string> {
  if (!file || file.size === 0) throw new Error('No photo selected');

  onStage?.('Compressing...');

  // 15-second hard timeout on entire compression
  let timer: ReturnType<typeof setTimeout>;
  const result = await Promise.race([
    compressToDataUrl(file),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Compression timed out')), 15000);
    }),
  ]).finally(() => clearTimeout(timer!));

  onStage?.('');
  return result;
}

// No-op — photos are stored in Firestore, deleted with the report document
export async function deleteReportPhotos(_firmId: string, _reportId: string): Promise<void> {}

// Compress and return a base64 data URL string.
// Uses objectURL + Image + canvas.toDataURL (synchronous — cannot hang).
function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (result: string | Error) => {
      if (done) return;
      done = true;
      if (typeof result === 'string') resolve(result);
      else reject(result);
    };

    const timer = setTimeout(() => finish(new Error('Internal compression timeout')), 14000);

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      finish(new Error('Cannot decode image'));
    };

    img.onload = () => {
      clearTimeout(timer);
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        URL.revokeObjectURL(url);

        if (!w || !h) throw new Error('Image has zero dimensions');

        const crop = Math.min(w, h);
        const out = Math.min(crop, MAX_DIM);
        const canvas = document.createElement('canvas');
        canvas.width = out;
        canvas.height = out;
        canvas.getContext('2d')!.drawImage(
          img, (w - crop) / 2, (h - crop) / 2, crop, crop, 0, 0, out, out,
        );

        // toDataURL is SYNCHRONOUS — cannot hang
        const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
        finish(dataUrl);
      } catch (e) {
        finish(e instanceof Error ? e : new Error('Compression error'));
      }
    };

    img.src = url;
  });
}
