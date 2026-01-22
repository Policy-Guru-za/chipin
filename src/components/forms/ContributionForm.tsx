'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  AmountSelector,
  ContributorFields,
  PaymentActions,
  PaymentSummary,
  ProviderSelector,
  SnapScanPanel,
  type SnapScanQr,
} from '@/components/forms/ContributionFormParts';
import { calculateFee } from '@/lib/payments/fees';
import type { PaymentProvider } from '@/lib/payments';

const PRESET_AMOUNTS = [10000, 20000, 50000];
const MIN_CONTRIBUTION = 2000;
const MAX_CONTRIBUTION = 1000000;

type PaymentPayload = {
  mode?: 'form' | 'redirect' | 'qr';
  redirectUrl?: string;
  fields?: Array<[string, string]>;
  qrUrl?: string;
  qrImageUrl?: string;
  reference?: string;
};

const submitPayfastForm = (payload: Required<Pick<PaymentPayload, 'redirectUrl' | 'fields'>>) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payload.redirectUrl;

  payload.fields.forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

const handlePaymentPayload = (
  payload: PaymentPayload | null,
  setSnapscanQr: (qr: SnapScanQr) => void
) => {
  if (!payload?.mode) {
    return 'We could not start your payment.';
  }

  if (payload.mode === 'form' && payload.redirectUrl && payload.fields) {
    submitPayfastForm({ redirectUrl: payload.redirectUrl, fields: payload.fields });
    return null;
  }

  if (payload.mode === 'redirect' && payload.redirectUrl) {
    window.location.assign(payload.redirectUrl);
    return null;
  }

  if (payload.mode === 'qr' && payload.qrUrl && payload.qrImageUrl && payload.reference) {
    setSnapscanQr({
      qrUrl: payload.qrUrl,
      qrImageUrl: payload.qrImageUrl,
      reference: payload.reference,
    });
    return null;
  }

  return 'We could not start your payment.';
};

type ContributionValidationInput = {
  hasProviders: boolean;
  customAmountValid: boolean;
  isUsingCustom: boolean;
  parsedCustom: number | null;
  contributionCents: number;
};

const validateContribution = ({
  hasProviders,
  customAmountValid,
  isUsingCustom,
  parsedCustom,
  contributionCents,
}: ContributionValidationInput) => {
  if (!hasProviders) {
    return 'Payments are temporarily unavailable. Please try again later.';
  }
  if (!customAmountValid) {
    return 'Enter a whole rand amount (no decimals).';
  }
  if (isUsingCustom && parsedCustom === null) {
    return 'Enter a contribution amount.';
  }
  if (contributionCents < MIN_CONTRIBUTION || contributionCents > MAX_CONTRIBUTION) {
    return 'Please choose an amount between R20 and R10,000.';
  }
  return null;
};

type ContributionSubmitOptions = ContributionValidationInput & {
  dreamBoardId: string;
  contributionCents: number;
  contributorName: string;
  message: string;
  paymentProvider: PaymentProvider;
  setError: (message: string | null) => void;
  setSnapscanQr: (qr: SnapScanQr | null) => void;
  setLoading: (loading: boolean) => void;
};

const useContributionSubmit = ({
  dreamBoardId,
  contributionCents,
  contributorName,
  message,
  paymentProvider,
  hasProviders,
  customAmountValid,
  isUsingCustom,
  parsedCustom,
  setError,
  setSnapscanQr,
  setLoading,
}: ContributionSubmitOptions) =>
  useCallback(async () => {
    setError(null);
    setSnapscanQr(null);
    const validationError = validateContribution({
      hasProviders,
      customAmountValid,
      isUsingCustom,
      parsedCustom,
      contributionCents,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/internal/contributions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamBoardId,
          contributionCents,
          contributorName: contributorName.trim() || undefined,
          message: message.trim() || undefined,
          paymentProvider,
        }),
      });

      const payload = (await response.json().catch(() => null)) as PaymentPayload | null;
      if (!response.ok) {
        setError(
          (payload as { error?: string } | null)?.error ?? 'We could not start your payment.'
        );
        return;
      }

      const payloadError = handlePaymentPayload(payload, (qr) => setSnapscanQr(qr));
      if (payloadError) {
        setError(payloadError);
      }
    } catch {
      setError('We could not start your payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    contributionCents,
    contributorName,
    customAmountValid,
    dreamBoardId,
    hasProviders,
    isUsingCustom,
    message,
    parsedCustom,
    paymentProvider,
    setError,
    setLoading,
    setSnapscanQr,
  ]);

