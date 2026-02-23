import { spawn } from 'child_process';
import { unlink } from 'node:fs/promises';
import { getFfmpegPath } from './ffmpeg-path';

export interface EncodingOptions {
  colors: number;
  maxWidth: number;
}

export function encodeGif(inputPath: string, fps: number, options: EncodingOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.gif');
    const { colors, maxWidth } = options;

    // Build filter chain:
    // 1. fps — resample to target frame rate
    // 2. scale — downscale to maxWidth (never upscale), lanczos for quality
    // 3. palettegen — generate optimal palette with limited colors
    // 4. paletteuse — apply palette with bayer dithering (compresses well in GIF)
    const filters = [
      `fps=${fps}`,
      `scale='min(iw,${maxWidth})':-1:flags=lanczos`,
      `split[s0][s1];[s0]palettegen=max_colors=${colors}[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
    ].join(',');

    const args = [
      '-i', inputPath,
      '-vf', filters,
      '-loop', '0',
      '-y',
      outputPath,
    ];

    const ffmpegBin = getFfmpegPath();
    console.log('Starting GIF encoding:', ffmpegBin, args.join(' '));

    const ffmpeg = spawn(ffmpegBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    ffmpeg.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`GIF encoding complete: ${outputPath}`);
        // Clean up the temporary video file
        unlink(inputPath).catch((err) => {
          console.error('Failed to clean up temp video file:', err);
        });
        resolve(outputPath);
      } else {
        reject(new Error(`GIF encoding failed (code ${code}): ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg for encoding: ${err.message}`));
    });
  });
}
