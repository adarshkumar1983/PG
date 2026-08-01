/**
 * Formats a number as Indian Rupee (INR) currency representation.
 * @param {number} n - Number to format
 * @returns {string} Formatted string
 */
export const money = (n) => `₹${new Intl.NumberFormat('en-IN').format(n || 0)}`;

/**
 * Formats raw invoiceMonth or payment record into clean, human-readable display string.
 * @param {object|string} paymentOrMonth - Payment object or raw invoiceMonth string
 * @returns {string} Clean formatted period string (e.g., "Aug 2026", "Daily Stay (02 Aug - 13 Aug)")
 */
export const formatInvoicePeriod = (paymentOrMonth) => {
  if (!paymentOrMonth) return '—';

  let payment = null;
  let monthStr = '';

  if (typeof paymentOrMonth === 'string') {
    monthStr = paymentOrMonth;
  } else if (typeof paymentOrMonth === 'object') {
    payment = paymentOrMonth;
    monthStr = payment.invoiceMonth || '';
  }

  // 1. Check if stayPeriod object is present with explicit dates
  if (payment?.stayPeriod?.startDate && payment?.stayPeriod?.endDate) {
    const start = new Date(payment.stayPeriod.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const end = new Date(payment.stayPeriod.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const days = payment.stayPeriod.totalDays ? ` (${payment.stayPeriod.totalDays}d)` : '';
    return `Daily Stay: ${start} - ${end}${days}`;
  }

  // 2. Check if billingType is 'daily' or invoiceMonth has internal DAILY pattern
  if (payment?.billingType === 'daily' || monthStr.includes('-DAILY-') || monthStr.includes('DAILY')) {
    const yearMonthMatch = monthStr.match(/^(\d{4})-(\d{2})/);
    if (yearMonthMatch) {
      const date = new Date(Number(yearMonthMatch[1]), Number(yearMonthMatch[2]) - 1, 1);
      const formattedMonth = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      return `Daily Stay (${formattedMonth})`;
    }
    return 'Daily Stay';
  }

  // 3. Standard Monthly Invoice (e.g. 2026-08)
  const monthlyMatch = monthStr.match(/^(\d{4})-(\d{2})$/);
  if (monthlyMatch) {
    const date = new Date(Number(monthlyMatch[1]), Number(monthlyMatch[2]) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  // Fallback: strip raw ObjectId/uuid if present
  if (monthStr.includes('-DAILY-')) {
    const parts = monthStr.split('-DAILY-');
    return `Daily Stay (${parts[0]})`;
  }

  return monthStr;
};
