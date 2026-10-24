import 'server-only';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX = { image: 8 * 1024 * 1024, video: 60 * 1024 * 1024 };

// Stores an uploaded photo or video and returns its public URL. Uses Vercel Blob in production
// (BLOB_READ_WRITE_TOKEN) and public/uploads on a local machine.
export async function saveUpload(file: File, folder: string) {
  const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null;
  if (!kind) throw new Error('Only photos and videos can be uploaded.');
  if (file.size > MAX[kind]) throw new Error(`That ${kind} is too large.`);
  const ext = (file.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
  const name = `${folder}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    return (await put(name, file, { access: 'public', contentType: file.type })).url;
  }
  const dest = path.join(process.cwd(), 'public', 'uploads', name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

const BLOB_URL = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//;
export const isVideoUrl = (u: string) => /\.(mp4|mov|webm|m4v|ogv)$/i.test(u);

// Forms send either a File (local dev) or the Blob URL that BlobUploads already uploaded from the browser.
export async function keepUpload(v: FormDataEntryValue | null, folder: string): Promise<string> {
  if (typeof v === 'string') return BLOB_URL.test(v) ? v : '';
  return v instanceof File && v.size ? saveUpload(v, folder) : '';
}
