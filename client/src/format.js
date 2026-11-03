const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat();
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatMoney = (value) => (value === null || value === undefined ? '—' : currency.format(value));
export const formatNumber = (value) => number.format(value ?? 0);

/** SQLite stores UTC timestamps as "YYYY-MM-DD HH:MM:SS". */
export const formatDate = (value) =>
  value ? dateTime.format(new Date(`${value.replace(' ', 'T')}Z`)) : '—';
