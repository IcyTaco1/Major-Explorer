export function formatUSD(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
