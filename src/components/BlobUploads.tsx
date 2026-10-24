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
          const r = await upload(`${dir}/${clean}`, f, { access: 'public', handleUploadUrl: '/api/upload' });
          const h = Object.assign(document.createElement('input'), { type: 'hidden', name, value: r.url });
          h.dataset.up = name;
          form.append(h);
        }
        input.dataset.name = name;
        input.removeAttribute('name');
        note.textContent = 'Uploaded ✓';
      } catch (err) {
        // No Blob (local dev) or a failed token: leave the file in the form so the server saves it.
        console.warn('Blob upload skipped', err);
        note.remove();
      } finally {
        buttons.forEach(b => (b.disabled = false));
      }
    };
    document.addEventListener('change', onChange, true);
    return () => document.removeEventListener('change', onChange, true);
  }, [folder]);
  return null;
}
