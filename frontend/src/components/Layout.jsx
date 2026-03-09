import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, Wallet, User, Trophy, LogOut, TrendingUp, Coins, ChevronDown,
} from 'lucide-react';
import WalletConnect from './WalletConnect';

const navItems = [
  { path: '/', label: 'Mercados', icon: Home },
  { path: '/wallet', label: 'Billetera', icon: Wallet, auth: true },
  { path: '/profile', label: 'Perfil', icon: User, auth: true },
  { path: '/leaderboard', label: 'Ranking', icon: Trophy },
];

export default function Layout({ children }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => !item.auth || user);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0e11]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#161a1e] border-b border-[#2b3139]">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14 max-w-[1400px] mx-auto">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00b8d4] to-[#00e5ff] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text hidden sm:block">BetAll</span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'text-[#00b8d4] bg-[#00b8d4]/10'
                        : 'text-[#848e9c] hover:text-[#eaecef] hover:bg-[#1e2329]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Credits + Wallet + Profile */}
          <div className="flex items-center gap-3">
            {/* Credits badge */}
            {user && profile && (
              <div className="flex items-center gap-1.5 bg-[#1e2329] border border-[#2b3139] rounded-lg px-3 py-1.5">
                <Coins className="w-3.5 h-3.5 text-[#00b8d4]" />
                <span className="text-sm font-semibold text-[#eaecef]">
                  {profile.balance_credits.toLocaleString()}
                </span>
              </div>
            )}

            {/* Wallet connect */}
            <WalletConnect compact />

            {/* Profile dropdown */}
            {user && profile ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 hover:bg-[#1e2329] rounded-lg px-2 py-1.5 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00b8d4] to-[#00e5ff] flex items-center justify-center text-xs font-bold text-white">
                    {profile?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#848e9c] transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-[#161a1e] border border-[#2b3139] rounded-lg shadow-xl shadow-black/40 overflow-hidden z-50">
                    {/* User info */}
                    <div className="p-4 border-b border-[#2b3139]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00b8d4] to-[#00e5ff] flex items-center justify-center text-sm font-bold text-white">
                          {profile?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#eaecef] truncate">{profile?.username || 'Usuario'}</p>
                          <p className="text-xs text-[#848e9c] truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 bg-[#1e2329] rounded-lg px-3 py-2">
                        <Coins className="w-4 h-4 text-[#00b8d4]" />
                        <span className="text-sm font-bold text-[#eaecef]">{(profile?.balance_credits || 0).toLocaleString()}</span>
                        <span className="text-xs text-[#5e6673]">créditos</span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#848e9c] hover:text-[#eaecef] hover:bg-[#1e2329] transition-all"
                      >
                        <User className="w-4 h-4" />
                        Mi Perfil
                      </Link>
                      <Link
                        to="/wallet"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#848e9c] hover:text-[#eaecef] hover:bg-[#1e2329] transition-all"
                      >
                        <Wallet className="w-4 h-4" />
                        Billetera
                      </Link>
                      <Link
                        to="/leaderboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#848e9c] hover:text-[#eaecef] hover:bg-[#1e2329] transition-all"
                      >
                        <Trophy className="w-4 h-4" />
                        Ranking
                      </Link>
                    </div>

                    {/* Sign out */}
                    <div className="p-2 border-t border-[#2b3139]">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#f6465d] hover:bg-[#f6465d]/10 transition-all w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-sm px-4 py-2"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
