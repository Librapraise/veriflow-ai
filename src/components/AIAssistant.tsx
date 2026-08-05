import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { VeriFlowStore } from '../lib/apiStore';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionButton?: {
    label: string;
    tab: 'verify' | 'verifier' | 'history' | 'developer';
  };
}

interface AIAssistantProps {
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'verifier' | 'history' | 'developer' | 'assistant') => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ setActiveTab }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello! I am VeriFlow AI Assistant. I can answer questions about confidential compute, evaluate document verifications, check system status, or route you to specialized workflows. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    if (!userText) setInput('');
    setIsThinking(true);

    // Parse natural language intent with live store state
    const lower = textToSend.toLowerCase();
    let replyText = '';
    let actionButton: Message['actionButton'];

    const verificationsCount = VeriFlowStore.getVerifications().length;
    const documentsCount = VeriFlowStore.getDocuments().length;
    const orgsCount = VeriFlowStore.getOrganizations().length;

    if (lower.includes('status') || lower.includes('count') || lower.includes('documents') || lower.includes('summary')) {
      replyText = `📊 **Current Session Summary**:\n• Encrypted Documents: ${documentsCount}\n• Attested Verifications: ${verificationsCount}\n• Registered API Orgs: ${orgsCount}\n\nAll documents are encrypted with AES-256-GCM before storage. Zero raw document data ever reaches public storage or the blockchain.`;
      actionButton = { label: 'View Dashboard & Reports', tab: 'history' };
    } else if (lower.includes('age') || lower.includes('18') || lower.includes('passport')) {
      replyText = '🛡️ **Age 18+ Golden Path**: Our TEE pipeline parses ICAO 9303 TD3 MRZ text client-side or inside Flare Confidential Compute RAM. DOB is evaluated against threshold date (today - 18y). Only a signed boolean verdict is emitted.';
      actionButton = { label: 'Execute Age 18+ Verification', tab: 'verify' };
    } else if (lower.includes('income') || lower.includes('payslip') || lower.includes('bank') || lower.includes('salary')) {
      replyText = '💰 **Income Threshold Verification**: The enclave extracts net salary figures inside RAM and checks if income >= $50,000/yr without revealing exact salary numbers to the requester.';
      actionButton = { label: 'Execute Income Verification', tab: 'verify' };
    } else if (lower.includes('degree') || lower.includes('university') || lower.includes('education')) {
      replyText = '🎓 **Degree Credential Verification**: Evaluates accredited degree certificates inside RAM and signs an EIP-191 proof verifying completion of specified degree programs.';
      actionButton = { label: 'Execute Degree Verification', tab: 'verify' };
    } else if (lower.includes('public verifier') || lower.includes('check proof') || lower.includes('verify proof') || lower.includes('tamper')) {
      replyText = '🔍 **Public Verifier Tool**: Recompute EIP-191 digest (`abi.encodePacked` 165 bytes), recover ECDSA `secp256k1` signer, and verify on-chain registration on Flare Coston2 Testnet (`VeriFlowRegistryV2`).';
      actionButton = { label: 'Open Public Verifier', tab: 'verifier' };
    } else if (lower.includes('api') || lower.includes('key') || lower.includes('developer') || lower.includes('curl')) {
      replyText = '🔑 **Developer API Portal**: Issue API keys (`vf_live_...`), test cURL endpoints (`/v1/tee/execute`, `/v1/verify-age`), and inspect rate limit telemetry.';
      actionButton = { label: 'Open Developer API Portal', tab: 'developer' };
    } else if (lower.includes('history') || lower.includes('report') || lower.includes('past')) {
      replyText = `📜 You have ${verificationsCount} saved verification report(s). Click below to view audit logs, copy EIP-191 signatures, or inspect QR codes.`;
      actionButton = { label: 'View Verification History', tab: 'history' };
    } else {
      replyText = 'VeriFlow AI combines Client-Side AES-256-GCM Encryption, Flare TEE Enclave Execution, and On-Chain Flare Registry Anchoring to deliver zero-knowledge proof of facts without disclosing underlying identity data. What fact would you like to verify?';
    }

    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        actionButton
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Bot className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            VeriFlow AI Conversational Assistant
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
              INTELLIGENT TEE ROUTER
            </span>
          </h2>
          <p className="text-xs text-slate-400">Natural language routing for confidential compute verifications, API portal, & public verifier</p>
        </div>
      </div>

      {/* Preset Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {[
          'Verify my age (18+)',
          'Verify my income from payslip',
          'Check system status',
          'Open Public Verifier',
          'Show developer API keys',
          'View verification history'
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[480px] flex flex-col justify-between shadow-2xl">
        
        {/* Messages Scroll Area */}
        <div className="overflow-y-auto space-y-4 pr-2 flex-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed space-y-2.5 ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-semibold shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 shadow-sm'
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>
                {m.actionButton && (
                  <button
                    onClick={() => setActiveTab(m.actionButton!.tab)}
                    className="w-full mt-2 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
                  >
                    <span>{m.actionButton.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex items-center space-x-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 rounded-2xl w-fit">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>VeriFlow AI is evaluating enclave rules…</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="pt-4 border-t border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask anything or request verification e.g. 'Verify my age above 18'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={() => handleSend()}
            className="p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-500 transition-all shadow-md"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </div>

    </div>
  );
};
