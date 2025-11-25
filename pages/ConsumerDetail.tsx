import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Consumer, FollowUpHistory, ConsumerStatus, DEFAULT_SETTINGS } from '../types';
import { Phone, MessageSquare, Send, ChevronLeft, Save, History, CheckCircle } from 'lucide-react';

const ConsumerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [history, setHistory] = useState<FollowUpHistory[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Action State
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState('');
  
  // Notification State
  const [showToast, setShowToast] = useState(false);

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
    }
    setHistory(h);
    setSettings(s);
    setLoading(false);
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
    // Reload data to reflect changes
    await loadData(consumer.consumerNo);
    
    // Show Toast Notification
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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
    // Use whatsapp:// scheme to trigger the app directly instead of the browser
    const url = `whatsapp://send?phone=91${consumer.mobile}&text=${encodeURIComponent(msg)}`;
    window.location.href = url;
  };

  const openSMS = () => {
    if (!consumer || !consumer.mobile) return;
    const msg = getTemplateMessage(settings.smsTemplate);
    // Mobile only usually
    window.open(`sms:${consumer.mobile}?body=${encodeURIComponent(msg)}`, '_self');
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!consumer) return <div className="p-10 text-center">Consumer not found.</div>;

  const hasMobile = !!consumer.mobile;

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <header className="bg-blue-700 text-white shadow-md p-4 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-blue-600 rounded">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
           <h1 className="font-bold leading-tight">{consumer.name}</h1>
           <p className="text-xs text-blue-100">#{consumer.consumerNo}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
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
             <History className="w-4 h-4" /> History
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
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="font-medium text-sm">Follow-up Updated!</span>
        </div>
      )}
    </div>
  );
};

export default ConsumerDetail;