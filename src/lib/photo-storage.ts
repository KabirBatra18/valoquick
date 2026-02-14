import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;

export async function uploadReportPhoto(
  firmId: string,
  reportId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error('Photo must be under 5MB.');
  }

  // Compress and crop to square
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
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');

    img.onload = () => {
      // Center-crop to square
      const size = Math.min(img.width, img.height);
      const targetSize = Math.min(size, MAX_DIMENSION);

      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext('2d')!;
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        JPEG_QUALITY
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}
