import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

const MAX_PHOTO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_DIMENSION = 600;
const JPEG_QUALITY = 0.6;

/** Race a promise against a timeout — prevents forever-hanging promises on mobile */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function uploadReportPhoto(
  firmId: string,
  reportId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error('Photo must be under 25MB.');
  }

  let blob: Blob;
  try {
    blob = await withTimeout(compressPhoto(file), 20000, 'Photo compression');
  } catch (compressErr) {
    // Compression failed — upload the original file directly as fallback
    console.warn('Compression failed, uploading original:', compressErr);
    blob = file;
  }

  const timestamp = Date.now();
  const storagePath = `firms/${firmId}/reports/${reportId}/photos/${timestamp}`;
  const storageRef = ref(storage, storagePath);

  await withTimeout(
    uploadBytes(storageRef, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    }),
    60000,
    'Firebase upload'
  );

  return withTimeout(getDownloadURL(storageRef), 10000, 'Getting download URL');
}

export async function deleteReportPhotos(firmId: string, reportId: string): Promise<void> {
  const folderRef = ref(storage, `firms/${firmId}/reports/${reportId}/photos`);
  try {
    const result = await listAll(folderRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch {
    // Folder may not exist if no photos were uploaded
  }
}

async function compressPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);

  try {
    // Load image — 15s timeout in case onload/onerror never fires
    const img = await withTimeout(
      new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Cannot decode image'));
        el.src = url;
      }),
      15000,
      'Image decode'
    );

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

    const offsetX = (w - size) / 2;
    const offsetY = (h - size) / 2;
    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);

    // toBlob — 10s timeout in case callback never fires
    return await withTimeout(
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
          'image/jpeg',
          JPEG_QUALITY
        );
      }),
      10000,
      'Canvas toBlob'
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
