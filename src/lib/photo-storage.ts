import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

const MAX_PHOTO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_DIMENSION = 600;
const JPEG_QUALITY = 0.6;

// ---------------------------------------------------------------------------
// Timeout utility — prevents any promise from hanging forever
// ---------------------------------------------------------------------------
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function uploadReportPhoto(
  firmId: string,
  reportId: string,
  file: File
): Promise<string> {
  if (!file || file.size === 0) throw new Error('Empty file');
  if (file.size > MAX_PHOTO_SIZE) throw new Error('Photo must be under 25MB.');

  // Compress — multiple fallback strategies, never throws to caller
  let blob: Blob;
  try {
    blob = await compressPhoto(file);
  } catch {
    // All compression strategies failed — upload original
    blob = file;
  }

  const timestamp = Date.now();
  const storagePath = `firms/${firmId}/reports/${reportId}/photos/${timestamp}`;
  const storageRef = ref(storage, storagePath);

  // Upload with 1 automatic retry
  await retryOnce(() =>
    withTimeout(
      uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      }),
      60000,
      'Upload',
    )
  );

  return withTimeout(getDownloadURL(storageRef), 15000, 'Download URL');
}

export async function deleteReportPhotos(firmId: string, reportId: string): Promise<void> {
  const folderRef = ref(storage, `firms/${firmId}/reports/${reportId}/photos`);
  try {
    const result = await listAll(folderRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch {
    // Folder may not exist
  }
}

// ---------------------------------------------------------------------------
// Retry helper — tries once, waits 2s, tries again
// ---------------------------------------------------------------------------
async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    await new Promise((r) => setTimeout(r, 2000));
    return fn(); // second attempt throws to caller if it fails
  }
}

// ---------------------------------------------------------------------------
// Image compression — three layered fallback strategies
// ---------------------------------------------------------------------------
async function compressPhoto(file: File): Promise<Blob> {
  // Load image (two decode strategies)
  const img = await loadImage(file);

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error('Image has zero dimensions');

  // Center-crop to square, cap at MAX_DIMENSION
  const size = Math.min(w, h);
  const targetSize = Math.min(size, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, (w - size) / 2, (h - size) / 2, size, size, 0, 0, targetSize, targetSize);

  // Convert canvas to blob (two export strategies)
  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Image loading — objectURL first, FileReader data URL fallback
// ---------------------------------------------------------------------------
async function loadImage(file: File): Promise<HTMLImageElement> {
  // Strategy 1: objectURL (fast, works on most browsers)
  try {
    return await loadViaObjectURL(file);
  } catch { /* fall through */ }

  // Strategy 2: FileReader → data URL (slower but works on all WebViews)
  return loadViaDataURL(file);
}

function loadViaObjectURL(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return withTimeout(
    new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => { resolve(el); };
      el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('objectURL decode failed')); };
      el.src = url;
    }),
    15000,
    'Image decode',
  );
  // Note: we intentionally don't revoke the URL on success — the <img> element
  // still references it and revoking could blank the source before canvas draw.
  // The URL is ephemeral and will be GC'd with the page.
}

function loadViaDataURL(file: File): Promise<HTMLImageElement> {
  return withTimeout(
    new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('dataURL decode failed'));
        el.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(file);
    }),
    20000,
    'FileReader decode',
  );
}

// ---------------------------------------------------------------------------
// Canvas → Blob — toBlob first, toDataURL fallback
// ---------------------------------------------------------------------------
async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  // Strategy 1: canvas.toBlob (standard, async)
  try {
    return await withTimeout(
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('toBlob null'))),
          'image/jpeg',
          JPEG_QUALITY,
        );
      }),
      10000,
      'toBlob',
    );
  } catch { /* fall through */ }

  // Strategy 2: toDataURL → fetch → blob (synchronous export, universally supported)
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const res = await fetch(dataUrl);
  return res.blob();
}
