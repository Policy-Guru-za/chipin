type GivenGainConfig = {
  baseUrl: string;
  apiKey: string;
};

export type GivenGainDonationParams = {
  causeId: string;
  amountCents: number;
  donorName: string;
  donorEmail: string;
  reference: string;
  message?: string;
};

export type GivenGainDonationResult = {
  donationId: string;
  status: 'completed' | 'pending' | 'failed';
  receiptUrl?: string;
  certificateUrl?: string;
  errorMessage?: string;
};

const getGivenGainConfig = (): GivenGainConfig => ({
  baseUrl: process.env.GIVENGAIN_API_URL ?? '',
  apiKey: process.env.GIVENGAIN_API_KEY ?? '',
});

const parseDonationStatus = (value: unknown): GivenGainDonationResult['status'] => {
  if (value === 'completed' || value === 'pending' || value === 'failed') {
    return value;
  }
  throw new Error('GivenGain response missing status');
};

export async function createGivenGainDonation(
  params: GivenGainDonationParams
): Promise<GivenGainDonationResult> {
  const config = getGivenGainConfig();
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('GivenGain credentials are missing');
  }

  const response = await fetch(`${config.baseUrl}/donations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      causeId: params.causeId,
      amountCents: params.amountCents,
      donorName: params.donorName,
      donorEmail: params.donorEmail,
      reference: params.reference,
      message: params.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`GivenGain donation failed (${response.status})`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const donationId =
    typeof data.donationId === 'string'
      ? data.donationId
      : typeof data.id === 'string'
        ? data.id
        : '';

  if (!donationId) {
    throw new Error('GivenGain response missing donationId');
  }

  return {
    donationId,
    status: parseDonationStatus(data.status),
    receiptUrl: typeof data.receiptUrl === 'string' ? data.receiptUrl : undefined,
    certificateUrl: typeof data.certificateUrl === 'string' ? data.certificateUrl : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
  };
}
