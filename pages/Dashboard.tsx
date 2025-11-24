import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Consumer, ConsumerStatus, AppSettings, DEFAULT_SETTINGS } from '../types';
import { 
  Users, 
  CheckCircle, 
  Calendar, 
  IndianRupee, 
  Clock, 
  ClipboardList,
  Phone,
  MessageSquare,
  Send
} from 'lucide-react';
import Header from '../components/Header';

const Dashboard: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  
  // Date State
  const [filterType, setFilterType] = useState<'Today' | 'Yesterday' | 'Custom'>('Today');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD in local time
  
  // Data State
  const [stats, setStats] = useState({
    followUpsCount: 0,
    attendedCount: 0,
    paidCount: 0,
    collectedAmount: 0
  });
  const [activityLog, setActivityLog] = useState<Consumer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine date string based on filter type
    const today = new Date();
    let dateStr = '';

    if (filterType === 'Today') {
      dateStr = today.toLocaleDateString('en-CA');
    } else if (filterType === 'Yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      dateStr = yest.toLocaleDateString('en-CA');
    } else {
      dateStr = selectedDate;
    }

    if (dateStr !== selectedDate || filterType !== 'Custom') {
       setSelectedDate(dateStr);
    }
    
    loadDashboardData(dateStr);
  }, [filterType, selectedDate]);

  const loadDashboardData = async (targetDate: string) => {
    setLoading(true);
    try {
      const [allConsumers, appSettings] = await Promise.all([
        db.getAllConsumers(),
        db.getSettings()
      ]);
      
      setSettings(appSettings);
      
      let followUps = 0;
      let attended = 0;
      let paid = 0;
      let collected = 0;
      const logs: Consumer[] = [];

      allConsumers.forEach(c => {
        // 1. Follow Ups Scheduled for this date (Planning)
        if (c.nextFollowUpDate === targetDate && c.status !== ConsumerStatus.PAID) {
          followUps++;
        }

        // 2. Activity / Attended on this date (Performance)
        // We check updatedAt. Note: updatedAt is ISO string. 
        const updatedDatePart = c.updatedAt.split('T')[0];

        if (updatedDatePart === targetDate) {
          attended++;
          logs.push(c); // Add to activity list

          if (c.status === ConsumerStatus.PAID) {
            paid++;
            collected += c.totalDue;
          }
        }
      });

      // Sort logs by time (descending) - inferred from updatedAt
      logs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setStats({
        followUpsCount: followUps,
        attendedCount: attended,
        paidCount: paid,
        collectedAmount: collected
      });
      setActivityLog(logs);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType('Custom');
    setSelectedDate(e.target.value);
  };

  // --- Helpers for Actions ---

  const getStatusColor = (c: Consumer) => {
    if (c.status === ConsumerStatus.PAID) return 'border-l-4 border-green-500 bg-green-50';
    if (['TD', 'PD', 'VR'].includes(c.status)) return 'border-l-4 border-slate-400 bg-slate-50';
    if (c.totalDue >= settings.highDueThreshold) return 'border-l-4 border-red-500 bg-red-50';
    if (c.ageInDays > 30) return 'border-l-4 border-orange-400';
    return 'border-l-4 border-yellow-300'; // Standard due
  };

  const getTemplateMessage = (template: string, c: Consumer) => {
    return template
      .replace('{name}', c.name)
      .replace('{amount}', c.totalDue.toString())
      .replace('{consumerNo}', c.consumerNo);
  };

  const handleCall = (e: React.MouseEvent, mobile: string) => {
    e.stopPropagation();
    window.open(`tel:${mobile}`, '_self');
  };

  const handleSMS = (e: React.MouseEvent, c: Consumer) => {
    e.stopPropagation();
    const msg = getTemplateMessage(settings.smsTemplate, c);
    window.open(`sms:${c.mobile}?body=${encodeURIComponent(msg)}`, '_self');
  };

  const handleWhatsApp = (e: React.MouseEvent, c: Consumer) => {
    e.stopPropagation();
    const msg = getTemplateMessage(settings.whatsappTemplate, c);
    const url = `https://wa.me/91${c.mobile}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const MetricCard = ({ title, value, icon: Icon, colorClass, onClick, hideIconOnMobile }: any) => (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{title}</p>
        {/* Removed truncate to ensure full number visibility, let it wrap if needed */}
        <h3 className="text-lg sm:text-2xl font-bold text-slate-800 mt-1 break-words">{value}</h3>
      </div>
      <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 flex-shrink-0 ${hideIconOnMobile ? 'hidden sm:flex' : 'flex'}`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title="Dashboard" onMenuClick={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto p-4">
        
        {/* 1. Date Filter Section */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-2 items-center justify-between sticky top-0 z-10">
           <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
              <button 
                onClick={() => setFilterType('Yesterday')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'Yesterday' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Yesterday
              </button>
              <button 
                onClick={() => setFilterType('Today')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === 'Today' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Today
              </button>
           </div>

           <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date"
                value={selectedDate}
                onChange={handleCustomDateChange}
                className="bg-transparent border-none text-sm text-slate-700 focus:outline-none w-full"
              />
           </div>
        </div>

        {/* 2. Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <MetricCard 
             title="Follow-ups" 
             value={stats.followUpsCount} 
             icon={Calendar} 
             colorClass="bg-blue-600 text-blue-600"
             onClick={() => navigate('/consumers?filter=FollowUpToday')}
           />
           <MetricCard 
             title="Attended" 
             value={stats.attendedCount} 
             icon={Users} 
             colorClass="bg-purple-600 text-purple-600"
           />
           <MetricCard 
             title="Paid Count" 
             value={stats.paidCount} 
             icon={CheckCircle} 
             colorClass="bg-emerald-500 text-emerald-500"
             onClick={() => navigate('/consumers?filter=PaidToday')}
           />
           <MetricCard 
             title="Collected" 
             value={`₹${stats.collectedAmount.toLocaleString()}`} 
             icon={IndianRupee} 
             colorClass="bg-amber-500 text-amber-500"
             hideIconOnMobile={true}
           />
        </div>

        {/* 3. Daily Activity Log */}
        <div>
           <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
             <ClipboardList className="w-4 h-4" />
             Activity Log ({selectedDate})
           </h3>
           
           <div className="space-y-3">
             {loading ? (
               <div className="p-8 text-center text-slate-400">Loading data...</div>
             ) : activityLog.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
                 <Clock className="w-8 h-8 mb-2 opacity-50" />
                 <p className="text-sm">No updates recorded on this date.</p>
               </div>
             ) : (
               activityLog.map((consumer) => (
                 <div 
                   key={consumer.consumerNo}
                   onClick={() => navigate(`/consumers/${consumer.consumerNo}`)}
                   className={`
                     relative bg-white rounded-lg shadow-sm cursor-pointer active:scale-[0.99] transition-transform
                     ${getStatusColor(consumer)}
                   `}
                 >
                   <div className="p-3 pb-2">
                     {/* Row 1: Name and Amount (Large) */}
                     <div className="flex justify-between items-start gap-3">
                       <h3 className="font-semibold text-slate-800 leading-tight flex-1 text-base sm:text-lg">
                         {consumer.name}
                       </h3>
                       <span className="font-bold text-slate-900 whitespace-nowrap text-base sm:text-lg">
                         ₹{consumer.totalDue.toLocaleString()}
                       </span>
                     </div>

                     {/* Row 2: Metadata - Compact Line with TIME */}
                     <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                       <span className="font-mono bg-slate-100 px-1 rounded">#{consumer.consumerNo}</span>
                       <span className="text-slate-300">|</span>
                       <span className="flex items-center gap-1 text-blue-600 font-medium">
                         <Clock className="w-3 h-3" />
                         {new Date(consumer.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </span>
                       <span className="text-slate-300">|</span>
                       <span>{consumer.ageInDays}d</span>
                       
                       {consumer.status !== ConsumerStatus.PENDING && (
                          <>
                             <span className="text-slate-300">|</span>
                             <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded uppercase tracking-wider">
                                {consumer.status}
                             </span>
                          </>
                       )}
                     </div>

                     {/* Row 3: Address (Smaller) */}
                     <div className="text-xs text-slate-500 w-full break-words mt-1 line-clamp-1 leading-relaxed">
                       {consumer.address}
                     </div>
                   </div>

                   {/* Quick Actions Footer - Compact */}
                   <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                    <button 
                      onClick={(e) => handleCall(e, consumer.mobile)}
                      className="flex-1 py-2 flex items-center justify-center text-green-600 hover:bg-green-50 active:bg-green-100 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleSMS(e, consumer)}
                      className="flex-1 py-2 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleWhatsApp(e, consumer)}
                      className="flex-1 py-2 flex items-center justify-center text-teal-600 hover:bg-teal-50 active:bg-teal-100 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
