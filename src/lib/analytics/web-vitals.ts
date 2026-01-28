import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

export type WebVitalsMetric = {
  name: 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

type ReportCallback = (metric: WebVitalsMetric) => void;

function mapMetric(metric: Metric): WebVitalsMetric {
  return {
    name: metric.name as WebVitalsMetric['name'],
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  };
}

/**
 * Initialize Web Vitals tracking.
 * Call this once in your app entry point.
 */
export function initWebVitals(onReport: ReportCallback): void {
  onCLS((metric) => onReport(mapMetric(metric)));
  onFCP((metric) => onReport(mapMetric(metric)));
  onLCP((metric) => onReport(mapMetric(metric)));
  onTTFB((metric) => onReport(mapMetric(metric)));
  onINP((metric) => onReport(mapMetric(metric)));
}

/**
 * Default reporter that logs to console in development
 * and sends to analytics endpoint in production.
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  // Guard against server-side execution
  if (typeof window === 'undefined') {
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
    return;
  }

  // In production, send to analytics endpoint
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    page: window.location.pathname,
  });

  // Use sendBeacon for reliable delivery
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/internal/analytics', body);
  } else {
    fetch('/api/internal/analytics', {
      body,
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Thresholds for Web Vitals metrics (in ms unless otherwise noted)
 */
export const WEB_VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 }, // unitless
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const;
