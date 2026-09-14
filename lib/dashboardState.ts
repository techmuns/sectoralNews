/**
 * Live filter state, published by the dashboard on every state change so that
 * `agent/dashboardContext.getFilters()` reads what the user is actually
 * looking at rather than the dashboard's defaults.
 */
let liveFilters: Record<string, string> = {};

export function setLiveFilters(next: Record<string, string>): void {
  liveFilters = next;
}

export function getLiveFilters(): Record<string, string> {
  return liveFilters;
}
