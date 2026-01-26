import type { LoadTestConfig } from './config';

export type Scenario = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
};

export const buildScenarios = (config: LoadTestConfig): Scenario[] => {
  const scenarios: Scenario[] = [
    { name: 'dream-boards.list', method: 'GET', path: '/dream-boards?limit=5' },
    { name: 'payouts.pending', method: 'GET', path: '/payouts/pending?limit=5' },
    { name: 'webhooks.list', method: 'GET', path: '/webhooks' },
  ];

  if (config.dreamBoardId) {
    scenarios.push(
      {
        name: 'dream-boards.get',
        method: 'GET',
        path: `/dream-boards/${config.dreamBoardId}`,
      },
      {
        name: 'dream-boards.contributions',
        method: 'GET',
        path: `/dream-boards/${config.dreamBoardId}/contributions?limit=5`,
      }
    );
  }

  if (config.contributionId) {
    scenarios.push({
      name: 'contributions.get',
      method: 'GET',
      path: `/contributions/${config.contributionId}`,
    });
  }

  if (config.payoutId) {
    scenarios.push({ name: 'payouts.get', method: 'GET', path: `/payouts/${config.payoutId}` });
  }

  return scenarios;
};
