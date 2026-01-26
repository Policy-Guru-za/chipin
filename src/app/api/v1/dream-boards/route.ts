import { NextRequest } from 'next/server';
import { z } from 'zod';

import { enforceApiAuth } from '@/lib/api/handler';
import { serializeDreamBoard } from '@/lib/api/dream-boards';
import { jsonError, jsonPaginated, jsonSuccess } from '@/lib/api/response';
import { decodeCursor, encodeCursor } from '@/lib/api/pagination';
import { listDreamBoardsForApi } from '@/lib/db/api-queries';
import { ensureHostForEmail, markApiKeyUsed } from '@/lib/db/queries';
import { db } from '@/lib/db';
import { dreamBoards } from '@/lib/db/schema';
import { getCauseById } from '@/lib/dream-boards/causes';
import { isDateWithinRange, isDeadlineWithinRange } from '@/lib/dream-boards/validation';
import { encryptSensitiveValue } from '@/lib/utils/encryption';
import { generateSlug } from '@/lib/utils/slug';

const listQuerySchema = z.object({
  status: z
    .enum(['draft', 'active', 'funded', 'closed', 'paid_out', 'expired', 'cancelled'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().optional(),
});

const takealotGiftSchema = z.object({
  product_url: z.string().url(),
  product_name: z.string().min(1),
  product_image: z.string().url(),
  product_price: z.number().int().positive(),
});

const philanthropyGiftSchema = z.object({
  cause_id: z.string().min(1),
  cause_name: z.string().min(1),
  impact_description: z.string().min(1),
  amount_cents: z.number().int().positive(),
  cause_description: z.string().min(1).optional(),
  cause_image: z.string().min(1).optional(),
});

const overflowGiftSchema = z.object({
  cause_id: z.string().min(1),
  cause_name: z.string().min(1),
  impact_description: z.string().min(1),
});

const createSchema = z
  .object({
    child_name: z.string().min(2).max(50),
    child_photo_url: z.string().url(),
    birthday_date: z.string().min(1),
    gift_type: z.enum(['takealot_product', 'philanthropy']),
    gift_data: z.union([takealotGiftSchema, philanthropyGiftSchema]),
    payout_method: z.enum(['takealot_gift_card', 'karri_card_topup', 'philanthropy_donation']),
    overflow_gift_data: overflowGiftSchema.optional(),
    goal_cents: z.number().int().min(2000),
    payout_email: z.string().email(),
    message: z.string().max(280).optional(),
    deadline: z.string().min(1),
    karri_card_number: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    ensureTakealotGiftData(value, ctx);
    ensurePhilanthropyGiftData(value, ctx);
    ensureOverflowGiftData(value, ctx);
    ensurePayoutMethod(value, ctx);
    ensureKarriCardNumber(value, ctx);
    ensureDateRanges(value, ctx);
  });

type CreatePayload = z.infer<typeof createSchema>;
type TakealotGiftPayload = z.infer<typeof takealotGiftSchema>;
type PhilanthropyGiftPayload = z.infer<typeof philanthropyGiftSchema>;

const ensureTakealotGiftData = (value: CreatePayload, ctx: z.RefinementCtx) => {
  if (value.gift_type === 'takealot_product' && !('product_url' in value.gift_data)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gift_data'],
      message: 'Gift data must be takealot_product',
    });
  }
};

const ensurePhilanthropyGiftData = (value: CreatePayload, ctx: z.RefinementCtx) => {
  if (value.gift_type === 'philanthropy' && !('cause_id' in value.gift_data)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gift_data'],
      message: 'Gift data must be philanthropy',
    });
  }
};

const ensureOverflowGiftData = (value: CreatePayload, ctx: z.RefinementCtx) => {
  if (value.gift_type === 'takealot_product' && !value.overflow_gift_data) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['overflow_gift_data'],
      message: 'Overflow gift is required for takealot_product',
    });
  }
};

const ensurePayoutMethod = (value: CreatePayload, ctx: z.RefinementCtx) => {
  if (value.gift_type === 'philanthropy' && value.payout_method !== 'philanthropy_donation') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payout_method'],
      message: 'Payout method must be philanthropy_donation',
    });
  }
};

