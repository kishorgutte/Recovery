
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Consumer, FollowUpHistory, ConsumerStatus, DEFAULT_SETTINGS, BillHistory } from '../types';
import { Phone, MessageSquare, Send, ChevronLeft, Save, History, CheckCircle, Copy, FileText, Zap, Calendar, CreditCard, Loader2, WifiOff, AlertTriangle } from 'lucide-react';

const ConsumerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Data State
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [history, setHistory] = useState<FollowUpHistory[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  // API State for Bill History
  const [billHistory, setBillHistory] = useState<BillHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  // Action State
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState('');
  
  // Notification State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (consumerNo: string) => {
    setLoading(true);
    const [c, h, s] = await Promise.all([
      db.getConsumer(consumerNo),
      db.getHistoryForConsumer(consumerNo),
      db.getSettings()
    ]);
    
    if (c) {
      setConsumer(c);
      setNewStatus(c.status);
      setFollowUpDate(c.nextFollowUpDate || '');
      // Trigger API fetch for history
      fetchBillHistory(consumerNo);
    }
    setHistory(h);
    setSettings(s);
    setLoading(false);
  };

  const fetchBillHistory = async (consumerNo: string) => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      // Use AllOrigins proxy which wraps the response in JSON, avoiding direct CORS/403 issues often seen with direct piping
      const targetUrl = `https://mobileapp.mahadiscom.in/empapp/GetBillHistory?consumerno=${consumerNo}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&disableCache=${new Date().getTime()}`;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Proxy Error: ${response.status}`);
      }
      
      const wrapperData = await response.json();

      // Check for upstream HTTP errors
      if (wrapperData.status?.http_code && wrapperData.status.http_code >= 400) {
         throw new Error(`API Error: ${wrapperData.status.http_code}`);
      }
      
      if (!wrapperData.contents) {
        throw new Error("Empty response received.");
      }

      // AllOrigins returns the actual body as a string in 'contents'
      let data;
      try {
        data = JSON.parse(wrapperData.contents);
      } catch (parseErr) {
        console.error("JSON Parse Error:", parseErr, wrapperData.contents);
        throw new Error("Invalid data format received.");
      }
      
      if (Array.isArray(data)) {
        setBillHistory(data);
      } else {
        // Fallback if the API returns a single object instead of an array
        setBillHistory(data ? [data] : []);
      }
    } catch (err: any) {
      console.error("Failed to fetch bill history:", err);
      setHistoryError(err.message || "Unable to retrieve bill history.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!consumer) return;

    // 1. Update Consumer
    const updatedConsumer: Consumer = {
      ...consumer,
      status: newStatus as ConsumerStatus,
      // Only save nextFollowUpDate if status is 'Call later'
      nextFollowUpDate: newStatus === ConsumerStatus.CALL_LATER ? followUpDate : undefined,
      updatedAt: new Date().toISOString()
    };
    await db.updateConsumer(updatedConsumer);

    // 2. Add History
    if (note || newStatus !== consumer.status) {
      await db.addHistory({
        consumerNo: consumer.consumerNo,
        note: note || "Status updated",
        status: newStatus as ConsumerStatus,
        timestamp: new Date().toISOString()
      });
    }

    setNote('');
    // Reload data to reflect changes (re-fetches DB but we don't need to re-fetch API history necessarily)
    const [c, h] = await Promise.all([
        db.getConsumer(consumer.consumerNo),
        db.getHistoryForConsumer(consumer.consumerNo)
    ]);
    if(c) setConsumer(c);
    setHistory(h);
    
    // Show Toast Notification
    setToastMessage('Follow-up Updated!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage('Copied to clipboard!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const getTemplateMessage = (template: string) => {
    if (!consumer) return "";
    return template
      .replace('{name}', consumer.name)
      .replace('{amount}', consumer.totalDue.toString())
      .replace('{consumerNo}', consumer.consumerNo);
  };

  const openWhatsApp = () => {
    if (!consumer || !consumer.mobile) return;
    const msg = getTemplateMessage(settings.whatsappTemplate);
    const url = `whatsapp://send?phone=91${consumer.mobile}&text=${encodeURIComponent(msg)}`;
    window.location.href = url;
  };

  const openSMS = () => {
    if (!consumer || !consumer.mobile) return;
    const msg = getTemplateMessage(settings.smsTemplate);
    window.open(`sms:${consumer.mobile}?body=${encodeURIComponent(msg)}`, '_self');
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
  if (!consumer) return <div className="p-10 text-center text-red-500">Consumer not found in local database.</div>;

  const hasMobile = !!consumer.mobile;

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-30">
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-blue-600 rounded">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold leading-tight">{consumer.name}</h1>
            <p 
              className="text-sm font-medium text-blue-100 flex items-center gap-2 cursor-pointer hover:text-white mt-0.5"
              onClick={() => handleCopy(consumer.consumerNo)}
            >
              #{consumer.consumerNo}
              <Copy className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pt-2 gap-2 bg-blue-800/30">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 pb-3 text-sm font-semibold border-b-4 transition-colors ${activeTab === 'overview' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 pb-3 text-sm font-semibold border-b-4 transition-colors ${activeTab === 'history' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}
          >
            Paid History
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Key Info Card */}
            <div className="bg-white p-4 shadow-sm border-b border-slate-100">
              <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Total Due</p>
                    <p className="text-3xl font-bold text-red-600">₹{consumer.totalDue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Ageing</p>
                    <p className="text-xl font-semibold text-slate-800">{consumer.ageInDays} Days</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="block text-xs text-slate-400">Due Date</span>
                  <span className="font-medium">{consumer.billDueDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Last Receipt</span>
                  <span className="font-medium">{consumer.lastReceiptDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Meter No</span>
                  <span className="font-medium">{consumer.meterNumber}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Mobile</span>
                  <span className="font-medium">{consumer.mobile || 'N/A'}</span>
                </div>
              </div>
              
              <div className="mt-3 bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-sm">
                  <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Address</span>
                  <p className="text-base text-slate-900 leading-relaxed font-medium">{consumer.address}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 p-4">
              {hasMobile ? (
                <a 
                  href={`tel:${consumer.mobile}`}
                  className="flex flex-col items-center justify-center bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl active:bg-green-100"
                >
                  <Phone className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Call</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 p-3 rounded-xl cursor-not-allowed opacity-60">
                    <Phone className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">No Mobile</span>
                </div>
              )}

              <button 
                onClick={openSMS}
                disabled={!hasMobile}
                className={`flex flex-col items-center justify-center border p-3 rounded-xl transition-colors ${hasMobile ? 'bg-blue-50 border-blue-200 text-blue-700 active:bg-blue-100' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`}
              >
                <MessageSquare className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">SMS</span>
              </button>
              <button 
                onClick={openWhatsApp}
                disabled={!hasMobile}
                className={`flex flex-col items-center justify-center border p-3 rounded-xl transition-colors ${hasMobile ? 'bg-teal-50 border-teal-200 text-teal-700 active:bg-teal-100' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`}
              >
                <Send className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">WhatsApp</span>
              </button>
            </div>

            {/* Update Status Section */}
            <div className="px-4 py-2">
              <h3 className="font-bold text-slate-700 mb-2">Update Follow-up</h3>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select 
                        value={newStatus} 
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"
                    >
                        {Object.values(ConsumerStatus).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Note</label>
                    <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Enter remarks..."
                        className="w-full p-2 mt-1 border border-slate-300 rounded-lg h-20"
                    ></textarea>
                  </div>

                  {newStatus === ConsumerStatus.CALL_LATER && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-xs font-bold text-slate-500 uppercase">Next Follow-up Date</label>
                      <input 
                          type="date" 
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full p-2 mt-1 border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleSaveFollowUp}
                    className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold shadow-lg active:bg-blue-800 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Update
                  </button>
              </div>
            </div>

            {/* History Log */}
            <div className="px-4 py-4">
              <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <History className="w-4 h-4" /> Follow-up Activity
              </h3>
              <div className="space-y-3">
                  {history.length === 0 && <p className="text-slate-400 text-sm italic">No history recorded.</p>}
                  {history.map((h) => (
                    <div key={h.id} className="bg-white p-3 rounded-lg border border-slate-100 text-sm">
                      <div className="flex justify-between mb-1">
                          <span className={`font-bold ${h.status === ConsumerStatus.PAID ? 'text-green-600' : 'text-blue-600'}`}>
                            {h.status}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                      </div>
                      <p className="text-slate-600">{h.note}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* PAID HISTORY TAB */}
        {activeTab === 'history' && (
           <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-[50vh]">
              
              {/* Loading State */}
              {isHistoryLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                   <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                   <p className="text-sm font-medium">Fetching Bill History...</p>
                </div>
              )}

              {/* Error State */}
              {!isHistoryLoading && historyError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                   <div className="bg-red-50 p-4 rounded-full mb-3">
                     <WifiOff className="w-8 h-8 text-red-500" />
                   </div>
                   <h3 className="font-bold text-slate-800 mb-1">Connection Error</h3>
                   <p className="text-slate-500 text-sm px-8">{historyError}</p>
                   <button 
                     onClick={() => fetchBillHistory(consumer.consumerNo)}
                     className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
                   >
                     Retry
                   </button>
                </div>
              )}

              {/* Empty State */}
              {!isHistoryLoading && !historyError && billHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                   <div className="bg-slate-100 p-4 rounded-full mb-3">
                     <AlertTriangle className="w-8 h-8 text-slate-400" />
                   </div>
                   <p className="text-slate-500 font-medium">No payment history found.</p>
                </div>
              )}

              {/* Data List */}
              {!isHistoryLoading && !historyError && billHistory.map((bill, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  
                  {/* Bill Header */}
                  <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{bill.BillMonth}</h3>
                        <p className="text-xs text-slate-500">{bill.BillDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">₹{bill.CurrentBill}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${bill.consumerStatus === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {bill.consumerStatus}
                      </span>
                    </div>
                  </div>

                  {/* Bill Details */}
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs text-slate-400 font-medium uppercase mb-0.5">Consumption</span>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        {bill.Consumption} Units
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 font-medium uppercase mb-0.5">Meter Status</span>
                      <div className="font-semibold text-slate-700">{bill.meterStatus}</div>
                    </div>
                    <div className="col-span-2">
                       <span className="block text-xs text-slate-400 font-medium uppercase mb-0.5">Tariff</span>
                       <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          {bill.tariffDesc}
                       </div>
                    </div>
                  </div>

                  {/* Receipts Section */}
                  <div className="bg-blue-50/50 p-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Receipts
                    </h4>
                    
                    {(!bill.Receipts || bill.Receipts.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No receipts found for this month.</p>
                    ) : (
                      <div className="space-y-2">
                        {bill.Receipts.map((receipt, rIndex) => (
                          <div key={rIndex} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex justify-between items-center">
                             <div>
                               <p className="font-bold text-slate-800 text-sm">₹{receipt.Amount}</p>
                               <p className="text-[10px] text-slate-400">{receipt.receiptMedium}</p>
                             </div>
                             <div className="text-right">
                               <span className="text-xs text-slate-500 font-medium block">{receipt.TransactionDateTime.split(' ')[0]}</span>
                               <span className="text-[10px] text-slate-400">{receipt.TransactionDateTime.split(' ')[1]}</span>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!isHistoryLoading && !historyError && billHistory.length > 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  End of history
                </div>
              )}
           </div>
        )}
        
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ConsumerDetail;
