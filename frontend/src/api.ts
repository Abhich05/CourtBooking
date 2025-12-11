import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Token storage keys
const ACCESS_TOKEN_KEY = 'courtbook_access_token';
const REFRESH_TOKEN_KEY = 'courtbook_refresh_token';
const USER_KEY = 'courtbook_user';

// Token management functions
export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getStoredUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setTokens = (accessToken: string, refreshToken: string, user: User) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Axios instance with auth interceptor
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE}/api/auth/refresh`, null, {
            params: { refresh_token: refreshToken }
          });
          
          const { access_token, refresh_token: newRefreshToken, user } = response.data;
          setTokens(access_token, newRefreshToken, user);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          clearTokens();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ===== Auth Types =====
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'staff';
  phone?: string;
  avatar_url?: string;
  email_verified?: boolean;
  preferences?: Record<string, unknown>;
  login_count?: number;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// ===== Auth API Functions =====
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post('/api/auth/register', data);
  const authData = response.data as AuthResponse;
  setTokens(authData.access_token, authData.refresh_token, authData.user);
  return authData;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post('/api/auth/login', data);
  const authData = response.data as AuthResponse;
  setTokens(authData.access_token, authData.refresh_token, authData.user);
  return authData;
};

export const logout = () => {
  clearTokens();
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/api/auth/me');
  return response.data as User;
};

export const updateProfile = async (data: Partial<User>): Promise<void> => {
  await api.put('/api/auth/me', data);
};

export const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
  await api.post('/api/auth/change-password', { old_password: oldPassword, new_password: newPassword });
};

// Types
export interface Court {
  id: number;
  name: string;
  type: 'indoor' | 'outdoor';
  base_price: number;
  enabled: boolean;
}

export interface Equipment {
  sku: string;
  name: string;
  total_quantity: number;
  rental_price: number;
  available_qty?: number;
  active: boolean;
}

export interface Coach {
  id: number;
  name: string;
  hourly_rate: number;
  active: boolean;
}

export interface Slot {
  start: string;
  end: string;
}

export interface PricingResult {
  base_price: number;
  adjustments: Array<{ name: string; amount: number }>;
  equipment_fees: number;
  coach_fee: number;
  total: number;
}

export interface Booking {
  id: number;
  user_email: string;
  start_ts: string;
  end_ts: string;
  status: 'confirmed' | 'cancelled' | 'waitlisted';
  total_price: number;
  allocations: Array<{ type: string; resource_id: string | number; quantity: number }>;
  created_at: string;
}

export interface BookingRequest {
  user_email: string;
  start_ts: string;
  end_ts: string;
  court_id: number;
  equipment: Array<{ sku: string; quantity: number }>;
  coach_id?: number;
}

// ===== Analytics Types =====
export interface AnalyticsDashboard {
  summary: {
    total_revenue: number;
    weekly_revenue: number;
    monthly_revenue: number;
    total_bookings: number;
    weekly_bookings: number;
    total_users: number;
    new_users_week: number;
    pending_waitlist: number;
  };
  peak_hours: Array<{ hour: number; count: number }>;
  court_utilization: Array<{
    id: number;
    name: string;
    type: string;
    bookings: number;
    utilization_percent: number;
  }>;
  equipment_popularity: Array<{ sku: string; rentals: number }>;
  coach_performance: Array<{
    id: number;
    name: string;
    sessions: number;
    hourly_rate: number;
  }>;
  revenue_trend: Array<{ date: string; revenue: number }>;
  insights: Array<{
    type: string;
    icon: string;
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface UserAnalytics {
  user: {
    id: number;
    name: string;
    email: string;
    member_since: string;
  };
  stats: {
    total_bookings: number;
    total_spent: number;
    total_hours_played: number;
    favorite_court: {
      id: number;
      name: string;
      visits: number;
    } | null;
  };
  loyalty: {
    level: string;
    points: number;
    next_level_at: number;
  };
}

// ===== Analytics API Functions =====
export const getAnalyticsDashboard = async (): Promise<AnalyticsDashboard> => {
  const response = await api.get('/api/analytics/dashboard');
  return response.data;
};

export const getUserAnalytics = async (userId: number): Promise<UserAnalytics> => {
  const response = await api.get(`/api/analytics/user/${userId}`);
  return response.data;
};

// API Functions
export const getSlotsForDate = async (date: string) => {
  const response = await api.get(`/api/slots/${date}`);
  return response.data as {
    date: string;
    courts: Court[];
    slots: Slot[];
    coaches: Coach[];
  };
};

export const getAvailability = async (startTs: string, endTs: string, courtType?: string) => {
  const params = new URLSearchParams({ start_ts: startTs, end_ts: endTs });
  if (courtType) params.append('court_type', courtType);
  const response = await api.get(`/api/availability?${params}`);
  return response.data as {
    available_courts: Array<{ court_id: number; name: string; type: string }>;
    equipment: Equipment[];
    coaches: Coach[];
  };
};

export const simulatePricing = async (startTs: string, endTs: string, courtId: number) => {
  const params = new URLSearchParams({
    start_ts: startTs,
    end_ts: endTs,
    court_id: courtId.toString(),
  });
  const response = await api.get(`/api/simulate-pricing?${params}`);
  return response.data as PricingResult;
};

export const createBooking = async (booking: BookingRequest) => {
  const response = await api.post('/api/bookings', booking);
  return response.data as {
    status: 'confirmed' | 'waitlisted';
    booking_id?: number;
    waitlist_id?: number;
    total?: number;
    pricing?: PricingResult;
    message?: string;
  };
};

export const getBooking = async (bookingId: number) => {
  const response = await api.get(`/api/bookings/${bookingId}`);
  return response.data as Booking;
};

export const cancelBooking = async (bookingId: number) => {
  const response = await api.post(`/api/bookings/${bookingId}/cancel`);
  return response.data;
};

export const listBookings = async (params?: { user_email?: string; status?: string; skip?: number; limit?: number }) => {
  const searchParams = new URLSearchParams();
  if (params?.user_email) searchParams.append('user_email', params.user_email);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.skip) searchParams.append('skip', params.skip.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  const response = await api.get(`/api/bookings?${searchParams}`);
  return response.data as { bookings: Booking[]; total: number; skip: number; limit: number };
};

// Admin API
export const adminListCourts = async () => {
  const response = await api.get('/api/admin/courts');
  return response.data as Court[];
};

export const adminCreateCourt = async (court: Partial<Court>) => {
  const response = await api.post('/api/admin/courts', court);
  return response.data;
};

export const adminUpdateCourt = async (courtId: number, court: Partial<Court>) => {
  const response = await api.put(`/api/admin/courts/${courtId}`, court);
  return response.data;
};

export const adminDeleteCourt = async (courtId: number) => {
  const response = await api.delete(`/api/admin/courts/${courtId}`);
  return response.data;
};

export const adminListEquipment = async () => {
  const response = await api.get('/api/admin/equipment');
  return response.data as Equipment[];
};

export const adminCreateEquipment = async (equipment: Partial<Equipment>) => {
  const response = await api.post('/api/admin/equipment', equipment);
  return response.data;
};

export const adminUpdateEquipment = async (sku: string, equipment: Partial<Equipment>) => {
  const response = await api.put(`/api/admin/equipment/${sku}`, equipment);
  return response.data;
};

export const adminDeleteEquipment = async (sku: string) => {
  const response = await api.delete(`/api/admin/equipment/${sku}`);
  return response.data;
};

export const adminListCoaches = async () => {
  const response = await api.get('/api/admin/coaches');
  return response.data as Coach[];
};

export const adminCreateCoach = async (coach: Partial<Coach>) => {
  const response = await api.post('/api/admin/coaches', coach);
  return response.data;
};

export const adminUpdateCoach = async (coachId: number, coach: Partial<Coach>) => {
  const response = await api.put(`/api/admin/coaches/${coachId}`, coach);
  return response.data;
};

export const adminDeleteCoach = async (coachId: number) => {
  const response = await api.delete(`/api/admin/coaches/${coachId}`);
  return response.data;
};

// ===== Smart Recommendations Types & API =====
export interface Recommendation {
  type: string;
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: {
    type: string;
    hour?: number;
    date?: string;
    court_id?: number;
    coach_id?: number;
  };
}

export interface RecommendationsResponse {
  date: string;
  recommendations: Recommendation[];
  total: number;
}

export const getSmartRecommendations = async (date?: string, userEmail?: string): Promise<RecommendationsResponse> => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (userEmail) params.append('user_email', userEmail);
  const response = await api.get(`/api/recommendations?${params}`);
  return response.data;
};

// ===== WebSocket Connection =====
export const createAvailabilityWebSocket = (date: string, onMessage: (data: unknown) => void): WebSocket => {
  const wsUrl = `ws://localhost:8000/ws/availability/${date}`;
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected for date:', date);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WebSocket message parse error:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return ws;
};

// ===== Health Check =====
export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};