const ensureKarriCardNumber = (value: CreatePayload, ctx: z.RefinementCtx) => {
  if (value.payout_method === 'karri_card_topup' && !value.karri_card_number) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['karri_card_number'],
      message: 'Karri card number is required for karri_card_topup',
    });
  }
};

const ensureDateRanges = (value: CreatePayload, ctx: z.RefinementCtx) => {
  if (!isDateWithinRange(value.birthday_date)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['birthday_date'],
      message: 'Birthday must be within the next 90 days',
    });
  }

  if (!isDeadlineWithinRange(value.deadline)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deadline'],
      message: 'Deadline must be within the next 90 days',
    });
  }
};

const buildPhilanthropyGiftData = (payload: CreatePayload['gift_data']) => {
  if (!('cause_id' in payload)) return null;
  const data = payload as PhilanthropyGiftPayload;
  const cause = getCauseById(data.cause_id);
  const causeDescription = data.cause_description ?? cause?.description;
  const causeImage = data.cause_image ?? cause?.imageUrl;

  if (!causeDescription || !causeImage) {
    return null;
  }

  return {
    type: 'philanthropy' as const,
    causeId: data.cause_id,
    causeName: data.cause_name,
    causeDescription,
    causeImage,
    impactDescription: data.impact_description,
    amountCents: data.amount_cents,
  };
};

const parseCreatePayload = async (request: NextRequest, requestId: string, headers: Headers) => {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: jsonError({
        error: {
          code: 'validation_error',
          message: 'Invalid dream board payload',
          details: parsed.error.flatten(),
        },
        status: 400,
        requestId,
        headers,
      }),
    };
  }

  return { ok: true as const, data: parsed.data };
};

const resolveGiftData = (payload: CreatePayload, requestId: string, headers: Headers) => {
  if (payload.gift_type === 'takealot_product') {
    const data = payload.gift_data as TakealotGiftPayload;
    return {
      ok: true as const,
      giftData: {
        type: 'takealot_product' as const,
        productUrl: data.product_url,
        productName: data.product_name,
        productImage: data.product_image,
        productPrice: data.product_price,
      },
      overflowGiftData: payload.overflow_gift_data
        ? {
            causeId: payload.overflow_gift_data.cause_id,
            causeName: payload.overflow_gift_data.cause_name,
            impactDescription: payload.overflow_gift_data.impact_description,
          }
        : undefined,
    };
  }

  const philanthropyGiftData = buildPhilanthropyGiftData(payload.gift_data);
  if (!philanthropyGiftData) {
    return {
      ok: false as const,
      response: jsonError({
        error: { code: 'validation_error', message: 'Invalid philanthropy gift data' },
        status: 400,
        requestId,
        headers,
      }),
    };
  }

  return {
    ok: true as const,
    giftData: philanthropyGiftData,
    overflowGiftData: undefined,
  };
};

const insertDreamBoard = async (params: {
  payload: CreatePayload;
  giftData:
    | {
        type: 'takealot_product';
        productUrl: string;
        productName: string;
        productImage: string;
        productPrice: number;
      }
    | {
        type: 'philanthropy';
        causeId: string;
        causeName: string;
        causeDescription: string;
        causeImage: string;
        impactDescription: string;
        amountCents: number;
      };
  overflowGiftData?: { causeId: string; causeName: string; impactDescription: string };
  hostId: string;
  karriCardNumber: string | null;
}) => {
  let created: null | { id: string; slug: string; createdAt: Date; updatedAt: Date } = null;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    const slug = generateSlug(params.payload.child_name);
    const [result] = await db
      .insert(dreamBoards)
      .values({
        hostId: params.hostId,
        slug,
        childName: params.payload.child_name,
        childPhotoUrl: params.payload.child_photo_url,
        birthdayDate: params.payload.birthday_date,
        giftType: params.payload.gift_type,
        giftData: params.giftData,
        goalCents: params.payload.goal_cents,
        payoutMethod: params.payload.payout_method,
        overflowGiftData: params.overflowGiftData ?? null,
        karriCardNumber: params.karriCardNumber,
        message: params.payload.message ?? null,
        deadline: new Date(params.payload.deadline),
        status: 'active',
        payoutEmail: params.payload.payout_email,
      })
      .onConflictDoNothing({ target: dreamBoards.slug })
      .returning({
        id: dreamBoards.id,
        slug: dreamBoards.slug,
        createdAt: dreamBoards.createdAt,
        updatedAt: dreamBoards.updatedAt,
      });

    if (result) {
      created = result;
    }
  }

  return created;
};

