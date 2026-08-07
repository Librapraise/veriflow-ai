import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Link,
  ListChecks,
  Mail,
  Plus,
  Send,
  ShieldCheck,
  UserRound,
  Webhook,
} from 'lucide-react';
import { VeriFlowStore } from '../lib/apiStore';
import type { ClaimType, DocumentType } from '../types/veriflow';

const claimOptions: Array<{ id: ClaimType; label: string; description: string; recommended: DocumentType[] }> = [
  { id: 'degree_verified', label: 'Degree verified', description: 'Requires both a degree title and issuing institution.', recommended: ['degree_certificate'] },
  { id: 'currently_employed', label: 'Currently employed', description: 'Checks an employer, role, and evidence of an active engagement.', recommended: ['employment_record', 'payslip', 'resume'] },
  { id: 'income_above_threshold', label: 'Income above threshold', description: 'Confirms income or balance against the configured rule.', recommended: ['payslip', 'bank_statement'] },
  { id: 'age_above_18', label: 'Age above 18', description: 'Calculates age from a readable date of birth.', recommended: ['passport', 'drivers_license'] },
  { id: 'government_id_valid', label: 'Government ID valid', description: 'Checks identity-document fields and expiry.', recommended: ['passport', 'drivers_license'] },
  { id: 'unique_human_wallet', label: 'Unique human wallet', description: 'Links a consented identity check to one wallet.', recommended: ['passport', 'drivers_license'] },
];

const documentOptions: Array<{ id: DocumentType; label: string; description: string }> = [
  { id: 'degree_certificate', label: 'Degree Certificate', description: 'Degree title, institution, field, and graduation details.' },
  { id: 'employment_record', label: 'Employment Record', description: 'Employer, role, start date, and current/end status.' },
  { id: 'resume', label: 'Resume', description: 'Employment history and education credentials.' },
  { id: 'payslip', label: 'Payslip', description: 'Employer and recent income evidence.' },
  { id: 'bank_statement', label: 'Bank Statement', description: 'Currency, balances, deposits, and statement period.' },
  { id: 'passport', label: 'Passport / ID', description: 'Date of birth, document number, country, and expiry.' },
  { id: 'drivers_license', label: "Driver's License", description: 'Date of birth, licence number, and expiry.' },
];

