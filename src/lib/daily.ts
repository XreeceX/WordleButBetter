/** Today's date in UTC (YYYY-MM-DD). */
export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}
