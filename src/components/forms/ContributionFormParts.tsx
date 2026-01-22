'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PaymentProvider } from '@/lib/payments';
import { formatZar, formatZarWithCents } from '@/lib/utils/money';

export type SnapScanQr = {
  qrUrl: string;
  qrImageUrl: string;
  reference: string;
};

const PROVIDER_DETAILS: Record<PaymentProvider, { label: string; description: string }> = {
  payfast: {
    label: 'Card or instant EFT',
    description: 'Secure checkout via PayFast.',
  },
  ozow: {
    label: 'Instant EFT',
    description: 'Pay via Ozow bank transfer.',
  },
  snapscan: {
    label: 'SnapScan QR',
    description: 'Scan the QR code in your SnapScan app.',
  },
};

type AmountSelectorProps = {
  presetAmounts: number[];
  selectedAmount: number;
  parsedCustom: number | null;
  customAmount: string;
  customAmountValid: boolean;
  onPresetSelect: (amount: number) => void;
  onCustomChange: (value: string) => void;
};

export const AmountSelector = ({
  presetAmounts,
  selectedAmount,
  parsedCustom,
  customAmount,
  customAmountValid,
  onPresetSelect,
  onCustomChange,
}: AmountSelectorProps) => (
  <>
    <div className="grid gap-3 md:grid-cols-3">
      {presetAmounts.map((amount) => (
        <button
          key={amount}
          type="button"
          onClick={() => onPresetSelect(amount)}
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
            parsedCustom === null && selectedAmount === amount
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-white text-text hover:border-primary'
          }`}
        >
          {formatZar(amount)}
        </button>
      ))}
    </div>

    <div className="space-y-2">
      <label htmlFor="customAmount" className="text-sm font-medium text-text">
        Other amount
      </label>
      <Input
        id="customAmount"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="e.g. 350"
        value={customAmount}
        onChange={(event) => onCustomChange(event.target.value)}
      />
      {!customAmountValid ? (
        <p className="text-xs text-red-600">Enter a whole rand amount.</p>
      ) : null}
      <p className="text-xs text-text-muted">Minimum R20 · Maximum R10,000</p>
    </div>
  </>
);

type ProviderSelectorProps = {
  providers: PaymentProvider[];
  selected: PaymentProvider;
  onSelect: (provider: PaymentProvider) => void;
};

export const ProviderSelector = ({ providers, selected, onSelect }: ProviderSelectorProps) => (
  <div className="space-y-3">
    <p className="text-sm font-semibold text-text">Payment method</p>
    <div className="grid gap-3 md:grid-cols-3">
      {providers.map((provider) => {
        const detail = PROVIDER_DETAILS[provider];
        const isSelected = selected === provider;
        return (
          <button
            key={provider}
            type="button"
            onClick={() => onSelect(provider)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
              isSelected
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-text hover:border-primary'
            }`}
          >
            <p className="font-semibold">{detail.label}</p>
            <p className={isSelected ? 'text-white/80' : 'text-text-muted'}>{detail.description}</p>
          </button>
        );
      })}
    </div>
  </div>
);

type SnapScanPanelProps = {
  qr: SnapScanQr;
  slug: string;
  onBack: () => void;
};

export const SnapScanPanel = ({ qr, slug, onBack }: SnapScanPanelProps) => (
  <div className="rounded-3xl border border-border bg-white p-6 text-center">
    <p className="text-sm font-semibold text-text">Scan to pay with SnapScan</p>
    <p className="mt-2 text-sm text-text-muted">
      Open your SnapScan app and scan the QR code to complete the payment.
    </p>
    <div className="mt-4 flex flex-col items-center gap-4">
      <Image
        src={qr.qrImageUrl}
        alt="SnapScan QR code"
        width={192}
        height={192}
        className="h-48 w-48"
      />
      <a href={qr.qrUrl} className="text-sm font-semibold text-primary">
        Open SnapScan
      </a>
    </div>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Link href={`/${slug}/thanks?ref=${qr.reference}&provider=snapscan`}>
        <Button>Check payment status</Button>
      </Link>
      <Button type="button" variant="outline" onClick={onBack}>
        Choose another method
      </Button>
    </div>
  </div>
);

type ContributorFieldsProps = {
  contributorName: string;
  message: string;
  onContributorNameChange: (value: string) => void;
  onMessageChange: (value: string) => void;
};

export const ContributorFields = ({
  contributorName,
  message,
  onContributorNameChange,
  onMessageChange,
}: ContributorFieldsProps) => (
  <div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2">
      <label htmlFor="contributorName" className="text-sm font-medium text-text">
        Your name (optional)
      </label>
      <Input
        id="contributorName"
        placeholder="Shown to the family"
        value={contributorName}
        onChange={(event) => onContributorNameChange(event.target.value)}
      />
    </div>
    <div className="space-y-2">
      <label htmlFor="message" className="text-sm font-medium text-text">
        Message (optional)
      </label>
      <Input
        id="message"
        placeholder="Send a note"
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
      />
    </div>
  </div>
);

type PaymentSummaryProps = {
  contributionCents: number;
  feeCents: number;
  totalCents: number;
};

export const PaymentSummary = ({
  contributionCents,
  feeCents,
  totalCents,
}: PaymentSummaryProps) => (
  <div className="rounded-2xl border border-border bg-white p-4 text-sm text-text">
    <div className="flex items-center justify-between">
      <span>Contribution</span>
      <span>{formatZarWithCents(contributionCents)}</span>
    </div>
    <div className="mt-2 flex items-center justify-between text-text-muted">
      <span>ChipIn fee (3%)</span>
      <span>{formatZarWithCents(feeCents)}</span>
    </div>
    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-semibold">
      <span>Total</span>
      <span>{formatZarWithCents(totalCents)}</span>
    </div>
  </div>
);

type PaymentActionsProps = {
  error: string | null;
  isAwaitingSnapscan: boolean;
  loading: boolean;
  hasProviders: boolean;
  paymentProvider: PaymentProvider;
  onSubmit: () => void;
};

export const PaymentActions = ({
  error,
  isAwaitingSnapscan,
  loading,
  hasProviders,
  paymentProvider,
  onSubmit,
}: PaymentActionsProps) => (
  <div className="space-y-3">
    {error ? <p className="text-sm text-red-600">{error}</p> : null}
    {!isAwaitingSnapscan ? (
      <Button type="button" onClick={onSubmit} disabled={loading || !hasProviders}>
        {loading ? 'Redirecting…' : 'Continue to payment'}
      </Button>
    ) : null}
    <p className="text-xs text-text-muted">
      {!hasProviders
        ? 'Payments are temporarily unavailable.'
        : paymentProvider === 'payfast'
          ? 'Secure payments powered by PayFast.'
          : paymentProvider === 'ozow'
            ? 'Instant EFT powered by Ozow.'
            : 'SnapScan QR payments.'}
    </p>
  </div>
);
