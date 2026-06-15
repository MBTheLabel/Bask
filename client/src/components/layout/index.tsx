import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Menu, X, Crown, User, LogOut, Map, ShoppingBag, Home, Compass, Bell, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';

const BaskLogo: React.FC<{ className?: string }> = ({ className }) => (
  <Link to="/" className={clsx('font-display font-bold text-bask-terracotta tracking-widest', className)}>
    BASK
  </Link>
);

const NAV_PUBLIC = [
  { to: '/', label: 'Experiences' },
  { to: '/blog', label: 'Journal' },
  { to: '/membership', label: 'Membership' },
];

const NAV_MEMBER = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/curated-trips', label: 'Trips', icon: Compass },
  { to: '/my-trips', label: 'My Trips', icon: Compass },
  { to: '/concierge', label: 'Concierge', icon: Bell },
  { to: '/partner-homes', label: 'Homes', icon: Home },
  { to: '/partner-perks', label: 'Perks', icon: Crown },
  { to: '/gift-shop', label: 'Shop', icon: ShoppingBag },
  { to: '/beach-map', label: 'Beach Map', icon: Map },
];

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const navLinks = isAuthenticated ? NAV_MEMBER : NAV_PUBLIC;

  return (
    <nav className="sticky top-0 z-40 bg-bask-cream/95 backdrop-blur-md border-b border-amber-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <BaskLogo className="text-2xl" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.slice(0, isAuthenticated ? 6 : 3).map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium font-body transition-colors duration-200',
                  location.pathname === to
                    ? 'text-bask-terracotta bg-amber-50'
                    : 'text-bask-muted hover:text-bask-terracotta hover:bg-amber-50/50'
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Elite badge */}
                {user?.membershipTier === 'Elite' && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-bask-terracotta text-white">
                    <Crown className="w-3 h-3" />
                    Elite
                  </span>
                )}

                {/* Admin link */}
                {user?.isAdmin && (
                  <Link to="/admin" className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-bask-terracotta hover:bg-amber-200 transition-colors">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                )}

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-amber-50 transition-colors"
                  >
                    {user?.membershipTier === 'Elite' ? (
                      <div className="w-8 h-8 rounded-full bg-bask-terracotta flex items-center justify-center">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-bask-terracotta" />
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-bask-dark">
                      {user?.firstName}
                    </span>
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-amber-100 z-20 py-1">
                        <div className="px-4 py-3 border-b border-amber-100">
                          <p className="text-sm font-medium text-bask-dark">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-bask-muted truncate">{user?.email}</p>
                        </div>
                        <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-bask-dark hover:bg-amber-50 transition-colors">
                          <User className="w-4 h-4 text-bask-muted" />
                          Profile
                        </Link>
                        <Link to="/membership" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-bask-dark hover:bg-amber-50 transition-colors">
                          <Crown className="w-4 h-4 text-bask-muted" />
                          Membership
                        </Link>
                        {user?.isAdmin && (
                          <Link to="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-bask-dark hover:bg-amber-50 transition-colors">
                            <LayoutDashboard className="w-4 h-4 text-bask-muted" />
                            Admin Dashboard
                          </Link>
                        )}
                        <div className="border-t border-amber-100 mt-1">
                          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-bask-dark hover:text-bask-terracotta transition-colors font-body">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium bg-bask-terracotta text-white rounded-lg hover:bg-bask-bronze transition-colors font-body">
                  Join BASK
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-amber-50 text-bask-dark"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-amber-200 bg-bask-cream/98 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-body transition-colors',
                  location.pathname === to
                    ? 'text-bask-terracotta bg-amber-50'
                    : 'text-bask-dark hover:bg-amber-50'
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </Link>
            ))}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-body text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export const Footer: React.FC = () => (
  <footer className="bg-bask-dark text-bask-cream mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <span className="font-display text-3xl font-bold text-bask-sand tracking-widest">BASK</span>
          <p className="mt-3 text-sm text-bask-cream/60 leading-relaxed max-w-xs">
            High-touch travel and concierge for the community-driven, lifestyle-conscious traveler.
          </p>
        </div>
        <div>
          <h4 className="font-body font-semibold text-bask-cream/80 mb-3 text-sm uppercase tracking-wide">Experiences</h4>
          <ul className="space-y-2 text-sm text-bask-cream/50">
            <li><Link to="/curated-trips" className="hover:text-bask-sand transition-colors">Curated Trips</Link></li>
            <li><Link to="/partner-homes" className="hover:text-bask-sand transition-colors">Partner Homes</Link></li>
            <li><Link to="/beach-map" className="hover:text-bask-sand transition-colors">Beach Map</Link></li>
            <li><Link to="/concierge" className="hover:text-bask-sand transition-colors">Concierge</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-body font-semibold text-bask-cream/80 mb-3 text-sm uppercase tracking-wide">Community</h4>
          <ul className="space-y-2 text-sm text-bask-cream/50">
            <li><Link to="/membership" className="hover:text-bask-sand transition-colors">Membership</Link></li>
            <li><Link to="/partner-perks" className="hover:text-bask-sand transition-colors">Partner Perks</Link></li>
            <li><Link to="/gift-shop" className="hover:text-bask-sand transition-colors">Gift Shop</Link></li>
            <li><Link to="/blog" className="hover:text-bask-sand transition-colors">Journal & Listen</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-bask-cream/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-bask-cream/30 font-body">© {new Date().getFullYear()} BASK. All rights reserved.</p>
        <p className="text-xs text-bask-cream/30 font-body">High-Touch Travel & Concierge · LGBTQ+ Affirming · Always Inclusive</p>
      </div>
    </div>
  </footer>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1 page-enter">{children}</main>
    <Footer />
  </div>
);
