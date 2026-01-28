import { NextRequest, NextResponse } from 'next/server';

import { jsonInternalError } from '@/lib/api/internal-response';
import { getSession } from '@/lib/auth/session';
import { UploadChildPhotoError, uploadChildPhoto } from '@/lib/integrations/blob';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonInternalError({ code: 'unauthorized', status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonInternalError({ code: 'invalid_request', status: 400 });
  }

  try {
    const uploaded = await uploadChildPhoto(file, session.hostId);
    return NextResponse.json({ url: uploaded.url });
  } catch (error) {
    if (error instanceof UploadChildPhotoError) {
      return jsonInternalError({ code: error.code, status: 400 });
    }
    return jsonInternalError({ code: 'upload_failed', status: 500 });
  }
}
