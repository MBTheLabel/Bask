import axios from 'axios';
import { useAuthStore } from './authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Typed API helpers ────────────────────────────────────────

// Auth
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) =>
    api.patch('/auth/profile', data),
  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/auth/upload-photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  selectMembership: (tier: 'Standard' | 'Elite') =>
    api.post('/auth/select-membership', { tier }),
};

// Trips
export const tripsApi = {
  getAll: () => api.get('/trips'),
  getById: (id: number) => api.get(`/trips/${id}`),
  book: (tripId: number, data: { guestCount?: number; specialRequests?: string }) =>
    api.post(`/trips/${tripId}/book`, data),
  myBookings: () => api.get('/trips/bookings/mine'),
};

// Trip Requests
export const tripRequestsApi = {
  create: (data: Record<string, unknown>) => api.post('/trip-requests', data),
  mine: () => api.get('/trip-requests/mine'),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/trip-requests/${id}`, data),
};

// Concierge
export const conciergeApi = {
  create: (data: { category: string; urgency: string; description: string }) =>
    api.post('/concierge', data),
  mine: () => api.get('/concierge/mine'),
};

// Partner Homes
export const partnerHomesApi = {
  getAll: () => api.get('/partner-homes'),
  getById: (id: number) => api.get(`/partner-homes/${id}`),
  stayRequest: (homeId: number, data: Record<string, unknown>) =>
    api.post(`/partner-homes/${homeId}/stay-request`, data),
  myStayRequests: () => api.get('/partner-homes/stay-requests/mine'),
};

// Partner Perks
export const partnerPerksApi = {
  getAll: () => api.get('/partner-perks'),
};

// Beach Map
export const beachMapApi = {
  getAll: () => api.get('/beach-map'),
};

// Shop
export const shopApi = {
  getProducts: () => api.get('/shop/products'),
  myPurchases: () => api.get('/shop/purchases/mine'),
};

// Stripe
export const stripeApi = {
  createEliteSession: () => api.post('/stripe/create-elite-session'),
  createShopSession: (productId: number) => api.post('/stripe/create-shop-session', { productId }),
  createItinerarySession: (tripId: number) => api.post('/stripe/create-itinerary-session', { tripId }),
  getBillingPortal: () => api.get('/stripe/portal'),
};

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (search?: string) => api.get('/admin/users', { params: { search } }),
  tripRequests: (status?: string) => api.get('/admin/trip-requests', { params: { status } }),
  updateTripRequest: (id: number, data: Record<string, unknown>) => api.patch(`/admin/trip-requests/${id}`, data),
  conciergeRequests: () => api.get('/admin/concierge-requests'),
  updateConcierge: (id: number, data: Record<string, unknown>) => api.patch(`/admin/concierge-requests/${id}`, data),
  bookings: () => api.get('/admin/bookings'),
  updateBooking: (id: number, data: Record<string, unknown>) => api.patch(`/admin/bookings/${id}`, data),
  stayRequests: () => api.get('/admin/stay-requests'),
  updateStayRequest: (id: number, data: Record<string, unknown>) => api.patch(`/admin/stay-requests/${id}`, data),
  purchases: (type?: string) => api.get('/admin/purchases', { params: { type } }),
  exportPdf: () => api.get('/admin/export-pdf', { responseType: 'blob' }),
};
