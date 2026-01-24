type TakealotGiftCardConfig = {
  baseUrl: string;
  apiKey: string;
};

export type TakealotGiftCardIssueParams = {
  amountCents: number;
  recipientEmail: string;
  reference: string;
  message?: string;
};

export type TakealotGiftCardIssueResult = {
  status: 'completed' | 'pending' | 'failed';
  giftCardCode?: string;
  giftCardUrl?: string;
  orderId?: string;
  errorMessage?: string;
};

const getGiftCardConfig = (): TakealotGiftCardConfig => ({
  baseUrl: process.env.TAKEALOT_GIFTCARD_API_URL ?? '',
  apiKey: process.env.TAKEALOT_GIFTCARD_API_KEY ?? '',
});

const parseGiftCardStatus = (value: unknown): TakealotGiftCardIssueResult['status'] => {
  if (value === 'completed' || value === 'pending' || value === 'failed') {
    return value;
  }
  throw new Error('Gift card response missing status');
};

export async function issueTakealotGiftCard(
  params: TakealotGiftCardIssueParams
): Promise<TakealotGiftCardIssueResult> {
  const config = getGiftCardConfig();
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('Takealot gift card credentials are missing');
  }

  const response = await fetch(`${config.baseUrl}/gift-cards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amountCents: params.amountCents,
      recipientEmail: params.recipientEmail,
      reference: params.reference,
      message: params.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Takealot gift card request failed (${response.status})`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const giftCardCode = typeof data.giftCardCode === 'string' ? data.giftCardCode : undefined;
  const giftCardUrl = typeof data.giftCardUrl === 'string' ? data.giftCardUrl : undefined;
  const orderId = typeof data.orderId === 'string' ? data.orderId : undefined;

  return {
    status: parseGiftCardStatus(data.status),
    giftCardCode,
    giftCardUrl,
    orderId,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
  };
}
