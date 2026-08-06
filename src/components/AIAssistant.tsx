import React, { useEffect, useState } from 'react';
import { ArrowRight, Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { VeriFlowStore } from '../lib/apiStore';
import type { VerificationRequest } from '../types/veriflow';

type AppTab = 'landing' | 'dashboard' | 'verify' | 'verifier' | 'history' | 'developer' | 'assistant';
interface Message { id: string; sender: 'user' | 'assistant'; text: string; actionButton?: { label: string; tab: AppTab } }

interface AIAssistantProps { setActiveTab: (tab: AppTab) => void }

export const AIAssistant: React.FC<AIAssistantProps> = ({ setActiveTab }) => {
  const welcomeMessage: Message = { id: 'welcome', sender: 'assistant', text: 'Hi! I can help you choose a verification workflow, create a candidate request, understand a result, or integrate VeriFlow into an HR, fintech, Web3, or marketplace product. Try asking “How do I verify a candidate’s degree?”' };
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [welcomeMessage];
    try {
      const saved = window.localStorage.getItem('veriflow_ai_chat_history');
      const parsed = saved ? JSON.parse(saved) as Message[] : [];
      return parsed.length > 0 ? parsed : [welcomeMessage];
    } catch {
      return [welcomeMessage];
    }
  });
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('veriflow_ai_chat_history', JSON.stringify(messages));
    } catch {
      // Chat history is a convenience; the assistant remains usable if storage is unavailable.
    }
  }, [messages]);

  const clearChat = () => {
    setMessages([welcomeMessage]);
    window.localStorage.removeItem('veriflow_ai_chat_history');
  };

  const handleSend = (preset?: string) => {
    const question = (preset || input).trim();
    if (!question || isThinking) return;
    setInput('');
    setMessages(previous => [...previous, { id: `user_${Date.now()}`, sender: 'user', text: question }]);
    setIsThinking(true);

    const lower = question.toLowerCase();
    const requests: VerificationRequest[] = VeriFlowStore.getVerificationRequests();
    const openRequests = requests.filter(request => ['awaiting_subject', 'processing'].includes(request.status)).length;
    const verificationCount = VeriFlowStore.getVerifications().length;
    const documentCount = VeriFlowStore.getDocuments().length;
    let text = '';
    let actionButton: Message['actionButton'];

    if (lower.includes('candidate') || lower.includes('recruit') || lower.includes('hr') || lower.includes('employee')) {
      text = 'For HR, create a verification request instead of collecting documents yourself. Choose Degree verification, Current employment, or Employment package. VeriFlow generates a secure candidate link; the candidate uploads privately and your system receives only signed claim results.';
      actionButton = { label: 'Create HR Verification Request', tab: 'developer' };
    } else if (lower.includes('request') || lower.includes('candidate link') || lower.includes('secure link')) {
      text = `You have ${requests.length} request(s), with ${openRequests} waiting for a subject or processing. In the Developer Portal, choose a persona and template, enter a subject reference, and create a secure link.`;
      actionButton = { label: 'Open Request Builder', tab: 'developer' };
    } else if (lower.includes('webhook') || lower.includes('callback')) {
      text = 'Webhooks let your backend receive a verification.completed event without polling. Configure a callback URL on the request, verify the webhook signature, and correlate the result using request_id. Raw documents are never included.';
      actionButton = { label: 'Configure Webhook', tab: 'developer' };
    } else if (lower.includes('privacy') || lower.includes('store') || lower.includes('raw document')) {
      text = 'The subject uploads into the encrypted processing flow. VeriFlow extracts only fields required by the claim, evaluates the rule, wipes plaintext after processing, and returns a signed result. Store the claim result and proof—not the source document.';
    } else if (lower.includes('status') || lower.includes('summary') || lower.includes('count')) {
      text = `Workspace summary:\n• Encrypted documents: ${documentCount}\n• Signed verifications: ${verificationCount}\n• Verification requests: ${requests.length}\n• Requests needing a subject: ${openRequests}\n\nRaw documents are not returned to API consumers.`;
      actionButton = { label: 'View Reports', tab: 'history' };
    } else if (lower.includes('age') || lower.includes('18') || lower.includes('passport')) {
      text = 'Age verification accepts passports and driver’s licenses. The MRZ or document text is parsed, the date of birth is compared with the requested threshold, and only the signed verdict is returned.';
      actionButton = { label: 'Open Age Verification', tab: 'verify' };
    } else if (lower.includes('income') || lower.includes('payslip') || lower.includes('bank') || lower.includes('salary')) {
      text = 'Income verification accepts payslips and bank statements. VeriFlow detects the document currency, evaluates the threshold correctly, and returns the claim result without exposing the source document.';
      actionButton = { label: 'Open Income Verification', tab: 'verify' };
    } else if (lower.includes('degree') || lower.includes('university') || lower.includes('education')) {
      text = 'Degree verification requires both a recognizable degree title and institution. Scanned certificates use OCR; ambiguous extraction returns UNVERIFIABLE instead of being marked verified.';
      actionButton = { label: 'Open Degree Verification', tab: 'verify' };
    } else if (lower.includes('proof') || lower.includes('tamper') || lower.includes('public verifier')) {
      text = 'The Public Verifier recomputes the proof digest, recovers the ECDSA signer, validates the registered TEE identity and code measurement, and checks the Flare Coston2 registry. It never needs the original document.';
      actionButton = { label: 'Open Public Verifier', tab: 'verifier' };
    } else if (lower.includes('api') || lower.includes('key') || lower.includes('developer') || lower.includes('curl')) {
      text = 'The Developer Portal is organized around verification requests. The server endpoint is POST /v1/verification-requests with subject_reference, claims, accepted document types, expiration, and an optional webhook.';
      actionButton = { label: 'Open Developer Portal', tab: 'developer' };
    } else if (lower.includes('history') || lower.includes('report')) {
      text = `You have ${verificationCount} saved verification report(s). History shows statuses, signatures, proof links, and revocation state.`;
      actionButton = { label: 'View Verification History', tab: 'history' };
    } else {
      text = 'I can help you choose a claim, create a candidate request, explain a result, or integrate a signed result into your backend. What are you building—HR, fintech, Web3, or a marketplace?';
    }

    window.setTimeout(() => { setMessages(previous => [...previous, { id: `assistant_${Date.now()}`, sender: 'assistant', text, actionButton }]); setIsThinking(false); }, 350);
  };

  const prompts = ['How do I verify a candidate’s degree?', 'Create a secure HR request', 'How do webhooks work?', 'What happens to raw documents?', 'Check request status', 'View verification history'];

  return <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
    <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800"><div className="flex items-center space-x-3"><div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20"><Bot className="w-7 h-7" /></div><div><h2 className="text-xl font-extrabold text-white">VeriFlow AI Conversational Assistant</h2><p className="text-xs text-slate-400">Workflow guidance for private document verification and signed claims</p></div></div><button onClick={clearChat} className="text-xs text-slate-500 hover:text-slate-200 transition-colors">Clear chat</button></div>
    <div className="flex flex-wrap gap-2">{prompts.map(prompt => <button key={prompt} onClick={() => handleSend(prompt)} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-purple-400" />{prompt}</button>)}</div>
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[480px] flex flex-col justify-between shadow-2xl"><div className="overflow-y-auto space-y-4 pr-2 flex-1">{messages.map(message => <div key={message.id} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}><div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${message.sender === 'user' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-semibold' : 'bg-slate-950 border border-slate-800 text-slate-200'}`}>{message.text}{message.actionButton && <button onClick={() => setActiveTab(message.actionButton!.tab)} className="w-full mt-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold flex items-center justify-center gap-1.5"><span>{message.actionButton.label}</span><ArrowRight className="w-3.5 h-3.5" /></button>}</div></div>)}{isThinking && <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 rounded-2xl w-fit"><Loader2 className="w-4 h-4 animate-spin" />Thinking through your workflow…</div>}</div><div className="pt-4 border-t border-slate-800 flex items-center gap-2"><input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleSend(); }} placeholder="Ask how to verify a claim…" className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50" /><button onClick={() => handleSend()} disabled={isThinking} className="p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 disabled:opacity-50"><Send className="w-4 h-4" /></button></div></div>
  </div>;
};
