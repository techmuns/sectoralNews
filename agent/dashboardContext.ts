import { getLiveFilters } from '../lib/dashboardState';

export const dashboardContext = {
  name: 'India Sectoral News Dashboard',
  purpose:
    'Monitor recent Indian business news one sector at a time: what has happened in the ' +
    'selected sector over the chosen time window, which outlet reported it and when, and ' +
    'the full text of any individual article the user opens.',

  // Every section the user can see, and what lives there.
  sections: [
    {
      name: 'Filters & Status',
      describes:
        'The sticky header bar. Shows the dashboard title, the ticker currently selected in ' +
        'the Munshot host, the sector and time-window pickers, the "Focus on selected ticker" ' +
        'toggle, the Refresh button and the time headlines were last fetched.',
    },
    {
      name: 'Selected Sector',
      describes:
        'The sector summary strip above the headlines: the sector name, its one-line ' +
        'description, the number of headlines found, and the search terms actually sent to ' +
        'the news datasource for this sector.',
    },
    {
      name: 'Sector Headlines',
      describes:
        'The card grid of recent news articles for the selected sector and time window. Each ' +
        'card shows the headline, the publishing outlet and its domain, the published time, a ' +
        'short summary, and a link to the original article.',
    },
    {
      name: 'Article Reader',
      describes:
        'The full extracted text of a single headline, shown inline on a card after the user ' +
        'presses "Read article". Only one article is open at a time.',
    },
  ],

  // Everything the user can click, toggle or select.
  controls: [
    {
      name: 'Sector dropdown',
      describes:
        'Chooses which of the 29 Indian sectors (Banking & Financial Services, IT, Pharma, ' +
        'Metals & Mining, Renewable Energy and so on) the whole dashboard reports on. Drives ' +
        'the search terms used for Sector Headlines.',
    },
    {
      name: 'Time window dropdown',
      describes:
        'Limits Sector Headlines to the last 24 hours, 7 days or 30 days. Sets the from/to ' +
        'date range sent to the news datasource.',
    },
    {
      name: 'Focus on selected ticker toggle',
      describes:
        'When on, the sector news query is narrowed to the company currently selected in the ' +
        'Munshot host. When off, headlines cover the whole sector. Disabled while no ticker ' +
        'is selected in the host.',
    },
    {
      name: 'Refresh button',
      describes:
        'Refetches Sector Headlines for the current sector, time window and ticker focus, and ' +
        'updates the "Last updated" timestamp in the header.',
    },
    {
      name: 'Read article action',
      describes:
        'On each headline card, extracts and shows the full text of that article inline in the ' +
        'Article Reader. Pressing it again collapses the article.',
    },
    {
      name: 'Ticker selection (host)',
      describes:
        'Changed in the Munshot host app, not in this dashboard. Supplies the ticker, company ' +
        'name and country that the "Focus on selected ticker" toggle applies.',
    },
  ],

  // MUST return current live values from dashboard state.
  getFilters: (): Record<string, string> => getLiveFilters(),
};
