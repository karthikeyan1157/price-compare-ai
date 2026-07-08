const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return inrFormatter.format(price);
}

export function formatSavings(amount: number): string {
  const formatted = formatPrice(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}