export async function GET(request: NextRequest) {
  const auth = await enforceApiAuth(request, 'dreamboards:read');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = listQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError({
      error: {
        code: 'validation_error',
        message: 'Invalid query parameters',
        details: parsed.error.flatten(),
      },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const cursor = decodeCursor(parsed.data.after);
  if (parsed.data.after && !cursor) {
    return jsonError({
      error: { code: 'validation_error', message: 'Invalid pagination cursor' },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const limit = parsed.data.limit;
  const rows = await listDreamBoardsForApi({
    status: parsed.data.status,
    limit: limit + 1,
    cursor,
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const serialized = items
    .map((board) => serializeDreamBoard(board, baseUrl))
    .filter((board): board is NonNullable<ReturnType<typeof serializeDreamBoard>> =>
      Boolean(board)
    );

  if (serialized.length !== items.length) {
    return jsonError({
      error: { code: 'internal_error', message: 'Unable to serialize dream board list' },
      status: 500,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  await markApiKeyUsed(apiKey.id);

  const nextCursor =
    hasMore && items.length
      ? encodeCursor({
          createdAt: items[items.length - 1].createdAt,
          id: items[items.length - 1].id,
        })
      : null;

  return jsonPaginated({
    data: serialized,
    pagination: { has_more: hasMore, next_cursor: nextCursor },
    requestId,
    headers: rateLimitHeaders,
  });
}

export async function POST(request: NextRequest) {
  const auth = await enforceApiAuth(request, 'dreamboards:write');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;
  const parsed = await parseCreatePayload(request, requestId, rateLimitHeaders);
  if (!parsed.ok) return parsed.response;

  const giftDataResult = resolveGiftData(parsed.data, requestId, rateLimitHeaders);
  if (!giftDataResult.ok) return giftDataResult.response;

  const host = await ensureHostForEmail(parsed.data.payout_email);
  const karriCardNumber =
    parsed.data.payout_method === 'karri_card_topup' && parsed.data.karri_card_number
      ? encryptSensitiveValue(parsed.data.karri_card_number)
      : null;

  const created = await insertDreamBoard({
    payload: parsed.data,
    giftData: giftDataResult.giftData,
    overflowGiftData: giftDataResult.overflowGiftData,
    hostId: host.id,
    karriCardNumber,
  });

  if (!created) {
    return jsonError({
      error: { code: 'conflict', message: 'Unable to generate a unique slug' },
      status: 409,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const responsePayload = serializeDreamBoard(
    {
      id: created.id,
      slug: created.slug,
      childName: parsed.data.child_name,
      childPhotoUrl: parsed.data.child_photo_url,
      birthdayDate: parsed.data.birthday_date,
      giftType: parsed.data.gift_type,
      giftData: giftDataResult.giftData,
      payoutMethod: parsed.data.payout_method,
      overflowGiftData: giftDataResult.overflowGiftData ?? null,
      goalCents: parsed.data.goal_cents,
      raisedCents: 0,
      message: parsed.data.message ?? null,
      deadline: parsed.data.deadline,
      status: 'active',
      contributionCount: 0,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  );

  if (!responsePayload) {
    return jsonError({
      error: { code: 'internal_error', message: 'Unable to serialize dream board' },
      status: 500,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  await markApiKeyUsed(apiKey.id);

  return jsonSuccess({ data: responsePayload, requestId, status: 201, headers: rateLimitHeaders });
}
