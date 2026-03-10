import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Coins, CreditCard, Loader2, Sparkles, Star, Zap, Crown, X } from 'lucide-react';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const packageIcons = {
  starter: Zap,
  popular: Star,
  pro: Sparkles,
  whale: Crown,
};

const packageColors = {
  starter: { border: 'border-[#2b3139]', hover: 'hover:border-[#00b8d4]/40', bg: '' },
  popular: { border: 'border-[#00b8d4]/50', hover: 'hover:border-[#00b8d4]', bg: 'ring-1 ring-[#00b8d4]/20' },
  pro: { border: 'border-[#2b3139]', hover: 'hover:border-[#00b8d4]/40', bg: '' },
  whale: { border: 'border-[#2b3139]', hover: 'hover:border-[#00b8d4]/40', bg: '' },
};

export default function BuyCredits() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const { refreshProfile } = useAuth();

  useEffect(() => {
    fetchPackages();
  }, []);

  async function fetchPackages() {
    try {
      const data = await api('/stripe/packages');
      setPackages(data);
    } catch (e) {
      console.error('Error fetching packages:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(pkgId) {
    setSelectedPkg(pkgId);
    try {
      const data = await api('/stripe/checkout', {
        method: 'POST',
        body: { packageId: pkgId },
      });
      setClientSecret(data.clientSecret);
      setCheckoutOpen(true);
    } catch (e) {
      toast.error(e.message || 'Error al iniciar checkout');
      setSelectedPkg(null);
    }
  }

  function handleClose() {
    setCheckoutOpen(false);
    setClientSecret(null);
    setSelectedPkg(null);
    // Refresh profile in case payment completed
    refreshProfile();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#00b8d4]" />
      </div>
    );
  }

  return (
    <>
      <div>
        <h3 className="text-lg font-bold text-[#eaecef] mb-1 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#00b8d4]" />
          Comprar Créditos
        </h3>
        <p className="text-sm text-[#5e6673] mb-4">Pagá con tarjeta de crédito o débito</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {packages.map((pkg) => {
            const Icon = packageIcons[pkg.id] || Coins;
            const colors = packageColors[pkg.id] || packageColors.starter;
            const isPopular = pkg.id === 'popular';

            return (
              <div
                key={pkg.id}
                className={`relative bg-[#161a1e] border ${colors.border} ${colors.hover} ${colors.bg} rounded-lg p-4 transition-all cursor-pointer group`}
                onClick={() => handleBuy(pkg.id)}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#00b8d4] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    POPULAR
                  </div>
                )}

                {/* Bonus badge */}
                {pkg.bonus > 0 && (
                  <div className="absolute -top-2 -right-2 bg-[#2ebd85] text-white text-[10px] font-bold w-8 h-8 rounded-full flex items-center justify-center">
                    +{pkg.bonus}%
                  </div>
                )}

                <div className="text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${isPopular ? 'text-[#00b8d4]' : 'text-[#848e9c]'} group-hover:text-[#00b8d4] transition-colors`} />
                  <p className="text-xs text-[#5e6673] mb-1">{pkg.name}</p>
                  <p className="text-2xl font-black text-[#eaecef] mb-1">{pkg.priceDisplay}</p>
                  <p className="text-sm font-semibold text-[#00b8d4]">
                    {pkg.credits.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#5e6673]">créditos</p>
                </div>

                <button
                  disabled={selectedPkg === pkg.id}
                  className={`w-full mt-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isPopular
                      ? 'bg-[#00b8d4] text-white hover:bg-[#00d4f5]'
                      : 'bg-[#1e2329] text-[#848e9c] hover:bg-[#2b3139] hover:text-[#eaecef] border border-[#2b3139]'
                  } disabled:opacity-50`}
                >
                  {selectedPkg === pkg.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                  ) : (
                    'Comprar'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stripe Checkout Modal */}
      {checkoutOpen && clientSecret && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative mx-4">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            <div className="p-1">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
