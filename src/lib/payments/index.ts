import { createOzowPayment, isOzowConfigured } from './ozow';
import { createPayfastPayment } from './payfast';
import { createSnapScanPayment, isSnapScanConfigured } from './snapscan';

export const PAYMENT_PROVIDERS = ['payfast', 'ozow', 'snapscan'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export type CreatePaymentParams = {
  amountCents: number;
  reference: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  customerEmail?: string;
  expiresAt?: string;
};

export type PaymentIntent =
  | {
      provider: 'payfast';
      mode: 'form';
      reference: string;
      redirectUrl: string;
      fields: Array<[string, string]>;
    }
  | {
      provider: 'ozow';
      mode: 'redirect';
      reference: string;
      redirectUrl: string;
      providerReference?: string;
    }
  | {
      provider: 'snapscan';
      mode: 'qr';
      reference: string;
      qrUrl: string;
      qrImageUrl: string;
    };

const isPayfastConfigured = () =>
  Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);

export const isPaymentProviderAvailable = (provider: PaymentProvider) => {
  switch (provider) {
    case 'payfast':
      return isPayfastConfigured();
    case 'ozow':
      return isOzowConfigured();
    case 'snapscan':
      return isSnapScanConfigured();
    default:
      return false;
  }
};

export const getAvailablePaymentProviders = () =>
  PAYMENT_PROVIDERS.filter((provider) => isPaymentProviderAvailable(provider));

export const createPaymentIntent = async (
  provider: PaymentProvider,
  params: CreatePaymentParams
): Promise<PaymentIntent> => {
  switch (provider) {
    case 'payfast': {
      const payment = createPayfastPayment({
        amountCents: params.amountCents,
        reference: params.reference,
        itemName: params.description,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        notifyUrl: params.notifyUrl,
        emailAddress: params.customerEmail,
      });

      return {
        provider: 'payfast',
        mode: 'form',
        reference: params.reference,
        redirectUrl: payment.redirectUrl,
        fields: payment.fields,
      };
    }
    case 'ozow': {
      const payment = await createOzowPayment({
        amountCents: params.amountCents,
        reference: params.reference,
        returnUrl: params.returnUrl,
        expiresAt: params.expiresAt,
      });

      return {
        provider: 'ozow',
        mode: 'redirect',
        reference: params.reference,
        redirectUrl: payment.redirectUrl,
        providerReference: payment.providerReference,
      };
    }
    case 'snapscan': {
      const payment = createSnapScanPayment({
        amountCents: params.amountCents,
        reference: params.reference,
      });

      return {
        provider: 'snapscan',
        mode: 'qr',
        reference: params.reference,
        qrUrl: payment.qrUrl,
        qrImageUrl: payment.qrImageUrl,
      };
    }
    default:
      throw new Error('Unsupported payment provider');
  }
};
