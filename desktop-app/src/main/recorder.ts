import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getFfmpegPath } from './ffmpeg-path';

let ffmpegProcess: ChildProcess | null = null;
let currentRecordingPath: string | null = null;

export interface RecordingOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fps: number;
  maxDuration: number;
}

export function startRecording(options: RecordingOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const { x, y, width, height, fps, maxDuration } = options;

    // Ensure even dimensions (required by h264)
    const w = width % 2 === 0 ? width : width + 1;
    const h = height % 2 === 0 ? height : height + 1;

    const tempDir = app.getPath('temp');
    const filename = `gif-clipper-${randomUUID()}.mp4`;
    currentRecordingPath = path.join(tempDir, filename);

    const args: string[] = [];

    if (process.platform === 'win32') {
      // Windows: gdigrab supports direct region capture with offset
      args.push(
        '-f', 'gdigrab',
        '-framerate', String(fps),
        '-offset_x', String(x),
        '-offset_y', String(y),
        '-video_size', `${w}x${h}`,
        '-i', 'desktop',
      );
    } else if (process.platform === 'darwin') {
      // macOS: avfoundation captures entire screen, crop in filter
      args.push(
        '-f', 'avfoundation',
        '-framerate', String(fps),
        '-capture_cursor', '1',
        '-i', '1:',
        '-vf', `crop=${w}:${h}:${x}:${y}`,
      );
    } else {
      // Linux: x11grab supports direct region capture
      args.push(
        '-f', 'x11grab',
        '-framerate', String(fps),
        '-video_size', `${w}x${h}`,
        '-i', `:0.0+${x},${y}`,
      );
    }

    args.push(
      '-t', String(maxDuration),
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-y',
      currentRecordingPath,
    );

    const ffmpegBin = getFfmpegPath();
    console.log('Starting ffmpeg recording:', ffmpegBin, args.join(' '));

    ffmpegProcess = spawn(ffmpegBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', (code) => {
      const outputPath = currentRecordingPath;
      ffmpegProcess = null;
      currentRecordingPath = null;

      if (outputPath) {
        console.log(`ffmpeg recording finished (code ${code})`);
        resolve(outputPath);
      } else {
        reject(new Error(`Recording failed: ${stderr.slice(-500)}`));
      }
    });

    ffmpegProcess.on('error', (err) => {
      ffmpegProcess = null;
      currentRecordingPath = null;
      reject(new Error(`Failed to start ffmpeg: ${err.message}. Is ffmpeg installed and on PATH?`));
    });
  });
}

export function stopRecording(): void {
  if (ffmpegProcess) {
    console.log('Stopping ffmpeg recording...');
    try {
      ffmpegProcess.stdin?.write('q\n');
      ffmpegProcess.stdin?.end();
    } catch {
      // Fallback: force kill
      try {
        ffmpegProcess.kill();
      } catch {
        // Already dead
      }
    }
  }
}

export function isRecording(): boolean {
  return ffmpegProcess !== null;
}
