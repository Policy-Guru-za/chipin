import { serializeContribution } from '@/lib/api/contributions';
import { serializeDreamBoard } from '@/lib/api/dream-boards';
import { getDreamBoardWithTotals } from '@/lib/db/views';
import { log } from '@/lib/observability/logger';
import type { WebhookEventMeta } from '@/lib/webhooks/types';

type ContributionRecord = {
  id: string;
  dreamBoardId: string;
  contributorName: string | null;
  message: string | null;
  amountCents: number;
  feeCents: number;
  netCents: number | null;
  paymentStatus: string;
  createdAt: Date;
};

export type WebhookEmitPayload = {
  data: Record<string, unknown>;
  meta?: WebhookEventMeta;
};

export const buildDreamBoardWebhookData = async (
  dreamBoardId: string,
  baseUrl: string
): Promise<Record<string, unknown> | null> => {
  try {
    const board = await getDreamBoardWithTotals(dreamBoardId);
    if (!board) return null;

    return serializeDreamBoard(board, baseUrl);
  } catch (error) {
    log('error', 'webhooks.payload_board_failed', {
      dreamBoardId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
};

export const buildDreamBoardWebhookPayload = async (
  dreamBoardId: string,
  baseUrl: string
): Promise<WebhookEmitPayload> => {
  const dreamBoardPayload = await buildDreamBoardWebhookData(dreamBoardId, baseUrl);
  if (!dreamBoardPayload) {
    return {
      data: { dream_board_id: dreamBoardId },
      meta: { enrichment_required: true, dream_board_id: dreamBoardId },
    };
  }

  return { data: dreamBoardPayload };
};

export const buildContributionWebhookPayload = async (params: {
  contribution: ContributionRecord;
  baseUrl: string;
}): Promise<WebhookEmitPayload> => {
  const normalizedContribution = {
    ...params.contribution,
    message: params.contribution.message ?? null,
    createdAt: params.contribution.createdAt ?? new Date(),
  };

  const dreamBoardPayload = await buildDreamBoardWebhookData(
    normalizedContribution.dreamBoardId,
    params.baseUrl
  );

  if (!dreamBoardPayload) {
    return {
      data: {
        contribution: serializeContribution(normalizedContribution),
        dream_board: null,
      },
      meta: {
        enrichment_required: true,
        dream_board_id: normalizedContribution.dreamBoardId,
      },
    };
  }

  return {
    data: {
      contribution: serializeContribution(normalizedContribution),
      dream_board: dreamBoardPayload,
    },
  };
};
