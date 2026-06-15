// ============================================================
// BASK SHARED TYPES
// Used by both server (TypeScript) and client (TypeScript)
// ============================================================

export type MembershipTier = 'Standard' | 'Elite';
export type TripRequestStatus = 'pending' | 'reviewing' | 'booked' | 'cancelled';
export type ConciergeUrgency = 'low' | 'medium' | 'high' | 'emergency';
export type ConciergeStatus = 'open' | 'in_progress' | 'resolved';
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';
export type StayRequestStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

// ─── Auth ────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  membershipTier: MembershipTier;
  isAdmin: boolean;
  hasSelectedMembership: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── Profile ─────────────────────────────────────────────────
export interface Profile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  membershipTier: MembershipTier;
  isAdmin: boolean;
  hasSelectedMembership: boolean;
  nudeFriendly: boolean;
  dietaryRestrictions: string[];
  travelInterests: string[];
  profilePhotoUrl: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
}

// ─── Curated Trips ───────────────────────────────────────────
export interface CuratedTrip {
  id: number;
  title: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  pricePerPerson: number;
  description: string;
  fullItinerary: string | null;
  tags: string[];
  imageUrl: string | null;
  isPast: boolean;
  isActive: boolean;
  maxGuests: number | null;
  createdAt: string;
}

// ─── Trip Requests ───────────────────────────────────────────
export interface TripRequest {
  id: number;
  userId: number;
  destination: string;
  departureDatePreferred: string | null;
  returnDatePreferred: string | null;
  budgetRange: string;
  groupType: string;
  occasion: string;
  travelStyle: string;
  interests: string[];
  additionalNotes: string | null;
  status: TripRequestStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripRequestBody {
  destination: string;
  departureDatePreferred?: string;
  returnDatePreferred?: string;
  budgetRange: string;
  groupType: string;
  occasion: string;
  travelStyle: string;
  interests: string[];
  additionalNotes?: string;
}

// ─── Concierge ───────────────────────────────────────────────
export interface ConciergeRequest {
  id: number;
  userId: number;
  category: string;
  urgency: ConciergeUrgency;
  description: string;
  status: ConciergeStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConciergeRequestBody {
  category: string;
  urgency: ConciergeUrgency;
  description: string;
}

// ─── Bookings ────────────────────────────────────────────────
export interface Booking {
  id: number;
  userId: number;
  curatedTripId: number;
  status: BookingStatus;
  guestCount: number;
  specialRequests: string | null;
  adminNotes: string | null;
  createdAt: string;
  trip?: CuratedTrip;
}

// ─── Partner Homes ───────────────────────────────────────────
export interface PartnerHome {
  id: number;
  name: string;
  location: string;
  country: string;
  description: string;
  nightlyRate: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  vibeTags: string[];
  houseRules: string | null;
  clothingOptional: boolean;
  lgbtqFriendly: boolean;
  isEliteOnly: boolean;
  images: string[];
  minStayNights: number;
  checkInTime: string;
  checkOutTime: string;
  isActive: boolean;
}

// ─── Stay Requests ───────────────────────────────────────────
export interface StayRequest {
  id: number;
  userId: number;
  partnerHomeId: number;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  message: string | null;
  status: StayRequestStatus;
  adminNotes: string | null;
  createdAt: string;
  home?: PartnerHome;
}

// ─── Partner Perks ───────────────────────────────────────────
export interface PartnerPerk {
  id: number;
  partnerName: string;
  description: string;
  discountDetails: string;
  category: string;
  logoUrl: string | null;
  websiteUrl: string;
  isActive: boolean;
}

// ─── Shop ────────────────────────────────────────────────────
export type ShopCategory = 'merchandise' | 'pearls';

export interface ShopProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: ShopCategory;
  imageUrl: string | null;
  isEliteOnly: boolean;
  isActive: boolean;
  stripePriceId: string | null;
}

export interface Purchase {
  id: number;
  userId: number;
  type: 'itinerary' | 'subscription' | 'shop';
  itemId: number | null;
  itemName: string;
  amount: number;
  stripeSessionId: string | null;
  status: string;
  createdAt: string;
}

// ─── Beach Map ───────────────────────────────────────────────
export type BeachStatus = 'official_nude' | 'clothing_optional' | 'gay_beach' | 'gay_resort' | 'clothed_gay_beach';

export interface BeachLocation {
  id: number;
  name: string;
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  status: BeachStatus;
  description: string;
  baskNotes: string | null;
  tags: string[];
}

// ─── Admin ───────────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  eliteMembers: number;
  pendingTripRequests: number;
  pendingStayRequests: number;
  pendingConciergeRequests: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

// ─── API Responses ───────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
