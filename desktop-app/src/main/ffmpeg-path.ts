import { app } from 'electron';
import path from 'node:path';

export function getFfmpegPath(): string {
  if (app.isPackaged) {
    const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    return path.join(process.resourcesPath, binaryName);
  }
  // In development, use the binary from ffmpeg-static
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('ffmpeg-static');
}
