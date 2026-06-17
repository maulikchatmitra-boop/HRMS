/**
 * Utility: Escape special regex metacharacters from user input
 * Prevents ReDoS attacks and SyntaxError crashes
 * 
 * Example: "R&D (Research" → "R\&D \(Research"
 */
export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Safe case-insensitive exact match query
 * Use this instead of new RegExp(userInput)
 * 
 * @param {string} value - User input to match
 * @returns {Object} MongoDB regex query object
 */
export const safeExactMatch = (value) => {
  return { $regex: new RegExp(`^${escapeRegExp(value.trim())}$`, 'i') };
};
