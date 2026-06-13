const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  setToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  getToken() {
    return this.accessToken;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.map((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Set headers
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
        // Handle token expiration and automatic refresh
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              // Fetch automatically sends cookies on same-origin or with credentials
              credentials: 'include', 
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              this.setToken(refreshData.accessToken);
              this.isRefreshing = false;
              this.onRefreshed(refreshData.accessToken);
            } else {
              this.isRefreshing = false;
              this.logout();
              throw new Error('Session expired');
            }
          } catch (refreshError) {
            this.isRefreshing = false;
            this.logout();
            return Promise.reject(refreshError);
          }
        }

        // Wait for the token to refresh and retry
        return new Promise((resolve) => {
          this.addRefreshSubscriber((newToken) => {
            const retryHeaders = new Headers(config.headers);
            retryHeaders.set('Authorization', `Bearer ${newToken}`);
            resolve(this.request(endpoint, { ...config, headers: retryHeaders }));
          });
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      // Check if no content response
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async register(formData: any) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    this.setToken(data.accessToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      this.setToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  }

  getUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }
}

export const api = new ApiClient();
export default api;
