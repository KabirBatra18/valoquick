'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface LogoUploaderProps {
  logoUrl: string | null;
  onLogoSelected: (file: File) => void;
  onLogoRemove: () => void;
  isUploading?: boolean;
}

export default function LogoUploader({ logoUrl, onLogoSelected, onLogoRemove, isUploading }: LogoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB.');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    onLogoSelected(file);
  }, [onLogoSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    maxFiles: 1,
  });

  const displayUrl = preview || logoUrl;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    onLogoRemove();
  };

  return (
    <div>
      {displayUrl ? (
        <div className="flex items-start gap-4">
          <div className="relative w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden border-2 border-surface-200 bg-white flex items-center justify-center">
            <img
              src={displayUrl}
              alt="Firm logo"
              className="w-full h-full object-contain p-2"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button
                type="button"
                className="px-3 py-2 text-xs lg:text-sm bg-surface-200 hover:bg-surface-300 text-text-primary rounded-lg transition-colors"
              >
                Change Logo
              </button>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2 text-xs lg:text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Remove Logo
            </button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center gap-2 p-6 lg:p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-brand bg-brand/10'
              : 'border-surface-300 hover:border-brand/50 hover:bg-surface-200/50'
          }`}
        >
          <input {...getInputProps()} />
          <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-text-secondary text-sm font-medium">
            {isDragActive ? 'Drop your logo here' : 'Click or drag to upload logo'}
          </p>
          <p className="text-text-tertiary text-xs">
            PNG, JPG, WebP, or SVG — max 2MB
          </p>
          <p className="text-text-tertiary text-[10px]">
            Recommended: 400×120px or wider. Displays at max 180×60px in reports.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-red-400 text-xs">{error}</p>
      )}
    </div>
  );
}
