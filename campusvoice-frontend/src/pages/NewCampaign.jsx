import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { createCampaign, sendCampaign, scheduleCampaign, getCampaign, updateCampaign } from '../api/campaigns';
import { listSenderIds } from '../api/senderIds';
import { getBalance } from '../api/credits';
import AudienceFilter from '../components/campaign/AudienceFilter';
import MessageComposer from '../components/campaign/MessageComposer';
import SmsUnitCounter from '../components/campaign/SmsUnitCounter';
import { calculateSmsUnits } from '../utils/smsCalculator';
import { formatNumber, formatDate } from '../utils/formatters';
import { ArrowLeft, ArrowRight, PaperPlane, Clock, Check, Coins, X } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Stepper from '../components/ui/Stepper';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';

const steps = ['Audience', 'Message', 'Review & Send'];

export default function NewCampaign() {
  const { candidate } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState({});
  const [audienceCount, setAudienceCount] = useState(0);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [senderIds, setSenderIds] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [balance, setBalance] = useState(0);
  const [sending, setSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [receipt, setReceipt] = useState(null);

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
        setFilters(data.filters || {});
        if (data.filters) {
          setAudienceCount(data.recipient_count || 0);
        }
      }).catch(() => {
        toast.error('Campaign not found');
        navigate('/campaigns', { replace: true });
      }).finally(() => setLoadingDraft(false));
    }
  }, [editId]);

  const smsUnits = calculateSmsUnits(message).units;
  const creditsNeeded = smsUnits * audienceCount;
  const hasEnough = balance >= creditsNeeded;

  const handleSend = async (schedule = false) => {
    setSending(true);
    try {
      const payload = {
        title,
        message,
        sender_id_ref: selectedSenderId || undefined,
        filters,
      };

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
        status: schedule ? 'scheduled' : 'queued',
        scheduledAt: schedule ? scheduledAt : null,
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send campaign');
    }
    setSending(false);
  };

  const handleSaveDraft = async () => {
    setSending(true);
    try {
      const payload = {
        title,
        message,
        sender_id_ref: selectedSenderId || undefined,
        filters,
      };

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
            <h2 className="text-xl font-extrabold text-text-primary">Campaign {receipt.status === 'scheduled' ? 'Scheduled' : 'Queued'}!</h2>
            <p className="text-sm text-text-muted mt-1">
              {receipt.status === 'scheduled'
                ? `Your campaign will be sent on ${formatDate(receipt.scheduledAt)}`
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
          <AudienceFilter
            institutionId={candidate?.institution_id}
            onFilterChange={(f, c) => { setFilters(f); setAudienceCount(c); }}
          />
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
              {!hasEnough && (
                <Button variant="outline" onClick={() => navigate('/credits')} className="flex-1 !border-gold !text-gold hover:!bg-gold/10">Buy Credits</Button>
              )}
              <Button variant="secondary" icon={Clock} loading={sending} disabled={sending || !scheduledAt || (!hasEnough && creditsNeeded > 0)} onClick={() => handleSend(true)} className="flex-1">Schedule</Button>
            </div>
            <Button icon={PaperPlane} loading={sending} disabled={creditsNeeded === 0} onClick={() => handleSend(false)} className="w-full">{sending ? 'Sending...' : 'Send Now'}</Button>
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
          {step < 2 && (
            <Button icon={ArrowRight} onClick={() => setStep(step + 1)} className="ml-auto">Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
