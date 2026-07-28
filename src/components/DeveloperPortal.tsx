import React, { useState } from 'react';
import { 
  Key, 
  Terminal, 
  Copy, 
  Plus, 
  Send, 
  Code2, 
  Activity, 
  RefreshCw
} from 'lucide-react';
import type { Organization, ApiLog, ClaimType } from '../types/veriflow';
import { VeriFlowStore } from '../lib/apiStore';

export const DeveloperPortal: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>(VeriFlowStore.getOrganizations());
  const [apiLogs, setApiLogs] = useState<ApiLog[]>(VeriFlowStore.getApiLogs());
  const [selectedOrg, setSelectedOrg] = useState<Organization>(organizations[0]);
  
  // API Playground State
  const [endpoint, setEndpoint] = useState<string>('/v1/verify-age');
  const [claimType, setClaimType] = useState<ClaimType>('age_above_18');
  const [walletAddress] = useState<string>('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  const [threshold, setThreshold] = useState<number>(18);
  
  const [isExecutingApi, setIsExecutingApi] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [newOrgName, setNewOrgName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const handleCreateOrg = () => {
    if (!newOrgName.trim()) return;
    const newOrg = VeriFlowStore.createOrganization(newOrgName);
    setOrganizations(VeriFlowStore.getOrganizations());
    setSelectedOrg(newOrg);
    setNewOrgName('');
    setShowCreateModal(false);
  };

  const handleTestApiCall = async () => {
    setIsExecutingApi(true);
    setApiResponse(null);
    try {
      const res = await VeriFlowStore.processDeveloperApiRequest({
        apiKey: selectedOrg.apiKey,
        endpoint,
        claimType,
        walletAddress,
        threshold
      });
      setApiResponse(res.data);
      setApiLogs(VeriFlowStore.getApiLogs());
    } catch (e: any) {
      setApiResponse({ error: e.message || 'API call failed' });
    } finally {
      setIsExecutingApi(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const curlSnippet = `curl -X POST "${window.location.origin}${endpoint}" \\
  -H "Authorization: Bearer ${selectedOrg?.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "wallet_address": "${walletAddress}",
    "threshold": ${threshold}
  }'`;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-teal-400" />
            Developer Verification API Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Drop-in REST API for fintech, Web3 DAOs, and HR platforms to verify claims without storing raw documents.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs transition-all shadow-lg flex items-center space-x-2"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New API Key</span>
        </button>
      </div>

      {/* Grid Layout: API Key Management + Interactive Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: API Keys & Organizations */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-400" />
              Active API Keys & Organizations
            </h3>

            <div className="space-y-3">
              {organizations.map((org) => {
                const isSelected = selectedOrg.id === org.id;
                return (
                  <div
                    key={org.id}
                    onClick={() => setSelectedOrg(org)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/40 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{org.name}</span>
                      <span className="text-[10px] font-mono text-teal-400">{org.requestsCount} requests</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
                      <span className="truncate max-w-[200px]">{org.apiKey}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(org.apiKey, org.id);
                        }}
                        className="text-teal-400 hover:text-teal-300 text-[10px] font-bold"
                      >
                        {copiedText === org.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Endpoint Documentation Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              Supported Developer Endpoints
            </h3>

            <div className="space-y-2 text-xs font-mono">
              {[
                { method: 'POST', path: '/v1/verify-age', desc: 'Age threshold check' },
                { method: 'POST', path: '/v1/verify-income', desc: 'Income threshold check' },
                { method: 'POST', path: '/v1/verify-degree', desc: 'Degree credential check' },
                { method: 'POST', path: '/v1/verify-employment', desc: 'Employment tenure check' },
                { method: 'GET', path: '/verifications/{id}', desc: 'Fetch signed report' },
                { method: 'POST', path: '/verifications/{id}/revoke', desc: 'Revoke issued claim' }
              ].map((ep, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-500/20 text-teal-300">
                      {ep.method}
                    </span>
                    <span className="text-slate-200">{ep.path}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Interactive API Tester & cURL Snippet */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                Live API Playground & Executor
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">Org: {selectedOrg?.name}</span>
            </div>

            {/* Form Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Target Endpoint</label>
                <select
                  value={endpoint}
                  onChange={(e) => {
                    setEndpoint(e.target.value);
                    if (e.target.value.includes('age')) setClaimType('age_above_18');
                    if (e.target.value.includes('income')) setClaimType('income_above_threshold');
                    if (e.target.value.includes('degree')) setClaimType('degree_verified');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                >
                  <option value="/v1/verify-age">POST /v1/verify-age</option>
                  <option value="/v1/verify-income">POST /v1/verify-income</option>
                  <option value="/v1/verify-degree">POST /v1/verify-degree</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Threshold / Parameter</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                />
              </div>
            </div>

            {/* cURL Snippet Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>cURL Request Command</span>
                <button
                  onClick={() => copyToClipboard(curlSnippet, 'curl')}
                  className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-bold text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  {copiedText === 'curl' ? 'Copied!' : 'Copy cURL'}
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-teal-300 overflow-x-auto">
                {curlSnippet}
              </pre>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleTestApiCall}
              disabled={isExecutingApi}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              {isExecutingApi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing TEE API Call...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send API Request Live</span>
                </>
              )}
            </button>

            {/* Response Viewer */}
            {apiResponse && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">HTTP Response (200 OK)</span>
                  <span className="text-emerald-400 font-mono text-[11px]">TEE Signed</span>
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 font-mono text-xs text-emerald-400 overflow-x-auto max-h-64">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}

          </div>

          {/* API Execution Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                Live API Logs
              </h3>
              <span className="text-[11px] font-mono text-slate-400">{apiLogs.length} events</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {apiLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                      {log.statusCode}
                    </span>
                    <span className="text-slate-200">{log.endpoint}</span>
                    <span className="text-slate-500 text-[10px]">({log.organizationName})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* New API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Issue New Developer API Key</h3>
            
            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1">Organization / App Name</label>
              <input
                type="text"
                placeholder="e.g. Uber Identity Service"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrg}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
              >
                Issue Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
