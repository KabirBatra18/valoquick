import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

const MAX_PHOTO_SIZE = 25 * 1024 * 1024; // 25MB — iPad/iPhone cameras produce 6-10MB photos
const MAX_DIMENSION = 600; // Photos display at ~300px in PDF grid — 600px is 2x for sharpness
const JPEG_QUALITY = 0.6; // Good enough for report photos, ~3x smaller than 0.8

export async function uploadReportPhoto(
  firmId: string,
  reportId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error('Photo must be under 25MB.');
  }

  // Compress regardless of input size — a 10MB iPad photo becomes ~80KB after resize + JPEG
  const compressed = await compressAndCropPhoto(file);

  const timestamp = Date.now();
  const storagePath = `firms/${firmId}/reports/${reportId}/photos/${timestamp}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, compressed, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000',
  });

  return getDownloadURL(storageRef);
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

/**
 * Decode image via new Image() + objectURL — works on all Safari versions including HEIC.
 * Runs on the main thread but is the most compatible path.
 */
function loadImageElement(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to decode image: ${file.name} (${file.type})`));
    };
    img.src = url;
  });
}

async function compressAndCropPhoto(file: File): Promise<Blob> {
  let sourceWidth: number;
  let sourceHeight: number;
  let drawSource: CanvasImageSource;
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;

  // Try createImageBitmap (fast, off-thread) — fall back to Image element for
  // Safari HEIC photos and older iPadOS versions where createImageBitmap may
  // not support the file format or isn't available at all.
  try {
    bitmap = await createImageBitmap(file);
    sourceWidth = bitmap.width;
    sourceHeight = bitmap.height;
    drawSource = bitmap;
  } catch {
    const { img, url } = await loadImageElement(file);
    objectUrl = url;
    sourceWidth = img.naturalWidth;
    sourceHeight = img.naturalHeight;
    drawSource = img;
  }

  // Center-crop to square, cap at MAX_DIMENSION
  const size = Math.min(sourceWidth, sourceHeight);
  const targetSize = Math.min(size, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d')!;
  const offsetX = (sourceWidth - size) / 2;
  const offsetY = (sourceHeight - size) / 2;
  ctx.drawImage(drawSource, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);

  // Cleanup decoded image memory — safe try/catch for older Safari without bitmap.close()
  if (bitmap) try { bitmap.close(); } catch { /* older Safari */ }
  if (objectUrl) URL.revokeObjectURL(objectUrl);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
