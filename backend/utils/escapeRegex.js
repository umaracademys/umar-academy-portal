/**
 * Utility function to escape special regex characters in user input
 * Prevents ReDoS (Regular Expression Denial of Service) attacks
 * 
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for use in regex
 */
function escapeRegex(str) {
  if (typeof str !== 'string') {
    return String(str);
  }
  // Escape all regex special characters
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
