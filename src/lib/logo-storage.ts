import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_WIDTH = 800;
const MAX_HEIGHT = 400;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export async function uploadFirmLogo(
  firmId: string,
  file: File
): Promise<{ url: string; storagePath: string }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Use PNG, JPEG, WebP, or SVG.');
  }

  if (file.size > MAX_LOGO_SIZE) {
    throw new Error('Logo must be under 2MB.');
  }

  // Compress raster images (skip SVG)
  let processedFile: Blob = file;
  if (file.type !== 'image/svg+xml') {
    processedFile = await compressLogo(file);
  }

  const storagePath = `firms/${firmId}/logo`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, processedFile, {
    contentType: file.type === 'image/svg+xml' ? 'image/svg+xml' : 'image/webp',
    cacheControl: 'public, max-age=31536000',
  });

  const url = await getDownloadURL(storageRef);
  return { url, storagePath };
}

export async function deleteFirmLogo(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

async function compressLogo(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/webp',
        0.85
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
