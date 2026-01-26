import { jsonError } from '@/lib/api/response';
import { verifyKarriCard } from '@/lib/integrations/karri';
import { log } from '@/lib/observability/logger';

const normalizeCardNumber = (value?: string | null) =>
  value ? value.replace(/\s+/g, '').replace(/-/g, '') : null;

export const verifyKarriCardForApi = async (params: {
  payoutMethod: string;
  cardNumber?: string | null;
  requestId: string;
  headers: Headers;
}) => {
  const normalizedCardNumber = normalizeCardNumber(params.cardNumber);
  if (params.payoutMethod === 'karri_card_topup' && !normalizedCardNumber) {
    return {
      ok: false as const,
      response: jsonError({
        error: { code: 'validation_error', message: 'Karri card number is required' },
        status: 400,
        requestId: params.requestId,
        headers: params.headers,
      }),
    };
  }

  if (params.payoutMethod !== 'karri_card_topup' || !normalizedCardNumber) {
    return { ok: true as const, cardNumber: normalizedCardNumber };
  }

  if (process.env.KARRI_AUTOMATION_ENABLED !== 'true') {
    return { ok: true as const, cardNumber: normalizedCardNumber };
  }

  try {
    const verification = await verifyKarriCard(normalizedCardNumber);
    if (!verification.valid) {
      return {
        ok: false as const,
        response: jsonError({
          error: { code: 'validation_error', message: 'Karri card number could not be verified' },
          status: 400,
          requestId: params.requestId,
          headers: params.headers,
        }),
      };
    }
  } catch (error) {
    log('error', 'karri_card_verify_failed', {
      requestId: params.requestId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return {
      ok: false as const,
      response: jsonError({
        error: { code: 'internal_error', message: 'Karri verification is unavailable' },
        status: 502,
        requestId: params.requestId,
        headers: params.headers,
      }),
    };
  }

  return { ok: true as const, cardNumber: normalizedCardNumber };
};
