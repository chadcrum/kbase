import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios'
import type { LoginRequest, LoginResponse, VerifyResponse, FileTreeNode, NoteData } from '@/types'

export class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000') {
    this.client = axios.create({
      baseURL: `${baseURL}/api/v1`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Load token from localStorage on initialization
    this.token = localStorage.getItem('kbase_token')
    if (this.token) {
      this.setAuthToken(this.token)
    }

    // Setup response interceptor to handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logout()
          window.location.href = '/login'
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

  // Notes API
  async getNotes(): Promise<FileTreeNode> {
    const response: AxiosResponse<FileTreeNode> = await this.client.get('/notes/')
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
}

// Export singleton instance
export const apiClient = new ApiClient()