const formatStatus = (value: string) => value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export const VerificationRequestsPage: React.FC = () => {
  const organizations = VeriFlowStore.getOrganizations();
  const organization = organizations[0];
  const [selectedClaims, setSelectedClaims] = useState<ClaimType[]>(['degree_verified']);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentType[]>(['degree_certificate']);
  const [subjectReference, setSubjectReference] = useState('candidate_10482');
  const [subjectEmail, setSubjectEmail] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [callbackUrl, setCallbackUrl] = useState(organization?.webhookUrl || '');
  const [requests, setRequests] = useState(VeriFlowStore.getVerificationRequests());
  const [latestUrl, setLatestUrl] = useState('');
  const [latestRequestId, setLatestRequestId] = useState('');
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);

  const recommendedDocuments = useMemo(() => {
    const values = claimOptions
      .filter(option => selectedClaims.includes(option.id))
      .flatMap(option => option.recommended);
    return [...new Set(values)];
  }, [selectedClaims]);

  const toggleClaim = (claim: ClaimType) => {
    setSelectedClaims(current => current.includes(claim) ? current.filter(item => item !== claim) : [...current, claim]);
    setFormError('');
  };

  const toggleDocument = (document: DocumentType) => {
    setSelectedDocuments(current => current.includes(document) ? current.filter(item => item !== document) : [...current, document]);
    setFormError('');
  };

  const selectRecommendedDocuments = () => {
    setSelectedDocuments(recommendedDocuments);
    setFormError('');
  };

  const create = () => {
    if (!organization) {
      setFormError('Create or connect an organization in the Developer Portal before issuing a request.');
      return;
    }
    if (!subjectReference.trim()) {
      setFormError('Add a candidate or customer reference. Do not use sensitive information as the reference.');
      return;
    }
    if (!selectedClaims.length) {
      setFormError('Select at least one claim to verify.');
      return;
    }
    if (!selectedDocuments.length) {
      setFormError('Select at least one document the subject is allowed to submit.');
      return;
    }
    if (callbackUrl && !/^https:\/\//i.test(callbackUrl)) {
      setFormError('Webhook URLs must start with https://, or leave the field empty.');
      return;
    }

    const request = VeriFlowStore.createVerificationRequest({
      organization,
      persona: 'hr',
      subjectReference: subjectReference.trim(),
      subjectEmail: subjectEmail.trim() || undefined,
      claims: selectedClaims,
      allowedDocumentTypes: selectedDocuments,
      callbackUrl: callbackUrl.trim() || undefined,
      expiresInHours: expiryHours,
    });

    setRequests(VeriFlowStore.getVerificationRequests());
    setLatestUrl(request.verificationUrl);
    setLatestRequestId(request.id);
    setCopied(false);
    setFormError('');
  };

  const copyLatestUrl = async () => {
    await navigator.clipboard.writeText(latestUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="text-xs font-bold text-teal-300 uppercase tracking-widest">B2B request suite</div>
        <h1 className="text-3xl font-black text-white mt-2">Create a Verification Request</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl">
          Define exactly what must be verified, what evidence the subject may provide, how long consent remains valid, and where the sanitized result should be delivered.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 divide-x divide-y lg:divide-y-0 divide-slate-800" aria-label="Verification request steps">
        {[
          ['1', 'Subject', 'Who receives it'],
          ['2', 'Evidence policy', 'Claims and documents'],
          ['3', 'Delivery', 'Expiry and webhook'],
          ['4', 'Review', 'Generate and share'],
        ].map(([number, label, detail]) => (
          <div key={number} className="px-3 py-3.5 sm:px-4">
            <div className="flex items-center gap-2"><span className="grid place-items-center w-6 h-6 rounded-full bg-teal-400/10 text-teal-300 text-xs font-black">{number}</span><span className="text-xs font-bold text-white">{label}</span></div>
            <div className="hidden sm:block text-[10px] text-slate-500 mt-1 ml-8">{detail}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row w-full gap-6 items-start">
        <section className="flex-1 min-w-0 w-full bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-300"><UserRound className="w-4 h-4" /></div>
              <div><h2 className="font-bold text-white">1. Identify the subject</h2><p className="text-xs text-slate-500 mt-1">Use your internal candidate or customer ID. Email is optional and is not placed in the public proof.</p></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-300">Subject reference *</span><input value={subjectReference} onChange={event => setSubjectReference(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm" placeholder="candidate_10482" /></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-300">Subject email <span className="text-slate-600">(optional)</span></span><div className="relative"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" /><input type="email" value={subjectEmail} onChange={event => setSubjectEmail(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-3 text-sm" placeholder="candidate@example.com" /></div></label>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5 border-t border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300"><ShieldCheck className="w-4 h-4" /></div>
              <div><h2 className="font-bold text-white">2. Define the evidence policy</h2><p className="text-xs text-slate-500 mt-1">Claims define the facts you receive. Allowed documents define what the subject is permitted to upload.</p></div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-300 mb-2">Claims to verify *</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {claimOptions.map(option => {
                  const selected = selectedClaims.includes(option.id);
                  return <button type="button" key={option.id} onClick={() => toggleClaim(option.id)} aria-pressed={selected} className={`p-3 rounded-xl border text-left transition ${selected ? 'bg-teal-500/10 border-teal-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}><div className="flex items-center justify-between gap-2"><span className={selected ? 'text-teal-300 text-xs font-bold' : 'text-slate-300 text-xs font-bold'}>{option.label}</span>{selected && <CheckCircle2 className="w-4 h-4 text-teal-400" />}</div><p className="text-[10px] leading-relaxed text-slate-500 mt-1">{option.description}</p></button>;
                })}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><div className="text-xs font-bold text-slate-300">Allowed documents *</div>{recommendedDocuments.length > 0 && <button type="button" onClick={selectRecommendedDocuments} className="text-[10px] text-cyan-300 hover:text-cyan-200">Use recommended documents</button>}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {documentOptions.map(option => {
                  const selected = selectedDocuments.includes(option.id);
                  const recommended = recommendedDocuments.includes(option.id);
                  return <button type="button" key={option.id} onClick={() => toggleDocument(option.id)} aria-pressed={selected} className={`p-3 rounded-xl border text-left transition relative ${selected ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}`}><div className="flex justify-between gap-2"><span className="text-xs font-bold">{option.label}</span>{recommended && <span className="text-[9px] uppercase tracking-wide text-teal-400">Recommended</span>}</div><p className="text-[10px] leading-relaxed text-slate-500 mt-1">{option.description}</p></button>;
                })}
              </div>
              <p className="text-[10px] text-slate-600 mt-2">The subject can submit one of the selected document types. VeriFlow returns only the requested claim result, not the raw document.</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 border-t border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-300"><Send className="w-4 h-4" /></div>
              <div><h2 className="font-bold text-white">3. Configure expiry and result delivery</h2><p className="text-xs text-slate-500 mt-1">The subject link expires automatically. A webhook is optional for programmatic result delivery.</p></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-300">Request expires after</span><div className="relative"><Clock3 className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" /><select value={expiryHours} onChange={event => setExpiryHours(Number(event.target.value))} className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-3 text-sm"><option value={1}>1 hour</option><option value={24}>24 hours</option><option value={72}>3 days</option><option value={168}>7 days</option></select></div></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-300">Result webhook <span className="text-slate-600">(optional)</span></span><div className="relative"><Webhook className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" /><input value={callbackUrl} onChange={event => setCallbackUrl(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-3 text-sm" placeholder="https://api.example.com/webhooks/veriflow" /></div></label>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] text-slate-500"><strong className="text-slate-300">What the webhook receives:</strong> request ID, claim status, verification ID, timestamp, and proof reference. It should never receive the uploaded source document.</div>
          </div>
        </section>

        <aside className="w-full lg:w-[380px] shrink-0">
          <section className="bg-slate-900/90 border border-teal-500/20 rounded-2xl p-5 lg:sticky lg:top-24 shadow-xl shadow-slate-950/20">
            <div className="text-[10px] uppercase tracking-[0.18em] text-teal-300 font-black">4. Review request</div>
            <h2 className="font-bold text-white mt-2">Ready to generate</h2>
            <div className="space-y-3 mt-4 text-xs">
              <div><div className="text-slate-600">Organization</div><div className="text-slate-300 mt-0.5">{organization?.name || 'No organization configured'}</div></div>
              <div><div className="text-slate-600">Subject</div><div className="text-slate-300 mt-0.5 break-words">{subjectReference || 'Not provided'}</div></div>
              <div><div className="text-slate-600">Claims</div><div className="flex flex-wrap gap-1 mt-1">{selectedClaims.map(claim => <span key={claim} className="px-2 py-1 rounded-md bg-teal-500/10 text-teal-300">{claimOptions.find(option => option.id === claim)?.label}</span>)}</div></div>
              <div><div className="text-slate-600">Allowed evidence</div><div className="flex flex-wrap gap-1 mt-1">{selectedDocuments.map(document => <span key={document} className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300">{documentOptions.find(option => option.id === document)?.label}</span>)}</div></div>
              <div className="grid grid-cols-2 gap-3"><div><div className="text-slate-600">Expires</div><div className="text-slate-300 mt-0.5">{expiryHours < 24 ? `${expiryHours} hour` : `${expiryHours / 24} day${expiryHours > 24 ? 's' : ''}`}</div></div><div><div className="text-slate-600">Delivery</div><div className="text-slate-300 mt-0.5">{callbackUrl ? 'Dashboard + webhook' : 'Dashboard only'}</div></div></div>
            </div>

            {formError && <div role="alert" className="mt-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">{formError}</div>}

            <button onClick={create} className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-950 font-black hover:brightness-110 transition"><Plus className="w-4 h-4 inline mr-2" />Generate subject link</button>

            {latestUrl && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"><div className="flex items-center gap-2 text-xs font-bold text-emerald-300"><CheckCircle2 className="w-4 h-4" />Request created</div><div className="text-[10px] text-slate-500 mt-1">ID: {latestRequestId}</div><code className="block truncate mt-3 p-2 rounded-lg bg-slate-950 text-[10px] text-emerald-300">{latestUrl}</code><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={copyLatestUrl} className="py-2 rounded-lg bg-slate-800 text-xs text-slate-200"><Copy className="w-3.5 h-3.5 inline mr-1" />{copied ? 'Copied' : 'Copy link'}</button><a href={latestUrl} target="_blank" rel="noreferrer" className="py-2 rounded-lg bg-emerald-500/10 text-xs text-emerald-300 text-center"><ExternalLink className="w-3.5 h-3.5 inline mr-1" />Test link</a></div><div className="mt-3 pt-3 border-t border-slate-800 text-[10px] leading-relaxed text-slate-500"><strong className="text-slate-300">Next:</strong> send the link to the subject. They review consent, upload an allowed document, approve verification, and you track the sanitized result below.</div></div>}
          </section>
        </aside>
      </div>

      <section className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-white flex items-center gap-2"><ListChecks className="w-4 h-4 text-teal-400" />Request activity</h2><p className="text-[11px] text-slate-500 mt-1">Track consent and verification status after sharing a subject link.</p></div><span className="text-[10px] text-slate-600">{requests.length} total</span></div>
        {requests.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">No requests yet. Complete the four steps above to generate your first subject link.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">{requests.slice(0, 9).map(request => <article key={request.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="flex justify-between gap-3 text-xs"><span className="font-bold text-slate-200 truncate">{request.subjectReference}</span><span className="text-teal-300 whitespace-nowrap">{formatStatus(request.status)}</span></div><div className="text-[10px] text-slate-600 mt-1">{request.id} · expires {new Date(request.expiresAt).toLocaleDateString()}</div><div className="text-[10px] text-slate-400 mt-3">{request.claims.map(claim => claimOptions.find(option => option.id === claim)?.label || claim).join(', ')}</div><div className="text-[10px] text-slate-600 mt-1">Evidence: {request.allowedDocumentTypes.map(document => documentOptions.find(option => option.id === document)?.label || document).join(', ')}</div><button onClick={() => navigator.clipboard.writeText(request.verificationUrl)} className="mt-3 text-[10px] text-cyan-400"><Link className="w-3 h-3 inline mr-1" />Copy subject link</button></article>)}</div>}
      </section>
    </div>
  );
};
