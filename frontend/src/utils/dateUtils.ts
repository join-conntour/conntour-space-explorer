/**
 * Shared date utility functions
 */

export const formatDate = (dateString: string, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const date = new Date(dateString);
  
  if (format === 'relative') {
    return formatRelativeDate(date);
  }
  
  const options: Intl.DateTimeFormatOptions = format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  
  return date.toLocaleDateString('en-US', options);
};

export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  window.scrollTo({ top: 0, behavior });
};

/**
 * Check if a date string contains "Invalid Date"
 * @param dateString - Date string to validate (can be empty string, undefined, or a date string)
 * @returns true if the date is invalid (contains "Invalid Date"), false otherwise
 */
export const isInvalidDate = (dateString?: string | null): boolean => {
  if (!dateString) return false; // Empty strings or undefined are considered valid (no filter)
  
  // Check if the string contains "Invalid Date"
  if (dateString.includes('Invalid Date')) {
    return true;
  }
  
  // Also check if parsing the date results in an invalid date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return true;
  }
  
  return false;
};

