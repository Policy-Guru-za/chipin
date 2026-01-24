type KarriConfig = {
  baseUrl: string;
  apiKey: string;
};

export type KarriTopUpParams = {
  cardNumber: string;
  amountCents: number;
  reference: string;
  description: string;
};

export type KarriTopUpResult = {
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  errorMessage?: string;
};

const getKarriConfig = (): KarriConfig => ({
  baseUrl: process.env.KARRI_BASE_URL ?? '',
  apiKey: process.env.KARRI_API_KEY ?? '',
});

const parseKarriStatus = (value: unknown): KarriTopUpResult['status'] => {
  if (value === 'completed' || value === 'pending' || value === 'failed') {
    return value;
  }
  throw new Error('Karri response missing status');
};

export async function topUpKarriCard(params: KarriTopUpParams): Promise<KarriTopUpResult> {
  const config = getKarriConfig();
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('Karri credentials are missing');
  }

  const response = await fetch(`${config.baseUrl}/topups`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cardNumber: params.cardNumber,
      amountCents: params.amountCents,
      reference: params.reference,
      description: params.description,
    }),
  });

  if (!response.ok) {
    throw new Error(`Karri top-up failed (${response.status})`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const transactionId =
    typeof data.transactionId === 'string'
      ? data.transactionId
      : typeof data.id === 'string'
        ? data.id
        : '';

  if (!transactionId) {
    throw new Error('Karri response missing transactionId');
  }

  return {
    transactionId,
    status: parseKarriStatus(data.status),
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
  };
}