type ContributionFormProps = {
  dreamBoardId: string;
  childName: string;
  giftTitle: string;
  headline?: string;
  subtitle?: string;
  slug: string;
  availableProviders: PaymentProvider[];
};

export function ContributionForm({
  dreamBoardId,
  childName,
  giftTitle,
  headline,
  subtitle,
  slug,
  availableProviders,
}: ContributionFormProps) {
  const providerOptions = availableProviders;
  const fallbackProvider: PaymentProvider = providerOptions[0] ?? 'payfast';
  const [selectedAmount, setSelectedAmount] = useState(PRESET_AMOUNTS[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [message, setMessage] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(fallbackProvider);
  const [snapscanQr, setSnapscanQr] = useState<SnapScanQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmedCustomAmount = customAmount.trim();
  const isUsingCustom = trimmedCustomAmount.length > 0;
  const customAmountValid = !isUsingCustom || /^\d+$/.test(trimmedCustomAmount);

  const parsedCustom = useMemo(() => {
    if (!isUsingCustom || !customAmountValid) return null;
    const value = Number(trimmedCustomAmount);
    if (Number.isNaN(value)) return null;
    return value * 100;
  }, [customAmountValid, isUsingCustom, trimmedCustomAmount]);

  const contributionCents = isUsingCustom ? (parsedCustom ?? 0) : selectedAmount;
  const feeCents = contributionCents > 0 ? calculateFee(contributionCents) : 0;
  const totalCents = contributionCents + feeCents;
  const isAwaitingSnapscan = Boolean(snapscanQr);
  const hasProviders = providerOptions.length > 0;

  const handleSubmit = useContributionSubmit({
    dreamBoardId,
    contributionCents,
    contributorName,
    message,
    paymentProvider,
    hasProviders,
    customAmountValid,
    isUsingCustom,
    parsedCustom,
    setError,
    setSnapscanQr,
    setLoading,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-text">
          {headline ?? `Contribute to ${childName}'s gift`}
        </p>
        <p className="text-sm text-text-muted">{subtitle ?? giftTitle}</p>
      </div>

      <AmountSelector
        presetAmounts={PRESET_AMOUNTS}
        selectedAmount={selectedAmount}
        parsedCustom={parsedCustom}
        customAmount={customAmount}
        customAmountValid={customAmountValid}
        onPresetSelect={(amount) => {
          setSelectedAmount(amount);
          setCustomAmount('');
        }}
        onCustomChange={setCustomAmount}
      />

      {!hasProviders ? (
        <div className="rounded-2xl border border-border bg-subtle p-4 text-sm text-text">
          Payments are temporarily unavailable. Please check back soon.
        </div>
      ) : null}

      {providerOptions.length > 1 ? (
        <ProviderSelector
          providers={providerOptions}
          selected={paymentProvider}
          onSelect={(provider) => {
            setPaymentProvider(provider);
            setSnapscanQr(null);
            setError(null);
          }}
        />
      ) : null}

      <ContributorFields
        contributorName={contributorName}
        message={message}
        onContributorNameChange={setContributorName}
        onMessageChange={setMessage}
      />

      <PaymentSummary
        contributionCents={contributionCents}
        feeCents={feeCents}
        totalCents={totalCents}
      />

      {snapscanQr ? (
        <SnapScanPanel
          qr={snapscanQr}
          slug={slug}
          onBack={() => {
            setSnapscanQr(null);
            setError(null);
          }}
        />
      ) : null}

      <PaymentActions
        error={error}
        isAwaitingSnapscan={isAwaitingSnapscan}
        loading={loading}
        hasProviders={hasProviders}
        paymentProvider={paymentProvider}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
