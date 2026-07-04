/**
 * Formats a number as Indian Rupee (INR) currency representation.
 * @param {number} n - Number to format
 * @returns {string} Formatted string
 */
export const money = (n) => `₹${new Intl.NumberFormat('en-IN').format(n)}`;
