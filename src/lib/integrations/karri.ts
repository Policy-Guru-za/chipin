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

export type KarriCardVerificationResult = {
  valid: boolean;
  cardholderFirstName?: string;
  errorCode?: string;
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

const parseKarriVerification = (data: Record<string, unknown>): KarriCardVerificationResult => {
  if (typeof data.valid !== 'boolean') {
    throw new Error('Karri verification response missing valid flag');
  }

  const cardholderFirstName =
    typeof data.cardholderFirstName === 'string' ? data.cardholderFirstName : undefined;

  return {
    valid: data.valid,
    cardholderFirstName,
    errorCode: typeof data.errorCode === 'string' ? data.errorCode : undefined,
  };
};

export async function verifyKarriCard(cardNumber: string): Promise<KarriCardVerificationResult> {
  const config = getKarriConfig();
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('Karri credentials are missing');
  }

  const response = await fetch(`${config.baseUrl}/cards/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cardNumber }),
  });

  if (!response.ok) {
    throw new Error(`Karri card verification failed (${response.status})`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return parseKarriVerification(data);
}

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
