import type { NgxEditorImageResizeOptions } from './types';

export interface LoadedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close?: () => void;
}

export interface ResizeCanvas {
  draw: (image: LoadedImage, width: number, height: number) => void;
  toBlob: (type: string, quality: number) => Promise<Blob | null>;
}

/** how images are decoded and drawn; replaced in tests */
export interface ImageResizeEnvironment {
  loadImage: (file: File) => Promise<LoadedImage>;
  createCanvas: (width: number, height: number) => ResizeCanvas;
}

// GIF would lose its animation, SVG is not a raster image
const SKIPPED_TYPES = ['image/gif', 'image/svg+xml'];
// the types every browser's canvas can write
const CANVAS_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const browserResizeEnvironment: ImageResizeEnvironment = {
  // every browser the library supports has createImageBitmap; without it (a test environment) nothing is resized
  loadImage: async (file) => {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('createImageBitmap is not available');
    }

    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
  },
  createCanvas: (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    return {
      draw: (image, w, h) => canvas.getContext('2d')?.drawImage(image.source, 0, 0, w, h),
      toBlob: (type, quality) => new Promise((resolve) => {
        canvas.toBlob(resolve, type, quality);
      }),
    };
  },
};

/** the size that fits into `maxWidth` × `maxHeight` with the same aspect ratio; images are never enlarged */
export const computeResizedSize = (
  width: number,
  height: number,
  options: Pick<NgxEditorImageResizeOptions, 'maxWidth' | 'maxHeight'>,
): { width: number; height: number } => {
  const scaleX = options.maxWidth && options.maxWidth > 0 ? options.maxWidth / width : 1;
  const scaleY = options.maxHeight && options.maxHeight > 0 ? options.maxHeight / height : 1;
  const scale = Math.min(1, scaleX, scaleY);

  if (scale >= 1) {
    return { width, height };
  }

  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

const renameFile = (name: string, type: string): string => {
  const extension = EXTENSIONS[type];
  if (!extension) {
    return name;
  }

  const base = name.replace(/\.[^./\\]*$/, '');
  return `${base || 'image'}.${extension}`;
};

/**
 * Downscales an image with a canvas so that it fits `maxWidth` / `maxHeight`, or converts it to `mimeType`.
 * GIF and SVG files, files that need no change and files that cannot be decoded are returned as they are.
 */
export const resizeImageFile = async (
  file: File,
  options: NgxEditorImageResizeOptions | null | undefined,
  env: ImageResizeEnvironment = browserResizeEnvironment,
): Promise<File> => {
  const type = (file.type || '').toLowerCase();

  if (!options || SKIPPED_TYPES.includes(type) || !type.startsWith('image/')) {
    return file;
  }

  const targetType = options.mimeType ?? (CANVAS_TYPES.includes(type) ? type : 'image/png');

  let image: LoadedImage;
  try {
    image = await env.loadImage(file);
  } catch {
    return file;
  }

  try {
    const size = computeResizedSize(image.width, image.height, options);

    if (size.width === image.width && size.height === image.height && targetType === type) {
      return file;
    }

    const canvas = env.createCanvas(size.width, size.height);
    canvas.draw(image, size.width, size.height);

    const blob = await canvas.toBlob(targetType, options.quality ?? 0.9);
    if (!blob) {
      return file;
    }

    const resultType = blob.type || targetType;
    return new File([blob], renameFile(file.name, resultType), { type: resultType, lastModified: file.lastModified });
  } finally {
    image.close?.();
  }
};
