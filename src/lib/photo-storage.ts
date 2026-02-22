import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

const MAX_DIM = 600;
const QUALITY = 0.6;

// ── Public API (same signatures as before — no import changes needed) ──────

export async function uploadReportPhoto(
  firmId: string,
  reportId: string,
  file: File
): Promise<string> {
  // 1. Compress (falls back to raw file if anything goes wrong)
  let blob: Blob;
  try {
    blob = await compress(file);
  } catch {
    blob = file; // upload original — large but guaranteed to work
  }

  // 2. Upload to Firebase Storage (one automatic retry on failure)
  const path = `firms/${firmId}/reports/${reportId}/photos/${Date.now()}`;
  const sRef = ref(storage, path);
  const opts = { contentType: blob.type || 'image/jpeg' };

  try {
    await uploadBytes(sRef, blob, opts);
  } catch {
    await sleep(1500);
    await uploadBytes(sRef, blob, opts);
  }

  // 3. Return download URL
  return getDownloadURL(sRef);
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

// ── Compression pipeline ───────────────────────────────────────────────────
// Uses only battle-tested APIs that work on every browser since 2015:
//   FileReader.readAsDataURL  →  new Image() onload  →  canvas drawImage
//   →  canvas.toDataURL (synchronous!)  →  manual base64→Blob
// No createImageBitmap, no URL.createObjectURL, no canvas.toBlob callbacks.

async function compress(file: File): Promise<Blob> {
  const dataUrl = await readFile(file);
  const img = await decodeImage(dataUrl);

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error('Invalid image');

  // Center-crop to square, cap at MAX_DIM
  const crop = Math.min(w, h);
  const out = Math.min(crop, MAX_DIM);

  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  canvas.getContext('2d')!.drawImage(
    img, (w - crop) / 2, (h - crop) / 2, crop, crop, 0, 0, out, out
  );

  // toDataURL is synchronous — can never hang or fail to call back
  const jpeg = canvas.toDataURL('image/jpeg', QUALITY);
  return base64ToBlob(jpeg);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Cannot read file'));
    reader.readAsDataURL(file);
  });
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Cannot decode image'));
    img.src = src;
  });
}

function base64ToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const raw = atob(parts[1]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
