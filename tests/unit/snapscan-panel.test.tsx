/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { SnapScanPanel, type SnapScanQr } from '@/components/forms/ContributionFormParts';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', { ...props, alt: props.alt ?? '' }),
}));

const qr: SnapScanQr = {
  qrUrl: 'https://snapscan.test/qr',
  qrImageUrl: 'https://snapscan.test/qr.png',
  reference: 'SNAP-123456789',
};

describe('SnapScanPanel component', () => {
  beforeEach(() => {
    const sendBeacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('tracks QR shown and reference copy events', async () => {
    render(<SnapScanPanel qr={qr} slug="board" dreamBoardId="board-1" onBack={() => {}} />);

    const sendBeacon = navigator.sendBeacon as unknown as vi.Mock;

    await waitFor(() => expect(sendBeacon).toHaveBeenCalled());
    const firstPayload = JSON.parse(sendBeacon.mock.calls[0][1] as string);
    expect(firstPayload.name).toBe('snapscan_qr_shown');
    expect(firstPayload.properties).toEqual({ dreamBoardId: 'board-1' });

    await userEvent.click(screen.getByLabelText('Copy reference'));

    await waitFor(() => expect(sendBeacon).toHaveBeenCalledTimes(2));
    const secondPayload = JSON.parse(sendBeacon.mock.calls[1][1] as string);
    expect(secondPayload.name).toBe('snapscan_reference_copied');
    expect(secondPayload.properties).toEqual({ reference_last4: '6789' });
  });
});
