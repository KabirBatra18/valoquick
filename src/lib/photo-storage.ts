import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

const MAX_DIM = 600;
const QUALITY = 0.6;

// Hard timeout — wraps ANY promise so it can never hang forever
function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out (${ms / 1000}s)`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function uploadReportPhoto(
  firmId: string,
  reportId: string,
  file: File,
  onStage?: (stage: string) => void,
): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not ready — refresh the page');
  if (!file || file.size === 0) throw new Error('No photo selected');

  // ── Step 1: Compress (15s timeout, falls back to raw file) ─────────
  onStage?.('Compressing...');
  let blob: Blob;
  try {
    blob = await timeout(compressPhoto(file), 15000, 'Compression');
  } catch {
    blob = file; // upload original if compression fails/times out
  }

  // ── Step 2: Upload to Firebase Storage (45s timeout, 1 retry) ──────
  onStage?.('Uploading...');
  const path = `firms/${firmId}/reports/${reportId}/photos/${Date.now()}`;
  const sRef = ref(storage, path);
  const opts = { contentType: 'image/jpeg' };

  try {
    await timeout(uploadBytes(sRef, blob, opts), 45000, 'Upload');
  } catch (firstErr) {
    onStage?.('Retrying upload...');
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await timeout(uploadBytes(sRef, blob, opts), 45000, 'Upload retry');
    } catch {
      throw firstErr; // surface original error
    }
  }

  // ── Step 3: Get download URL (10s timeout) ─────────────────────────
  onStage?.('Finishing...');
  return timeout(getDownloadURL(sRef), 10000, 'Download URL');
}

export async function deleteReportPhotos(firmId: string, reportId: string): Promise<void> {
  try {
    const folder = ref(storage, `firms/${firmId}/reports/${reportId}/photos`);
    const { items } = await listAll(folder);
    await Promise.all(items.map((i) => deleteObject(i)));
  } catch {
    // folder may not exist
  }
}

// ── Compression: single callback-based promise, no async chains ──────────
// Uses objectURL (memory-efficient) + canvas.toDataURL (synchronous export).
// The entire operation is wrapped in ONE promise with its own internal timeout
// so nothing can hang.
function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (result: Blob | Error) => {
      if (done) return;
      done = true;
      result instanceof Error ? reject(result) : resolve(result);
    };

    // Internal safety timeout (shouldn't fire — outer timeout is the real guard)
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
        const jpegDataUrl = canvas.toDataURL('image/jpeg', QUALITY);
        finish(dataUrlToBlob(jpegDataUrl));
      } catch (e) {
        finish(e instanceof Error ? e : new Error('Compression error'));
      }
    };

    img.src = url;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
