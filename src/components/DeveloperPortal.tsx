import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, BriefcaseBusiness, ChevronRight, Copy, Key, Landmark, Plus, Send, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import type { ClaimType, DocumentType, OrganizationPersona, VerificationRequest } from '../types/veriflow';
import { VeriFlowStore } from '../lib/apiStore';

const PERSONAS: Array<{ id: OrganizationPersona; label: string; description: string; icon: React.ElementType }> = [
  { id: 'hr', label: 'HR & Recruiting', description: 'Verify degrees, employment, roles, and tenure.', icon: Users },
  { id: 'fintech', label: 'Fintech & Lending', description: 'Check age, income, balances, and identity validity.', icon: Landmark },
  { id: 'web3', label: 'Web3 & DAOs', description: 'Verify wallet-linked eligibility and unique humans.', icon: Wallet },
  { id: 'marketplace', label: 'Marketplace', description: 'Verify professional credentials before access.', icon: BriefcaseBusiness },
];

const TEMPLATES: Record<OrganizationPersona, Array<{ label: string; description: string; claims: ClaimType[]; documents: DocumentType[] }>> = {
  hr: [
    { label: 'Degree verification', description: 'Confirm a degree title and institution.', claims: ['degree_verified'], documents: ['degree_certificate'] },
    { label: 'Current employment', description: 'Confirm an active employer or role.', claims: ['currently_employed'], documents: ['employment_record', 'payslip', 'resume'] },
    { label: 'Employment package', description: 'Check degree, employer, and current role together.', claims: ['degree_verified', 'currently_employed'], documents: ['degree_certificate', 'employment_record', 'payslip', 'resume'] },
  ],
  fintech: [
    { label: 'Age eligibility', description: 'Check whether a customer meets an age threshold.', claims: ['age_above_18'], documents: ['passport', 'drivers_license'] },
    { label: 'Income threshold', description: 'Check income or balance without receiving the document.', claims: ['income_above_threshold'], documents: ['payslip', 'bank_statement'] },
  ],
  web3: [
    { label: 'Wallet eligibility', description: 'Verify a wallet-linked eligibility claim.', claims: ['unique_human_wallet'], documents: ['passport', 'drivers_license'] },
    { label: 'Age-gated access', description: 'Verify age eligibility for a wallet holder.', claims: ['age_above_18'], documents: ['passport', 'drivers_license'] },
  ],
  marketplace: [
    { label: 'Professional credential', description: 'Confirm a degree and institution.', claims: ['degree_verified'], documents: ['degree_certificate'] },
    { label: 'Active professional', description: 'Confirm an active employer or role.', claims: ['currently_employed'], documents: ['employment_record', 'resume', 'payslip'] },
  ],
};

const statusLabel: Record<VerificationRequest['status'], string> = {
  awaiting_subject: 'Awaiting candidate', document_submitted: 'Document submitted', processing: 'Processing', verified: 'Verified', denied: 'Denied', unverifiable: 'Needs review', expired: 'Expired', revoked: 'Revoked',
};

