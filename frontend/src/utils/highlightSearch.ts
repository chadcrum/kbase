/**
 * Highlights search terms in text by wrapping them in <mark> tags.
 * 
 * @param text - The text to highlight terms in
 * @param searchQuery - The search query (space-separated phrases)
 * @returns HTML string with highlighted terms
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!text || !searchQuery) {
    return escapeHtml(text || '')
  }

  // Escape HTML first to prevent XSS
  let escapedText = escapeHtml(text)
  
  // Split query into individual phrases
  const phrases = searchQuery
    .trim()
    .split(/\s+/)
    .filter(phrase => phrase.length > 0)
  
  if (phrases.length === 0) {
    return escapedText
  }

  // Sort phrases by length (longest first) to avoid partial matches
  // Example: if searching for "test testing", highlight "testing" before "test"
  const sortedPhrases = [...phrases].sort((a, b) => b.length - a.length)

  // Highlight each phrase (case-insensitive)
  for (const phrase of sortedPhrases) {
    // Escape special regex characters in the search phrase
    const escapedPhrase = escapeRegex(phrase)
    
    // Create regex for case-insensitive matching
    const regex = new RegExp(`(${escapedPhrase})`, 'gi')
    
    // Replace matches with highlighted version
    escapedText = escapedText.replace(regex, '<mark>$1</mark>')
  }

  return escapedText
}

/**
 * Escapes HTML special characters to prevent XSS attacks.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

