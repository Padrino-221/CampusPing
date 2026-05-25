import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBalance, getTransactions, getPackages, purchaseCredits, verifyPayment } from '../api/credits';
import { formatDate, formatNumber, formatCurrency } from '../utils/formatters';
import { Coins, CreditCard, ArrowUpRight, Clock, CheckCircle, SpinnerGap } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

export default function Credits() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [purchasing, setPurchasing] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('reference');
    if (ref) {
      setVerifying(true);
      verifyPayment(ref)
        .then(({ data }) => {
          toast.success('Payment verified! Credits added.');
          refresh();
        })
        .catch((err) => {
          toast.error(err.response?.data?.detail || 'Verification failed');
        })
        .finally(() => {
          setVerifying(false);
          window.history.replaceState({}, '', '/credits');
        });
    }
  }, []);

  const refresh = () => {
    getBalance().then(({ data }) => setBalance(data.balance)).catch(() => {});
    getTransactions().then(({ data }) => setTransactions(data || [])).catch(() => {});
    getPackages().then(({ data }) => setPackages(data || [])).catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  const handlePurchase = async (pkg) => {
    setPurchasing(pkg.id);
    try {
      const { data } = await purchaseCredits(pkg.id);
      window.location.href = data.authorization_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Purchase failed');
    }
    setPurchasing(null);
  };

  const typeColors = {
    purchase: 'text-green-500 bg-green-50',
    deduction: 'text-coral bg-red-50',
    pending: 'text-gold bg-gold/10',
    completed: 'text-primary bg-blue-50',
  };

  const typeIcons = {
    purchase: ArrowUpRight,
    deduction: ArrowUpRight,
    pending: Clock,
    completed: CheckCircle,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Billing & Top-up</h1>
        <p className="text-sm text-text-muted mt-1">Manage your SMS credits</p>
      </div>

      {verifying && (
        <div className="card p-6 flex items-center justify-center gap-3 text-primary">
          <SpinnerGap weight="duotone" size={20} className="animate-spin" />
          <span className="font-medium">Verifying payment...</span>
        </div>
      )}

      <div className="card p-5 sm:p-6 flex items-center gap-4">
        <div className="p-3 sm:p-4 rounded-2xl bg-gold/10 shrink-0">
          <Coins weight="duotone" size={28} className="text-gold" />
        </div>
        <div>
          <p className="text-xs text-text-muted">Current Balance</p>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary">{formatNumber(balance)}</p>
          <p className="text-xs text-text-muted">SMS Credits</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-text-primary mb-4">Credit Packages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="card p-5 flex flex-col">
              <h4 className="font-bold text-lg text-text-primary">{pkg.name}</h4>
              <p className="text-2xl font-bold text-primary mt-2">{formatNumber(pkg.credits)}</p>
              <p className="text-sm text-text-muted mb-1">credits</p>
              <p className="text-lg font-semibold text-text-primary mb-4">{formatCurrency(pkg.price_ghs)}</p>
              <Button
                onClick={() => handlePurchase(pkg)}
                loading={purchasing === pkg.id}
                icon={CreditCard}
                className="w-full"
              >
                {purchasing === pkg.id ? 'Processing...' : 'Buy Now'}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <h3 className="font-semibold text-text-primary mb-4">Transaction History</h3>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No transactions yet</p>
          ) : (
            transactions.map((t) => {
              const Icon = typeIcons[t.type] || Clock;
              const tc = typeColors[t.type] || typeColors.pending;
              return (
                <div key={t.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${tc}`}>
                      <Icon weight="duotone" size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{t.description || t.type}</p>
                      <p className="text-xs text-text-muted">{formatDate(t.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${t.amount > 0 ? 'text-green-500' : 'text-coral'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </p>
                    <p className="text-xs text-text-muted">Balance: {formatNumber(t.balance_after)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
