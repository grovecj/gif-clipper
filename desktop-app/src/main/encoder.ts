import { spawn } from 'child_process';
import { getFfmpegPath } from './ffmpeg-path';

export function encodeGif(inputPath: string, fps: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.gif');

    // Use split filter for optimal GIF quality:
    // 1. palettegen analyzes all frames for best color palette
    // 2. paletteuse applies that palette for high-quality output
    const args = [
      '-i', inputPath,
      '-vf', `fps=${fps},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
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
