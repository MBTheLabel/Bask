import React from 'react';
import { clsx } from 'clsx';
import { Loader2, Lock, Crown, X, AlertCircle, CheckCircle, Info } from 'lucide-react';

// ─── Button ───────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-bask-terracotta text-white hover:bg-bask-bronze focus:ring-bask-terracotta shadow-sm hover:shadow-md',
    secondary: 'border-2 border-bask-terracotta text-bask-terracotta hover:bg-bask-terracotta hover:text-white focus:ring-bask-terracotta',
    ghost: 'text-bask-muted hover:bg-amber-50 hover:text-bask-terracotta focus:ring-amber-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ─── Card ─────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  elite?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, elite, onClick }) => (
  <div
    className={clsx(
      'rounded-2xl overflow-hidden transition-shadow duration-200',
      elite
        ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm hover:shadow-md'
        : 'bg-white border border-amber-100 shadow-sm hover:shadow-md',
      onClick && 'cursor-pointer',
      className
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────
type BadgeColor = 'terracotta' | 'amber' | 'green' | 'blue' | 'red' | 'gray' | 'yellow' | 'orange';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const badgeColors: Record<BadgeColor, string> = {
  terracotta: 'bg-amber-100 text-bask-terracotta',
  amber: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-600',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
};

export const Badge: React.FC<BadgeProps> = ({ children, color = 'terracotta', className }) => (
  <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body', badgeColors[color], className)}>
    {children}
  </span>
);

// ─── Elite Badge ──────────────────────────────────────────────
export const EliteBadge: React.FC<{ className?: string }> = ({ className }) => (
  <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium font-body bg-bask-terracotta text-white', className)}>
    <Crown className="w-3 h-3" />
    Elite
  </span>
);

// ─── Status Badge ─────────────────────────────────────────────
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: BadgeColor; label: string }> = {
    pending: { color: 'yellow', label: 'Pending' },
    reviewing: { color: 'blue', label: 'Reviewing' },
    booked: { color: 'green', label: 'Booked' },
    confirmed: { color: 'green', label: 'Confirmed' },
    cancelled: { color: 'gray', label: 'Cancelled' },
    declined: { color: 'red', label: 'Declined' },
    approved: { color: 'green', label: 'Approved' },
    open: { color: 'blue', label: 'Open' },
    in_progress: { color: 'amber', label: 'In Progress' },
    resolved: { color: 'green', label: 'Resolved' },
  };
  const cfg = map[status] || { color: 'gray' as BadgeColor, label: status };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
};

// ─── Urgency Badge ────────────────────────────────────────────
export const UrgencyBadge: React.FC<{ urgency: string }> = ({ urgency }) => {
  const map: Record<string, { color: BadgeColor; label: string }> = {
    emergency: { color: 'red', label: '🚨 Emergency' },
    high: { color: 'orange', label: '⚡ High' },
    medium: { color: 'yellow', label: 'Medium' },
    low: { color: 'gray', label: 'Low' },
  };
  const cfg = map[urgency] || { color: 'gray' as BadgeColor, label: urgency };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
};

// ─── Spinner ──────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md', className
}) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <Loader2 className={clsx('animate-spin text-bask-terracotta', sizes[size], className)} />
  );
};

export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-64">
    <div className="text-center space-y-3">
      <Spinner size="lg" />
      <p className="text-bask-muted text-sm font-body">Loading...</p>
    </div>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, maxWidth = 'md' }) => {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-xl w-full animate-slide-up', widths[maxWidth])}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-amber-100">
            <h3 className="font-display text-xl text-bask-dark">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-50 text-bask-muted hover:text-bask-dark transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ─── Elite Lock Overlay ───────────────────────────────────────
interface EliteLockProps {
  onUpgrade: () => void;
  message?: string;
}

export const EliteLockOverlay: React.FC<EliteLockProps> = ({ onUpgrade, message }) => (
  <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10 p-6 text-center">
    <div className="w-12 h-12 rounded-full bg-bask-terracotta/10 flex items-center justify-center mb-3">
      <Lock className="w-6 h-6 text-bask-terracotta" />
    </div>
    <h3 className="font-display text-lg text-bask-dark mb-1">Elite Access Required</h3>
    <p className="text-bask-muted text-sm mb-4">{message || 'This content is exclusively for BASK Elite members.'}</p>
    <Button size="sm" onClick={onUpgrade} icon={<Crown className="w-4 h-4" />}>
      Upgrade to Elite — $120/yr
    </Button>
  </div>
);

// ─── Alert ────────────────────────────────────────────────────
interface AlertProps {
  type?: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, message, onDismiss }) => {
  const configs = {
    success: { icon: CheckCircle, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon_color: 'text-green-600' },
    error: { icon: AlertCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon_color: 'text-red-600' },
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon_color: 'text-blue-600' },
    warning: { icon: AlertCircle, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon_color: 'text-yellow-600' },
  };
  const cfg = configs[type];
  const Icon = cfg.icon;
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border', cfg.bg, cfg.border)}>
      <Icon className={clsx('w-5 h-5 mt-0.5 flex-shrink-0', cfg.icon_color)} />
      <div className="flex-1">
        {title && <p className={clsx('font-medium text-sm mb-0.5', cfg.text)}>{title}</p>}
        <p className={clsx('text-sm', cfg.text)}>{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className={clsx('flex-shrink-0', cfg.text)}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4 text-bask-terracotta">{icon}</div>}
    <h3 className="font-display text-xl text-bask-dark mb-2">{title}</h3>
    {description && <p className="text-bask-muted text-sm max-w-sm mb-6">{description}</p>}
    {action}
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('skeleton', className)} />
);

export const TripCardSkeleton: React.FC = () => (
  <div className="card">
    <Skeleton className="h-48 w-full" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  </div>
);
