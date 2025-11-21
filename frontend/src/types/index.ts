// API Response Types
export interface LoginRequest {
  password: string
  remember_me?: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface VerifyResponse {
  valid: boolean
}

export interface ConfigResponse {
  auth_enabled: boolean
}

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  created?: number
  modified?: number
}

export interface NoteData {
  content: string
  path: string
  size: number
  modified: number
}

export interface DirectoryData {
  name: string
  path: string
  type: string
  size: number
  modified: number
  item_count: number
  contents: DirectoryItem[]
}

export interface DirectoryItem {
  name: string
  path: string
  type: string
  size: number
  modified: number
}

export interface ApiResponse<T> {
  data: T
  status: number
  statusText: string
}

export interface ApiError {
  detail: string
}

export interface Snippet {
  line_number: number
  content: string
}

export interface SearchResult {
  path: string
  name: string
  snippets: Snippet[]
  modified?: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export interface GitStatus {
  enabled: boolean
  last_commit: number | null
  last_error: string | null
  last_error_time: number | null
}

export interface HealthResponse {
  status: string
  vault_path: string
  git_status: GitStatus
}

export interface CommitInfo {
  hash: string
  timestamp: number
  message: string
  is_current: boolean
}

export interface FileHistoryResponse {
  commits: CommitInfo[]
}

export interface FileContentAtCommitResponse {
  content: string
  hash: string
  timestamp: number
}

