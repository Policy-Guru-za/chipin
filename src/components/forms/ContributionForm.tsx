'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateFee } from '@/lib/payments/fees';
import { formatZar, formatZarWithCents } from '@/lib/utils/money';

const PRESET_AMOUNTS = [10000, 20000, 50000];
const MIN_CONTRIBUTION = 2000;
const MAX_CONTRIBUTION = 1000000;

type ContributionFormProps = {
  dreamBoardId: string;
  childName: string;
  giftTitle: string;
};

export function ContributionForm({ dreamBoardId, childName, giftTitle }: ContributionFormProps) {
  const [selectedAmount, setSelectedAmount] = useState(PRESET_AMOUNTS[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [message, setMessage] = useState('');
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

  const handleSubmit = async () => {
    setError(null);
    if (!customAmountValid) {
      setError('Enter a whole rand amount (no decimals).');
      return;
    }
    if (isUsingCustom && parsedCustom === null) {
      setError('Enter a contribution amount.');
      return;
    }
    if (contributionCents < MIN_CONTRIBUTION || contributionCents > MAX_CONTRIBUTION) {
      setError('Please choose an amount between R20 and R10,000.');
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
          paymentProvider: 'payfast',
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.redirectUrl || !payload?.fields) {
        setError(payload?.error ?? 'We could not start your payment.');
        return;
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payload.redirectUrl as string;

      (payload.fields as Array<[string, string]>).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch {
      setError('We could not start your payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-text">Contribute to {childName}&apos;s gift</p>
        <p className="text-sm text-text-muted">{giftTitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PRESET_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => {
              setSelectedAmount(amount);
              setCustomAmount('');
            }}
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
          onChange={(event) => setCustomAmount(event.target.value)}
        />
        {!customAmountValid ? (
          <p className="text-xs text-red-600">Enter a whole rand amount.</p>
        ) : null}
        <p className="text-xs text-text-muted">Minimum R20 · Maximum R10,000</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="contributorName" className="text-sm font-medium text-text">
            Your name (optional)
          </label>
          <Input
            id="contributorName"
            placeholder="Shown to the family"
            value={contributorName}
            onChange={(event) => setContributorName(event.target.value)}
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
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
      </div>

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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="button" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Redirecting…' : 'Continue to payment'}
      </Button>
      <p className="text-xs text-text-muted">Secure payments powered by PayFast.</p>
    </div>
  );
}
