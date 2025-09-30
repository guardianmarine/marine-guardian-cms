import { format, subDays } from 'date-fns';

/**
 * Get default date range for insights (last 90 days)
 */
export function getDefaultDateRange() {
  const today = new Date();
  return {
    dateFrom: format(subDays(today, 90), 'yyyy-MM-dd'),
    dateTo: format(today, 'yyyy-MM-dd'),
  };
}

/**
 * Get date range for a specific number of days back
 */
export function getDateRangeForDays(days: number) {
  const today = new Date();
  return {
    dateFrom: format(subDays(today, days), 'yyyy-MM-dd'),
    dateTo: format(today, 'yyyy-MM-dd'),
  };
}

/**
 * Export rows to CSV file (client-side)
 * @param rows - Array of objects to export
 * @param filename - Output filename (without .csv extension)
 */
export function exportToCSV(rows: Array<Record<string, any>>, filename: string) {
  if (!rows || rows.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers (filter out internal fields starting with _)
  const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_'));
  
  // Build CSV rows
  const csvRows = rows.map(row => 
    headers.map(header => {
      const value = row[header];
      
      // Handle different value types
      if (value === null || value === undefined) {
        return '';
      }
      
      // Escape values containing commas, quotes, or newlines
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',')
  );

  // Combine headers and rows
  const csv = [
    headers.join(','),
    ...csvRows
  ].join('\n');

  // Create and download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, locale: 'en' | 'es' = 'en'): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Format number with locale-specific thousands separator
 */
export function formatNumber(value: number, locale: 'en' | 'es' = 'en'): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US').format(value);
}

/**
 * Parse ISO date string to user-friendly format
 */
export function formatDate(dateString: string, locale: 'en' | 'es' = 'en'): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
