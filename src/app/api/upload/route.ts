import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { currentCustomer, isAdminEmail } from '@/lib/auth';

// Hands the browser a short-lived token so photos and videos go straight to Blob,
// skipping the 4.5 MB request limit on functions. Review media is open to shoppers; the rest is admin only.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body, request,
      onBeforeGenerateToken: async pathname => {
        const review = pathname.startsWith('reviews/');
        if (!review) {
          const me = await currentCustomer();
          if (!me?.email || !(await isAdminEmail(me.email))) throw new Error('Not allowed');
        }
        // Shoppers' review files are capped like server uploads (lib/upload); admins can upload long product films.
        // The home page top section takes any file (sound, PDF, ...), so admins are not limited to photos and videos.
        return { allowedContentTypes: review ? ['image/*', 'video/*'] : undefined, maximumSizeInBytes: (review ? 60 : 100) * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
