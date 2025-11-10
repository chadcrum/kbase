import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios'
import type { LoginRequest, LoginResponse, VerifyResponse, FileTreeNode, NoteData, SearchResponse, ConfigResponse } from '@/types'

export class ApiClient {
  private client: AxiosInstance
  private token: string | null = null
  private healthCallback: ((isOnline: boolean) => void) | null = null

  constructor(baseURL: string = import.meta.env.VITE_API_URL || '') {
    // Use relative URLs when no explicit base URL is provided
    // This allows the app to work from any domain without rebuilding
    const apiBase = baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
    
    this.client = axios.create({
      baseURL: apiBase ? `${apiBase}/api/v1` : '/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Load token from localStorage on initialization
    const storedToken = localStorage.getItem('kbase_token')
    if (storedToken) {
      this.token = storedToken
      this.setAuthToken(storedToken)
    }

    // Setup response interceptor to handle 401 errors and network issues
    this.client.interceptors.response.use(
      (response) => {
        // Mark backend as online on successful response
        this.healthCallback?.(true)
        return response
      },
      (error: AxiosError) => {
        // Check if it's a network error (backend down)
        const isNetworkError = !error.response || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'ENOTFOUND' ||
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('Network Error') ||
          error.message?.includes('timeout')
        
        if (isNetworkError) {
          // Mark backend as offline
          this.healthCallback?.(false)
        } else if (error.response?.status === 401) {
          // Auth error - backend is up but token is invalid
          this.healthCallback?.(true)
          // Only handle auth errors if auth is enabled (check config first)
          // We'll skip redirect if auth is disabled - this will be handled by the store
          this.logout()
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        } else {
          // Other errors - assume backend is online
          this.healthCallback?.(true)
        }
        return Promise.reject(error)
      }
    )
  }

  private setAuthToken(token: string) {
    this.token = token
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  private clearAuthToken() {
    this.token = null
    delete this.client.defaults.headers.common['Authorization']
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.client.post('/auth/login', credentials)
    const { access_token } = response.data
    this.setAuthToken(access_token)
    localStorage.setItem('kbase_token', access_token)
    return response.data
  }

  async verifyToken(): Promise<VerifyResponse> {
    const response: AxiosResponse<VerifyResponse> = await this.client.get('/auth/verify')
    return response.data
  }

  logout(): void {
    this.clearAuthToken()
    localStorage.removeItem('kbase_token')
  }

  isAuthenticated(): boolean {
    return this.token !== null
  }

  // Config API
  async getConfig(): Promise<ConfigResponse> {
    const response: AxiosResponse<ConfigResponse> = await this.client.get('/config/')
    return response.data
  }

  // Health monitoring
  setHealthCallback(callback: (isOnline: boolean) => void): void {
    this.healthCallback = callback
  }

  // Notes API
  async getNotes(): Promise<FileTreeNode> {
    const response: AxiosResponse<FileTreeNode> = await this.client.get('/notes/')
    return response.data
  }

  async searchNotes(query: string, limit: number = 50): Promise<SearchResponse> {
    const response: AxiosResponse<SearchResponse> = await this.client.get('/notes/search/', {
      params: { q: query, limit }
    })
    return response.data
  }

  async getNote(path: string): Promise<NoteData> {
    const response: AxiosResponse<NoteData> = await this.client.get(`/notes/${encodeURIComponent(path)}`)
    return response.data
  }

  async createNote(path: string, content: string): Promise<void> {
    await this.client.post(`/notes/${encodeURIComponent(path)}`, { content })
  }

  async updateNote(path: string, content: string): Promise<void> {
    await this.client.put(`/notes/${encodeURIComponent(path)}`, { content })
  }

  async deleteNote(path: string): Promise<void> {
    await this.client.delete(`/notes/${encodeURIComponent(path)}`)
  }

  async moveNote(path: string, destination: string): Promise<void> {
    await this.client.post(`/notes/${encodeURIComponent(path)}/move`, { destination })
  }

  async renameNote(path: string, newName: string): Promise<void> {
    // Build new path by replacing the last part with new name
    const pathParts = path.split('/')
    pathParts[pathParts.length - 1] = newName
    const destination = pathParts.join('/')
    await this.moveNote(path, destination)
  }

  // Directory API
  async deleteDirectory(path: string, recursive: boolean = true): Promise<void> {
    await this.client.delete(`/directories/${encodeURIComponent(path)}?recursive=${recursive}`)
  }

  async moveDirectory(path: string, destination: string): Promise<void> {
    await this.client.post(`/directories/${encodeURIComponent(path)}/move`, { destination })
  }

  async renameDirectory(path: string, newName: string): Promise<void> {
    await this.client.put(`/directories/${encodeURIComponent(path)}`, { new_name: newName })
  }

  async createDirectory(path: string): Promise<void> {
    await this.client.post(`/directories/${encodeURIComponent(path)}`)
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

