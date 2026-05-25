import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { createCampaign, sendCampaign, scheduleCampaign } from '../api/campaigns';
import { listSenderIds } from '../api/senderIds';
import { getBalance } from '../api/credits';
import AudienceFilter from '../components/campaign/AudienceFilter';
import MessageComposer from '../components/campaign/MessageComposer';
import SmsUnitCounter from '../components/campaign/SmsUnitCounter';
import { calculateSmsUnits } from '../utils/smsCalculator';
import { formatNumber } from '../utils/formatters';
import { ArrowLeft, ArrowRight, PaperPlane, Clock, Check, Coins } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Stepper from '../components/ui/Stepper';
import toast from 'react-hot-toast';

const steps = ['Audience', 'Message', 'Review & Send'];

export default function NewCampaign() {
  const { candidate } = useAuthStore();
  const navigate = useNavigate();
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

  useEffect(() => {
    listSenderIds().then(({ data }) => setSenderIds(data.filter((s) => s.status === 'approved'))).catch(() => {});
    getBalance().then(({ data }) => setBalance(data.balance)).catch(() => {});
  }, []);

  const smsUnits = calculateSmsUnits(message).units;
  const creditsNeeded = smsUnits * audienceCount;
  const hasEnough = balance >= creditsNeeded;

  const handleSend = async (schedule = false) => {
    setSending(true);
    try {
      const { data: camp } = await createCampaign({
        title,
        message,
        sender_id_ref: selectedSenderId || undefined,
        filters,
      });
      if (schedule && scheduledAt) {
        await scheduleCampaign(camp.id, new Date(scheduledAt).toISOString());
        toast.success('Campaign scheduled!');
      } else {
        await sendCampaign(camp.id);
        toast.success('Campaign queued for dispatch!');
      }
      navigate(`/campaigns/${camp.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send campaign');
    }
    setSending(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>

      <Stepper steps={steps} current={step} />

      <div className="card p-4 sm:p-6 space-y-6">
        {step === 0 && (
          <AudienceFilter
            institutionId={candidate?.institution_id}
            onFilterChange={(f, c) => { setFilters(f); setAudienceCount(c); }}
          />
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Input label="Campaign Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Manifesto Blast" />
            <Select label="Sender ID" value={selectedSenderId} onChange={(e) => setSelectedSenderId(e.target.value)} placeholder="CampusVoice (Default)" options={senderIds.map((s) => ({ value: s.id, label: s.sender_name }))} />
            <MessageComposer onChange={setMessage} />
            <SmsUnitCounter message={message} audienceCount={audienceCount} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-semibold text-text-primary">Review Your Campaign</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-xs text-text-muted">Audience</p>
                <p className="text-2xl font-bold text-primary">{formatNumber(audienceCount)}</p>
                <p className="text-xs text-text-muted">recipients</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-4 text-center">
                <p className="text-xs text-text-muted">SMS Units</p>
                <p className="text-2xl font-bold text-purple">{smsUnits}</p>
                <p className="text-xs text-text-muted">per recipient</p>
              </div>
            </div>

            <div className={`rounded-2xl p-4 text-center ${hasEnough ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coins weight="duotone" size={18} className={hasEnough ? 'text-green-500' : 'text-coral'} />
                <span className={`text-lg font-bold ${hasEnough ? 'text-green-500' : 'text-coral'}`}>
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

            <div className="flex flex-col sm:flex-row gap-3">
              {!hasEnough && (
                <Button variant="outline" onClick={() => navigate('/credits')} className="flex-1 !border-gold !text-gold hover:!bg-gold/10">Buy Credits</Button>
              )}
              <Button icon={PaperPlane} loading={sending} disabled={!hasEnough && creditsNeeded > 0} onClick={() => handleSend(false)} className="flex-1">{sending ? 'Sending...' : 'Send Now'}</Button>
              <Button variant="secondary" icon={Clock} loading={sending} disabled={sending || !scheduledAt || (!hasEnough && creditsNeeded > 0)} onClick={() => handleSend(true)} className="flex-1">Schedule</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        {step > 0 && (
          <Button variant="outline" icon={ArrowLeft} onClick={() => setStep(step - 1)}>Back</Button>
        )}
        {step < 2 && (
          <Button icon={ArrowRight} onClick={() => setStep(step + 1)} className="ml-auto">Next</Button>
        )}
      </div>
    </div>
  );
}
