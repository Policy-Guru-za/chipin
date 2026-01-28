/**
 * Custom metrics tracking for ChipIn business KPIs.
 */

export type CustomMetricName =
  | 'dream_board_created'
  | 'contribution_started'
  | 'contribution_completed'
  | 'goal_reached'
  | 'payment_method_selected'
  | 'wizard_step_completed'
  | 'share_link_clicked';

export type CustomMetricData = {
  name: CustomMetricName;
  timestamp: number;
  properties?: Record<string, string | number | boolean>;
};

/**
 * Track a custom business metric.
 */
export function trackMetric(
  name: CustomMetricName,
  properties?: Record<string, string | number | boolean>
): void {
  const metric: CustomMetricData = {
    name,
    timestamp: Date.now(),
    properties,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Metric]', metric.name, metric.properties ?? '');
    return;
  }

  // In production, send to analytics endpoint
  const body = JSON.stringify(metric);

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/internal/metrics', body);
  } else {
    fetch('/api/internal/metrics', {
      body,
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Track wizard step completion.
 */
export function trackWizardStep(step: number, stepName: string): void {
  trackMetric('wizard_step_completed', { step, stepName });
}

/**
 * Track contribution funnel.
 */
export function trackContributionStarted(
  dreamBoardId: string,
  amountCents: number,
  paymentMethod: string
): void {
  trackMetric('contribution_started', {
    dreamBoardId,
    amountCents,
    paymentMethod,
  });
}

export function trackContributionCompleted(
  dreamBoardId: string,
  amountCents: number,
  paymentMethod: string
): void {
  trackMetric('contribution_completed', {
    dreamBoardId,
    amountCents,
    paymentMethod,
  });
}

/**
 * Track goal reached event.
 */
export function trackGoalReached(dreamBoardId: string, totalRaisedCents: number): void {
  trackMetric('goal_reached', {
    dreamBoardId,
    totalRaisedCents,
  });
}

/**
 * Track share link interactions.
 */
export function trackShareLinkClicked(platform: string, dreamBoardId: string): void {
  trackMetric('share_link_clicked', {
    platform,
    dreamBoardId,
  });
}
