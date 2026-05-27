import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { createCampaign, sendCampaign, scheduleCampaign, getCampaign, updateCampaign } from '../api/campaigns';
import { listSenderIds } from '../api/senderIds';
import { getBalance, getPackages, purchaseCredits, verifyPayment } from '../api/credits';
import AudienceFilter from '../components/campaign/AudienceFilter';
import MessageComposer from '../components/campaign/MessageComposer';
import SmsUnitCounter from '../components/campaign/SmsUnitCounter';
import { calculateSmsUnits } from '../utils/smsCalculator';
import { formatNumber, formatDate, formatCurrency } from '../utils/formatters';
import { ArrowLeft, ArrowRight, PaperPlane, Clock, Check, Coins, Users, AddressBook, CreditCard, SpinnerGap } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Stepper from '../components/ui/Stepper';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const steps = ['Audience', 'Message', 'Review & Send'];

export default function NewCampaign() {
  const { candidate } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [step, setStep] = useState(0);
  const [source, setSource] = useState('directory');
  const [filters, setFilters] = useState({});
  const [audienceCount, setAudienceCount] = useState(0);
  const [contactsText, setContactsText] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [senderIds, setSenderIds] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [balance, setBalance] = useState(0);
  const [sending, setSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [packages, setPackages] = useState([]);
  const [purchasing, setPurchasing] = useState(null);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    listSenderIds().then(({ data }) => setSenderIds(data.filter((s) => s.status === 'approved'))).catch(() => {});
    getBalance().then(({ data }) => setBalance(data.balance)).catch(() => {});

    if (editId) {
      setLoadingDraft(true);
      getCampaign(editId).then(({ data }) => {
        if (data.status !== 'draft') {
          toast.error('Only draft campaigns can be edited');
          navigate('/campaigns', { replace: true });
          return;
        }
        setTitle(data.title || '');
        setMessage(data.message || '');
        setSelectedSenderId(data.sender_id_ref || '');
        if (data.custom_recipients && data.custom_recipients.length > 0) {
          setSource('contacts');
          setContactsText(data.custom_recipients.join('\n'));
          setAudienceCount(data.recipient_count || 0);
        } else {
          setFilters(data.filters || {});
          setAudienceCount(data.recipient_count || 0);
        }
      }).catch(() => {
        toast.error('Campaign not found');
        navigate('/campaigns', { replace: true });
      }).finally(() => setLoadingDraft(false));
    }
  }, [editId]);

  const parseContacts = (text) => {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const phones = [];
    for (const line of lines) {
      const parts = line.split(/[,;]+/).map((p) => p.trim()).filter((p) => p.length > 0);
      phones.push(...parts);
    }
    return [...new Set(phones)];
  };

  useEffect(() => {
    if (source === 'contacts') {
      const contacts = parseContacts(contactsText);
      setAudienceCount(contacts.length);
    }
  }, [contactsText, source]);

  const smsUnits = calculateSmsUnits(message).units;
  const creditsNeeded = smsUnits * audienceCount;
  const hasEnough = balance >= creditsNeeded;

  const getPayload = () => {
    if (source === 'contacts') {
      const contacts = parseContacts(contactsText);
      return {
        title,
        message,
        sender_id_ref: selectedSenderId || undefined,
        filters: {},
        custom_recipients: contacts,
      };
    }
    return {
      title,
      message,
      sender_id_ref: selectedSenderId || undefined,
      filters,
    };
  };

  const doSend = async (schedule = false) => {
    setSending(true);
    try {
      const payload = getPayload();

      let camp;
      if (editId) {
        const { data } = await updateCampaign(editId, payload);
        camp = data;
      } else {
        const { data } = await createCampaign(payload);
        camp = data;
      }

      let result;
      if (schedule && scheduledAt) {
        const { data } = await scheduleCampaign(camp.id, new Date(scheduledAt).toISOString());
        result = data;
      } else {
        const { data } = await sendCampaign(camp.id);
        result = data;
      }

      setReceipt({
        id: camp.id,
        title: camp.title,
        recipients: result.recipient_count || camp.recipient_count,
        credits: result.credits_used || creditsNeeded,
        status: result.status || (schedule ? 'scheduled' : 'queued'),
        scheduledAt: schedule ? scheduledAt : null,
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send campaign');
    }
    setSending(false);
  };

  const handleSend = (schedule = false) => {
    if (creditsNeeded > 0 && !hasEnough) {
      setPendingAction(() => schedule ? doSend.bind(null, true) : doSend.bind(null, false));
      openPayModal();
      return;
    }
    doSend(schedule);
  };

  const handleSaveDraft = async () => {
    setSending(true);
    try {
      const payload = getPayload();

      if (editId) {
        await updateCampaign(editId, payload);
        toast.success('Draft updated!');
      } else {
        await createCampaign(payload);
        toast.success('Draft saved!');
      }
      navigate('/campaigns');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save draft');
    }
    setSending(false);
  };

  const openPayModal = () => {
    getPackages().then(({ data }) => setPackages(data || [])).catch(() => {});
    setPendingPurchase(null);
    setPayModalOpen(true);
  };

  const handlePurchase = async (pkg) => {
    setPurchasing(pkg.id);
    try {
      const { data } = await purchaseCredits(pkg.id);
      setPendingPurchase({ reference: data.reference, packageName: data.package });
      window.open(data.authorization_url, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Purchase failed');
    }
    setPurchasing(null);
  };

  const handleVerify = async () => {
    if (!pendingPurchase) return;
    setVerifying(true);
    try {
      await verifyPayment(pendingPurchase.reference);
      toast.success('Credits added!');
      const { data } = await getBalance();
      setBalance(data.balance);
      setPayModalOpen(false);
      setPendingPurchase(null);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed. Try again.');
    }
    setVerifying(false);
  };

  if (loadingDraft) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <p className="text-text-muted text-sm">Loading campaign...</p>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="max-w-lg mx-auto space-y-6 mt-12">
        <div className="card p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check weight="bold" size={32} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-text-primary">
              {receipt.status === 'scheduled' ? 'Campaign Scheduled!' : receipt.status === 'completed' ? 'Campaign Sent!' : 'Campaign Queued!'}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {receipt.status === 'scheduled'
                ? `Your campaign will be sent on ${formatDate(receipt.scheduledAt)}`
                : receipt.status === 'completed'
                  ? 'Your campaign has been sent successfully'
                  : 'Your campaign is being dispatched to recipients'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4">
            <div>
              <p className="text-xs text-text-muted">Recipients</p>
              <p className="text-lg font-extrabold text-text-primary">{formatNumber(receipt.recipients)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Credits Used</p>
              <p className="text-lg font-extrabold text-text-primary">{formatNumber(receipt.credits)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(`/campaigns/${receipt.id}`)} className="flex-1">
              View Details
            </Button>
            <Button onClick={() => navigate('/campaigns')} className="flex-1">
              All Campaigns
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/campaigns')}>
        {editId ? 'Back to Campaigns' : 'Back to Dashboard'}
      </Button>

      <Stepper steps={steps} current={step} />

      <div className="card p-6 space-y-6">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Users weight="duotone" size={18} className="text-primary" />
              <h3 className="font-bold text-text-primary">Target Audience</h3>
            </div>

            <div className="flex gap-2 bg-gray-50 rounded-2xl p-1.5">
              <button
                onClick={() => setSource('directory')}
                className={`cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  source === 'directory' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Users weight="duotone" size={16} />
                Student Directory
              </button>
              <button
                onClick={() => setSource('contacts')}
                className={`cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  source === 'contacts' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <AddressBook weight="duotone" size={16} />
                My Contacts
              </button>
            </div>

            {source === 'directory' ? (
              <AudienceFilter
                institutionId={candidate?.institution_id}
                onFilterChange={(f, c) => { setFilters(f); setAudienceCount(c); }}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wide">
                  Paste Phone Numbers
                </p>
                <p className="text-xs text-text-muted">
                  One number per line, or comma-separated. Ghanaian numbers (e.g. 024XXXXXXX) supported.
                </p>
                <textarea
                  value={contactsText}
                  onChange={(e) => setContactsText(e.target.value)}
                  placeholder="0241234567&#10;0247654321&#10;0551234567, 0549876543"
                  className="w-full h-40 px-4 py-3 text-sm rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-y transition-all"
                />
                <div className="stat-card-blue rounded-2xl p-5 text-center">
                  <AddressBook weight="duotone" size={24} className="mx-auto text-primary mb-2" />
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wide">Total Contacts</p>
                  <p className="text-4xl font-extrabold text-primary">{formatNumber(audienceCount)}</p>
                  <p className="text-xs font-medium text-text-muted mt-1">phone numbers parsed</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Input label="Campaign Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Manifesto Blast" />
            <Select label="Sender ID" value={selectedSenderId} onChange={(e) => setSelectedSenderId(e.target.value)} placeholder="CampusAlerts (Default)" options={senderIds.map((s) => ({ value: s.id, label: s.sender_name }))} />
            <MessageComposer onChange={setMessage} initial={message} />
            <SmsUnitCounter message={message} audienceCount={audienceCount} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-bold text-text-primary">Review Your Campaign</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-xs text-text-muted">Audience</p>
                <p className="text-2xl font-extrabold text-primary">{formatNumber(audienceCount)}</p>
                <p className="text-xs text-text-muted">recipients</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-4 text-center">
                <p className="text-xs text-text-muted">SMS Units</p>
                <p className="text-2xl font-extrabold text-purple">{smsUnits}</p>
                <p className="text-xs text-text-muted">per recipient</p>
              </div>
            </div>

            <div className={`rounded-2xl p-4 text-center ${hasEnough ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coins weight="duotone" size={18} className={hasEnough ? 'text-green-500' : 'text-coral'} />
                <span className={`text-lg font-extrabold ${hasEnough ? 'text-green-500' : 'text-coral'}`}>
                  {formatNumber(creditsNeeded)} credits needed
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Balance: {formatNumber(balance)} credits
                {!hasEnough && ` — Need ${formatNumber(creditsNeeded - balance)} more`}
              </p>
            </div>

            {message && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs text-text-muted mb-2">Message Preview</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{message}</p>
              </div>
            )}

            <Input label="Schedule (optional)" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />

            <div className="flex gap-3">
              <Button variant="secondary" icon={Clock} loading={sending} disabled={sending || !scheduledAt || creditsNeeded === 0} onClick={() => handleSend(true)} className="flex-1">Schedule</Button>
            </div>
            <Button icon={PaperPlane} loading={sending} disabled={sending || creditsNeeded === 0} onClick={() => handleSend(false)} className="w-full">{sending ? 'Sending...' : 'Send Now'}</Button>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" icon={ArrowLeft} onClick={() => setStep(step - 1)}>Back</Button>
          )}
        </div>
        <div className="flex gap-3">
          {step < 2 && (
            <Button variant="ghost" disabled={sending} onClick={handleSaveDraft}>Save Draft</Button>
          )}
          {step === 0 && (
            <Button icon={ArrowRight} onClick={() => setStep(step + 1)} className="ml-auto">Next</Button>
          )}
          {step === 1 && (
            <Button icon={ArrowRight} disabled={!message.trim()} onClick={() => { if (!message.trim()) { toast.error('Write a message before proceeding'); return; } setStep(step + 1); }} className="ml-auto">Next</Button>
          )}
        </div>
      </div>

      <Modal isOpen={payModalOpen} onClose={() => { setPayModalOpen(false); setPendingAction(null); }} title="Buy Credits">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            You need <strong className="text-text-primary">{formatNumber(creditsNeeded)} credits</strong> to send this campaign.
            Your balance is <strong className="text-text-primary">{formatNumber(balance)} credits</strong>.
          </p>

          {!pendingPurchase ? (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 hover:border-primary transition-colors">
                  <div>
                    <p className="text-sm font-bold text-text-primary">{pkg.name}</p>
                    <p className="text-xs text-text-muted">{formatNumber(pkg.credits)} credits — {formatCurrency(pkg.price_ghs)}</p>
                  </div>
                  <Button size="sm" onClick={() => handlePurchase(pkg)} loading={purchasing === pkg.id}>
                    Buy
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-blue-50">
                <p className="text-sm font-medium text-text-primary mb-1">Payment initiated for {pendingPurchase.packageName}</p>
                <p className="text-xs text-text-muted">Complete payment in the new tab, then click below.</p>
              </div>
              <Button onClick={handleVerify} loading={verifying} className="w-full" icon={SpinnerGap}>
                {verifying ? 'Verifying...' : "I've Paid — Verify"}
              </Button>
            </div>
          )}

          <div className="pt-2">
            <Button variant="ghost" onClick={() => { setPayModalOpen(false); setPendingAction(null); }} className="w-full text-sm">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
