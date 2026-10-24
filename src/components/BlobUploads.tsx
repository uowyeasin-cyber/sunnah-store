'use client';
import { useEffect } from 'react';
import { upload } from '@vercel/blob/client';

// Uploads any chosen photo or video straight to Blob as soon as it is picked, then swaps the
// file input for hidden inputs holding the URLs, so saving a form never sends large files.
export default function BlobUploads({ folder }: { folder?: string }) {
  useEffect(() => {
    const onChange = async (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.type !== 'file' || !input.files?.length || !input.form) return;
      const form = input.form, name = input.name || input.dataset.name || '';
      const dir = folder || ({ ads: 'ads', products: 'products', homepage: 'slides' } as Record<string, string>)[location.pathname.split('/')[2]] || 'uploads';
      const buttons = [...form.querySelectorAll('button')] as HTMLButtonElement[];
      const note = document.createElement('small');
      note.textContent = 'Uploading…';
      input.after(note);
      buttons.forEach(b => (b.disabled = true));
      try {
        form.querySelectorAll(`input[type=hidden][data-up="${name}"]`).forEach(h => h.remove());
        for (const f of [...input.files]) {
          const clean = f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
          const ext = clean.split('.').pop() || '';
          const type = f.type || (/^(mp4|mov|webm|m4v)$/.test(ext) ? 'video/' + (ext === 'mov' ? 'quicktime' : ext) : 'image/' + (ext === 'jpg' ? 'jpeg' : ext || 'jpeg'));
          const r = await upload(`${dir}/${clean}`, f, { access: 'public', handleUploadUrl: '/api/upload', contentType: type, multipart: f.size > 20 * 1024 * 1024 });
          const h = Object.assign(document.createElement('input'), { type: 'hidden', name, value: r.url });
          h.dataset.up = name;
          form.append(h);
        }
        input.dataset.name = name;
        input.removeAttribute('name');
        note.textContent = 'Uploaded ✓';
      } catch (err) {
        if (location.hostname === 'localhost') { note.remove(); return; } // no Blob locally: the server saves the file
        // Never fall back to sending the file with the form: large files crash the save.
        note.textContent = 'Upload failed: ' + (err as Error).message + '. Try again or use a JPG/PNG.';
        note.style.color = '#c0392b';
        input.value = '';
      } finally {
        buttons.forEach(b => (b.disabled = false));
      }
    };
    document.addEventListener('change', onChange, true);
    return () => document.removeEventListener('change', onChange, true);
  }, [folder]);
  return null;
}
