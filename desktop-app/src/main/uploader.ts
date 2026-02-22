import { readFileSync } from 'node:fs';
import path from 'node:path';
import { net } from 'electron';

export interface UploadResult {
  id: string;
  url: string;
  cdnUrl: string;
}

export async function uploadGif(filePath: string, apiUrl: string): Promise<UploadResult> {
  const fileData = readFileSync(filePath);
  const filename = path.basename(filePath);

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

  const response = await net.fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const result = await response.json();

  console.log(`Upload successful: ${result.url}`);
  return {
    id: result.id,
    url: result.url,
    cdnUrl: result.cdnUrl,
  };
}
