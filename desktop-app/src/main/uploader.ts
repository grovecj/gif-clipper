import { readFileSync } from 'node:fs';
import path from 'node:path';
import { net } from 'electron';

export interface UploadResult {
  id: string;
  url: string;
  cdnUrl: string;
}

const UPLOAD_TIMEOUT_MS = 30_000;

export async function uploadGif(filePath: string, apiUrl: string): Promise<UploadResult> {
  const fileData = readFileSync(filePath);
  // Sanitize filename to safe characters only
  const rawName = path.basename(filePath);
  const filename = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Build multipart/form-data body manually since Node FormData
  // in Electron's main process may not support Blob/File from fs
  const boundary = `----GifClipper${Date.now()}`;
  const crlf = '\r\n';

  const preamble =
    `--${boundary}${crlf}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${crlf}` +
    `Content-Type: image/gif${crlf}${crlf}`;

  const epilogue = `${crlf}--${boundary}--${crlf}`;

  const body = Buffer.concat([
    Buffer.from(preamble),
    fileData,
    Buffer.from(epilogue),
  ]);

  const uploadUrl = `${apiUrl.replace(/\/$/, '')}/api/gifs`;
  console.log(`Uploading GIF (${fileData.length} bytes) to ${uploadUrl}...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let response: Response;
  try {
    response = await net.fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const result = await response.json();

  // Validate response contains required fields
  if (!result || typeof result.id !== 'string' || typeof result.url !== 'string') {
    throw new Error('Invalid response from server: missing id or url');
  }

  console.log(`Upload successful: ${result.url}`);
  return {
    id: result.id,
    url: result.url,
    cdnUrl: result.cdnUrl || result.url,
  };
}
