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
        if (!pathname.startsWith('reviews/')) {
          const me = await currentCustomer();
          if (!me?.email || !(await isAdminEmail(me.email))) throw new Error('Not allowed');
        }
        return { allowedContentTypes: ['image/*', 'video/*'], maximumSizeInBytes: 100 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
