import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, Wallet, User, Trophy, LogOut, Menu, X, TrendingUp, Coins,
} from 'lucide-react';
import WalletConnect from './WalletConnect';

const navItems = [
  { path: '/', label: 'Mercados', icon: Home },
  { path: '/wallet', label: 'Billetera', icon: Wallet, auth: true },
  { path: '/profile', label: 'Perfil', icon: User, auth: true },
  { path: '/leaderboard', label: 'Ranking', icon: Trophy },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => !item.auth || user);

  return (
    <div className="min-h-screen bg-[#0b0e11] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#161a1e] border-r border-[#2b3139] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#2b3139]">
          <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00b8d4] to-[#00e5ff] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">BetAll</h1>
              <p className="text-[10px] text-[#5e6673] -mt-0.5">Mercado de Predicciones</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#00b8d4]/10 text-[#00b8d4] border border-[#00b8d4]/20'
                    : 'text-[#848e9c] hover:text-[#eaecef] hover:bg-[#1e2329]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        {user && (
          <div className="p-4 border-t border-[#2b3139]">
            <div className="glass-card p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00b8d4] to-[#00e5ff] flex items-center justify-center text-xs font-bold text-white">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#eaecef] truncate">{profile?.username || 'Usuario'}</p>
                  <p className="text-xs text-[#848e9c] flex items-center gap-1">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    {(profile?.balance_credits || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-xs text-[#848e9c] hover:text-[#f6465d] transition-colors w-full px-1"
              >
                <LogOut className="w-3 h-3" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {!user && (
          <div className="p-4 border-t border-[#2b3139]">
            <Link
              to="/login"
              onClick={() => setSidebarOpen(false)}
              className="btn-primary block text-center text-sm"
            >
              Iniciar Sesión
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0b0e11] border-b border-[#2b3139]">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#848e9c] hover:text-[#eaecef]"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {user && profile && (
                <div className="flex items-center gap-2 glass-card px-4 py-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-[#eaecef]">
                    {profile.balance_credits.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#848e9c]">créditos</span>
                </div>
              )}
              <WalletConnect compact />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
