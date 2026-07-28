import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ArrowRight
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionButton?: {
    label: string;
    tab: 'verify' | 'history' | 'developer';
  };
}

interface AIAssistantProps {
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant') => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ setActiveTab }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello! I am VeriFlow AI Assistant. I can route natural language requests to our TEE Confidential Compute enclave verification engine. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');

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

    // Parse natural language intent
    const lower = textToSend.toLowerCase();
    let replyText = '';
    let actionButton: Message['actionButton'];

    if (lower.includes('age') || lower.includes('18') || lower.includes('passport')) {
      replyText = 'I have identified an Age 18+ Verification request. Our Golden Path confidential compute pipeline will encrypt your passport client-side and evaluate date_of_birth inside the TEE enclave memory.';
      actionButton = { label: 'Execute Age 18+ Verification', tab: 'verify' };
    } else if (lower.includes('income') || lower.includes('payslip') || lower.includes('bank') || lower.includes('salary')) {
      replyText = 'I have identified an Income Verification request. The enclave will extract net/gross figures inside RAM and output a signed boolean confirming if threshold requirements are met.';
      actionButton = { label: 'Execute Income Verification', tab: 'verify' };
    } else if (lower.includes('degree') || lower.includes('university') || lower.includes('education')) {
      replyText = 'I have identified a Degree Credential verification request. Would you like to launch confidential degree evaluation?';
      actionButton = { label: 'Execute Degree Verification', tab: 'verify' };
    } else if (lower.includes('api') || lower.includes('key') || lower.includes('developer')) {
      replyText = 'You can issue API keys for third-party developer integrations in the Developer API Portal.';
      actionButton = { label: 'Open Developer API Portal', tab: 'developer' };
    } else if (lower.includes('history') || lower.includes('report') || lower.includes('past')) {
      replyText = 'Here are your past signed verifications and attestation audit trails.';
      actionButton = { label: 'View Verification History', tab: 'history' };
    } else {
      replyText = 'I can help you verify your age (18+), income threshold, degree credentials, or employment status confidentially. What fact would you like to verify?';
    }

    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        actionButton
      };
      setMessages(prev => [...prev, assistantMsg]);
    }, 600);
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
              NATURAL LANGUAGE ROUTER
            </span>
          </h2>
          <p className="text-xs text-slate-400">Route verification requests naturally ("Verify my age from passport", "Verify my income")</p>
        </div>
      </div>

      {/* Preset Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {[
          'Verify my age (18+)',
          'Verify my income from payslip',
          'Verify my degree certificate',
          'Show developer API keys',
          'View verification history'
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[460px] flex flex-col justify-between shadow-2xl">
        
        {/* Messages Scroll Area */}
        <div className="overflow-y-auto space-y-4 pr-2 flex-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed space-y-2 ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-semibold'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                <p>{m.text}</p>
                {m.actionButton && (
                  <button
                    onClick={() => setActiveTab(m.actionButton!.tab)}
                    className="w-full mt-2 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    <span>{m.actionButton.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="pt-4 border-t border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type your verification prompt e.g., 'Verify my age above 18'..."
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
