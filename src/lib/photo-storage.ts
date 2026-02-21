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

async function compressAndCropPhoto(file: File): Promise<Blob> {
  // Use new Image() + objectURL — most compatible across all mobile browsers
  // (createImageBitmap breaks on iPad HEIC and some Android WebViews)
  const url = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Cannot decode image: ${file.name}`));
      el.src = url;
    });

    // Center-crop to square, cap at MAX_DIMENSION
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    const targetSize = Math.min(size, MAX_DIMENSION);

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d')!;
    const offsetX = (img.naturalWidth - size) / 2;
    const offsetY = (img.naturalHeight - size) / 2;
    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        JPEG_QUALITY
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
