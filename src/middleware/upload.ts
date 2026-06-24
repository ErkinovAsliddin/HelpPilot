// src/middleware/upload.ts
// Feature: helppilot

import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';

const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB
const AUDIO_SIZE_LIMIT = 25 * 1024 * 1024; // 25 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4'];

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_SIZE_LIMIT }, // max of the two limits
  fileFilter: (_req, file, cb) => {
    if (
      ALLOWED_IMAGE_TYPES.includes(file.mimetype) ||
      ALLOWED_AUDIO_TYPES.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
}).array('attachments', 5);

export function handleUploadErrors(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large', max_size_mb: 25 });
    return;
  }
  if (err instanceof Error && err.message.startsWith('Unsupported')) {
    res.status(415).json({ error: err.message });
    return;
  }
  next(err);
}

export { IMAGE_SIZE_LIMIT, AUDIO_SIZE_LIMIT, ALLOWED_IMAGE_TYPES, ALLOWED_AUDIO_TYPES };
