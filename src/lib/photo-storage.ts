import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 600; // Photos display at ~300px in PDF grid — 600px is 2x for sharpness
const JPEG_QUALITY = 0.6; // Good enough for report photos, ~3x smaller than 0.8

export async function uploadReportPhoto(
  firmId: string,
  reportId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error('Photo must be under 5MB.');
  }

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
  // createImageBitmap decodes off the main thread — much faster than new Image()
  const bitmap = await createImageBitmap(file);

  // Center-crop to square, cap at MAX_DIMENSION
  const size = Math.min(bitmap.width, bitmap.height);
  const targetSize = Math.min(size, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d')!;
  const offsetX = (bitmap.width - size) / 2;
  const offsetY = (bitmap.height - size) / 2;
  ctx.drawImage(bitmap, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);

  bitmap.close(); // Free decoded image memory immediately

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
