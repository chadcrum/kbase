/**
 * Language detection utility for Monaco editor
 * Maps file extensions to Monaco editor language identifiers
 */

/**
 * Detects the Monaco editor language identifier from a filename
 * @param filename - The name of the file (with extension)
 * @returns The Monaco language identifier
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  if (!ext) {
    return 'plaintext'
  }

  const languageMap: Record<string, string> = {
    // Markdown
    'md': 'markdown',
    'markdown': 'markdown',
    
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    
    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'svg': 'xml',
    
    // Python
    'py': 'python',
    'pyw': 'python',
    'pyi': 'python',
    
    // Shell
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    
    // Config files
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'conf': 'ini',
    'config': 'ini',
    
    // Programming languages
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    
    // Database
    'sql': 'sql',
    
    // Other
    'txt': 'plaintext',
    'log': 'plaintext',
    'dockerfile': 'dockerfile',
  }

  return languageMap[ext] || 'plaintext'
}