export const DeveloperPortal: React.FC = () => {
  const [organizations, setOrganizations] = useState(VeriFlowStore.getOrganizations());
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]);
  const [persona, setPersona] = useState<OrganizationPersona>('hr');
  const [templateIndex, setTemplateIndex] = useState(0);
  const [subjectReference, setSubjectReference] = useState('candidate_10482');
  const [subjectEmail, setSubjectEmail] = useState('');
  const [callbackUrl, setCallbackUrl] = useState(selectedOrg?.webhookUrl || '');
  const [requests, setRequests] = useState<VerificationRequest[]>(VeriFlowStore.getVerificationRequests());
  const [createdRequest, setCreatedRequest] = useState<VerificationRequest | null>(null);
  const [copied, setCopied] = useState('');
  const [sdkLanguage, setSdkLanguage] = useState<'curl' | 'typescript' | 'python'>('curl');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgWebhook, setNewOrgWebhook] = useState('');
  const template = TEMPLATES[persona][templateIndex] || TEMPLATES[persona][0];

  const curlSnippet = useMemo(() => `curl -X POST "${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/v1/verification-requests" \\
  -H "Authorization: Bearer ${selectedOrg?.apiKey || 'vf_live_...'}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ subject_reference: subjectReference, claims: template.claims.map(type => ({ type })), allowed_document_types: template.documents, expires_in: 86400, callback_url: callbackUrl || undefined }, null, 2)}'`, [selectedOrg, subjectReference, template, callbackUrl]);
  const sdkSnippet = sdkLanguage === 'curl' ? curlSnippet : sdkLanguage === 'typescript'
    ? `const response = await fetch('${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/v1/verification-requests', {\n  method: 'POST',\n  headers: { Authorization: 'Bearer ${selectedOrg?.apiKey || 'vf_live_...'}', 'Content-Type': 'application/json' },\n  body: JSON.stringify(${JSON.stringify({ subject_reference: subjectReference, claims: template.claims.map(type => ({ type })), allowed_document_types: template.documents, expires_in: 86400 }, null, 2)})\n});\nconst request = await response.json();`
    : `import requests\n\nresponse = requests.post(\n    '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/v1/verification-requests',\n    headers={'Authorization': 'Bearer ${selectedOrg?.apiKey || 'vf_live_...'}'},\n    json=${JSON.stringify({ subject_reference: subjectReference, claims: template.claims.map(type => ({ type })), allowed_document_types: template.documents, expires_in: 86400 }, null, 2)}\n)\nprint(response.json())`;

  const copy = (value: string, label: string) => { navigator.clipboard.writeText(value); setCopied(label); setTimeout(() => setCopied(''), 1600); };

  const createRequest = () => {
    if (!selectedOrg || !subjectReference.trim()) return;
    const request = VeriFlowStore.createVerificationRequest({ organization: selectedOrg, persona, subjectReference: subjectReference.trim(), subjectEmail: subjectEmail.trim() || undefined, claims: template.claims, allowedDocumentTypes: template.documents, callbackUrl: callbackUrl.trim() || undefined, expiresInHours: 24 });
    setRequests(VeriFlowStore.getVerificationRequests());
    setCreatedRequest(request);
  };

  const createOrganization = () => {
    const name = newOrgName.trim();
    if (!name) return;
    const organization = VeriFlowStore.createOrganization(name, newOrgWebhook.trim() || undefined);
    setOrganizations(VeriFlowStore.getOrganizations());
    setSelectedOrg(organization);
    setCallbackUrl(organization.webhookUrl || '');
    setNewOrgName('');
    setNewOrgWebhook('');
    setShowOrgForm(false);
  };

  return <div className="max-w-7xl mx-auto space-y-7 animate-fade-in">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-5 border-b border-slate-800">
      <div><div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider"><ShieldCheck className="w-4 h-4" /> Privacy-first verification</div><h2 className="text-3xl font-black text-white mt-2">Developer Verification Workspace</h2><p className="text-sm text-slate-400 mt-2 max-w-2xl">Create a claim request, send a secure upload link to a person, and receive only the signed result. VeriFlow never returns the raw document.</p></div>
      <div className="flex items-center gap-2"><label className="sr-only" htmlFor="organization-select">Organization</label><select id="organization-select" value={selectedOrg?.id || ''} onChange={e => { const org = organizations.find(item => item.id === e.target.value); if (org) { setSelectedOrg(org); setCallbackUrl(org.webhookUrl || ''); } }} className="max-w-[210px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"><option disabled value="">Select organization</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><button onClick={() => setShowOrgForm(true)} className="px-3 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-black"><Plus className="w-3.5 h-3.5 inline mr-1" />Add organization</button></div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <section className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div><h3 className="text-base font-bold text-white">1. Choose your use case</h3><p className="text-xs text-slate-500 mt-1">We’ll show the claims and documents that fit your workflow.</p></div>
        <div className="grid grid-cols-2 gap-2">{PERSONAS.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setPersona(item.id); setTemplateIndex(0); }} className={`p-3 rounded-xl border text-left ${persona === item.id ? 'border-teal-500/50 bg-teal-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}><Icon className="w-4 h-4 text-teal-400 mb-2" /><div className="text-xs font-bold">{item.label}</div><div className="text-[11px] mt-1 opacity-70">{item.description}</div></button>; })}</div>
        <div><label className="block text-xs font-bold text-slate-400 mb-2">2. Start from a template</label><div className="space-y-2">{TEMPLATES[persona].map((item, index) => <button key={item.label} onClick={() => setTemplateIndex(index)} className={`w-full p-3 rounded-xl border text-left flex items-center justify-between ${templateIndex === index ? 'border-teal-500/50 bg-slate-800 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'}`}><span><span className="block text-xs font-bold">{item.label}</span><span className="block text-[11px] opacity-70 mt-1">{item.description}</span></span><ChevronRight className="w-4 h-4 text-teal-400" /></button>)}</div></div>
        <div><label className="block text-xs font-bold text-slate-400 mb-2">3. Identify the person</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input value={subjectReference} onChange={e => setSubjectReference(e.target.value)} placeholder="Candidate or customer reference" className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" /><input value={subjectEmail} onChange={e => setSubjectEmail(e.target.value)} placeholder="Email (optional)" type="email" className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" /></div></div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"><div className="font-bold text-slate-300">Requested claims</div><div className="flex flex-wrap gap-2 mt-2">{template.claims.map(claim => <span key={claim} className="px-2 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono">{claim}</span>)}</div><div className="font-bold text-slate-300 mt-3">Accepted documents</div><div className="flex flex-wrap gap-1 mt-1">{template.documents.map(document => <span key={document} className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300">{document.replaceAll('_', ' ')}</span>)}</div><p className="text-[10px] text-slate-600 mt-2">The subject may submit any one of these document types. Only sanitized claim results are returned.</p></div>
        <input value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)} placeholder="Webhook URL (optional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200" />
        <button onClick={createRequest} disabled={!subjectReference.trim()} className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-black text-sm disabled:opacity-50"><Send className="w-4 h-4 inline mr-2" />Create secure verification request</button>
        {createdRequest && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10"><div className="text-xs font-bold text-emerald-300">Request created — send this link to the candidate</div><div className="flex gap-2 mt-3"><input readOnly value={createdRequest.verificationUrl} className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 text-[11px] text-slate-300" /><button onClick={() => copy(createdRequest.verificationUrl, 'link')} className="px-3 rounded-lg bg-slate-800 text-teal-300 text-xs">{copied === 'link' ? 'Copied' : <Copy className="w-4 h-4" />}</button></div></div>}
      </section>

      <aside className="xl:col-span-5 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-teal-400" />Request activity</h3>{requests.length === 0 ? <p className="text-xs text-slate-500">Your verification requests will appear here.</p> : requests.slice(0, 6).map(request => <div key={request.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800"><div className="flex justify-between gap-3"><span className="text-xs font-bold text-slate-200">{request.subjectReference}</span><span className="text-[10px] text-teal-300">{statusLabel[request.status]}</span></div><div className="text-[11px] text-slate-500 mt-1">{request.claims.join(', ')}</div>{request.claimResults?.map(result => <div key={result.claim} className="flex items-center justify-between mt-2 text-[10px]"><span className="font-mono text-slate-400">{result.claim}</span><span className={result.status === 'VERIFIED' ? 'text-emerald-400' : result.status === 'DENIED' ? 'text-rose-400' : 'text-amber-400'}>{result.status}</span></div>)}<div className="text-[10px] text-slate-600 mt-2">Expires {new Date(request.expiresAt).toLocaleString()}</div></div>)}</div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Key className="w-4 h-4 text-purple-400" />API key</h3><p className="text-xs text-slate-500">Use this key from your server. Never expose it in browser code.</p><div className="flex gap-2"><code className="min-w-0 flex-1 truncate bg-slate-950 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300">{selectedOrg?.apiKey}</code><button onClick={() => copy(selectedOrg?.apiKey || '', 'key')} className="px-3 rounded-lg bg-slate-800 text-teal-300 text-xs">{copied === 'key' ? 'Copied' : <Copy className="w-4 h-4" />}</button></div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"><h3 className="text-sm font-bold text-white">Interactive API Request Builder</h3><p className="text-xs text-slate-500">The snippet updates from the request form on the left.</p><div className="flex gap-1">{(['curl','typescript','python'] as const).map(language => <button key={language} onClick={() => setSdkLanguage(language)} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${sdkLanguage === language ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400'}`}>{language}</button>)}</div><pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] leading-5 text-teal-300 overflow-x-auto max-h-72">{sdkSnippet}</pre><button onClick={() => copy(sdkSnippet, 'sdk')} className="text-xs text-teal-300 font-bold">{copied === 'sdk' ? 'Copied!' : `Copy ${sdkLanguage} snippet`}</button></div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white">Live Webhook Console</h3><button onClick={() => setWebhookEvents(previous => [`${new Date().toLocaleTimeString()} verification.completed · 200 OK`, ...previous])} className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300">Simulate event</button></div><div className="min-h-24 bg-black/50 border border-slate-800 rounded-xl p-3 font-mono text-[10px] text-emerald-400">{webhookEvents.length ? webhookEvents.map(event => <div key={event}>{event}</div>) : <span className="text-slate-600">Waiting for verification.completed events…</span>}</div></div>
      </aside>
    </div>

    {showOrgForm && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="new-organization-title">
        <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-800 shrink-0"><div><div className="text-[10px] uppercase tracking-widest font-black text-teal-300">Organization onboarding</div><h3 id="new-organization-title" className="text-xl font-black text-white mt-1">Add your organization</h3><p className="text-xs text-slate-500 mt-1">Create a dedicated workspace and API key. You are not limited to the demo organizations.</p></div><button onClick={() => setShowOrgForm(false)} aria-label="Close organization form" className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800"><X className="w-4 h-4" /></button></div>
          <div className="p-5 space-y-4 overflow-y-auto">
            <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-300">Organization name *</span><input autoFocus value={newOrgName} onChange={event => setNewOrgName(event.target.value)} placeholder="Example Technologies Ltd" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white" /></label>
            <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-300">Default webhook URL <span className="text-slate-600">(optional)</span></span><input value={newOrgWebhook} onChange={event => setNewOrgWebhook(event.target.value)} placeholder="https://api.example.com/webhooks/veriflow" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white" /><span className="block text-[10px] text-slate-600">Used as the default callback for new requests. You can override it per request.</span></label>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-200/80"><strong>Demo storage notice:</strong> this organization and its generated key are stored in this browser. Production onboarding should authenticate organization administrators and store hashed API credentials on the server.</div>
            <div className="flex justify-end gap-2 pt-1"><button onClick={() => setShowOrgForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300">Cancel</button><button onClick={createOrganization} disabled={!newOrgName.trim()} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-xs font-black text-slate-950 disabled:opacity-40"><Plus className="w-3.5 h-3.5 inline mr-1" />Create organization</button></div>
          </div>
        </div>
      </div>,
      document.body
    )}
  </div>;
};
