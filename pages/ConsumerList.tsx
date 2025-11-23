import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../services/db';
import { Consumer, ConsumerStatus, AppSettings, DEFAULT_SETTINGS } from '../types';
import { Search, Filter, ArrowUpDown, Phone, MessageSquare, Send } from 'lucide-react';
import Header from '../components/Header';

const ConsumerList: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Unpaid'); // Default to Unpaid
  const [sortBy, setSortBy] = useState<'amount' | 'age'>('amount');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Check for URL filter param (e.g. ?filter=FollowUpToday)
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setStatusFilter(filterParam);
      setShowFilters(true); // Auto-expand filters so user knows why list is filtered
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [data, appSettings] = await Promise.all([
        db.getAllConsumers(),
        db.getSettings()
      ]);
      setConsumers(data);
      setSettings(appSettings);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredConsumers = useMemo(() => {
    let result = consumers;

    // 1. Search (Name, No, Mobile, Address)
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(lower) ||
        c.consumerNo.includes(lower) ||
        c.mobile.includes(lower) ||
        (c.address && c.address.toLowerCase().includes(lower))
      );
    }

    // 2. Filter Status/Type
    if (statusFilter !== 'All') {
      const today = new Date().toISOString().split('T')[0];
      
      if (statusFilter === 'Paid') {
        result = result.filter(c => c.status === ConsumerStatus.PAID);
      } else if (statusFilter === 'PaidToday') {
        result = result.filter(c => c.status === ConsumerStatus.PAID && c.updatedAt.startsWith(today));
      } else if (statusFilter === 'Unpaid') {
        result = result.filter(c => c.status !== ConsumerStatus.PAID);
      } else if (statusFilter === 'FollowUpToday') {
        result = result.filter(c => c.nextFollowUpDate === today && c.status !== ConsumerStatus.PAID);
      } else if (statusFilter === 'HighDue') {
        result = result.filter(c => c.totalDue >= settings.highDueThreshold && c.status !== ConsumerStatus.PAID);
      } else if (['TD', 'PD', 'VR', 'Will pay today'].includes(statusFilter)) {
        result = result.filter(c => c.status === statusFilter);
      }
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'amount') return b.totalDue - a.totalDue;
      if (sortBy === 'age') return b.ageInDays - a.ageInDays;
      return 0;
    });

    return result;
  }, [consumers, searchTerm, statusFilter, sortBy, settings]);

  const getStatusColor = (c: Consumer) => {
    if (c.status === ConsumerStatus.PAID) return 'border-l-4 border-green-500 bg-green-50';
    if (['TD', 'PD', 'VR'].includes(c.status)) return 'border-l-4 border-slate-400 bg-slate-50';
    if (c.totalDue >= settings.highDueThreshold) return 'border-l-4 border-red-500 bg-red-50';
    if (c.ageInDays > 30) return 'border-l-4 border-orange-400';
    return 'border-l-4 border-yellow-300'; // Standard due
  };

  // --- Quick Actions ---

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

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <Header title="Consumer List" onMenuClick={toggleSidebar} />

      {/* Search & Filter Bar */}
      <div className="bg-white shadow-sm p-3 flex flex-col gap-3 z-20 sticky top-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Name, No, Mobile, or Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-600'}`}
          >
            <Filter className="w-6 h-6" />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 text-sm">
             <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-300 rounded-md text-base"
             >
               <option value="Unpaid">Unpaid</option>
               <option value="All">All Consumers</option>
               <option value="Paid">All Paid</option>
               <option value="PaidToday">Paid Today</option>
               <option value="FollowUpToday">Follow-up Today</option>
               <option value="Will pay today">Will Pay Today</option>
               <option value="HighDue">High Due</option>
               <option value="TD">TD</option>
               <option value="PD">PD</option>
               <option value="VR">VR</option>
             </select>

             <button 
                onClick={() => setSortBy(sortBy === 'amount' ? 'age' : 'amount')}
                className="flex items-center justify-center gap-2 p-2 border border-slate-300 rounded-md bg-white text-slate-700 text-base"
             >
               <ArrowUpDown className="w-4 h-4" />
               Sort: {sortBy === 'amount' ? 'Amount' : 'Age'}
             </button>
          </div>
        )}
        
        <div className="text-xs text-slate-500 font-medium flex justify-between items-center">
          <span>Showing {filteredConsumers.length} consumers</span>
          {statusFilter !== 'All' && (
             <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">
               Filter: {statusFilter}
             </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
           <div className="text-center py-10">Loading...</div>
        ) : filteredConsumers.length === 0 ? (
           <div className="text-center py-10 text-slate-500">No consumers match your filters.</div>
        ) : (
          filteredConsumers.map(consumer => (
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

                {/* Row 2: Consumer No | Age | Tags - COMPACT LINE (Smaller) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-mono bg-slate-100 px-1 rounded">#{consumer.consumerNo}</span>
                  <span className="text-slate-300">|</span>
                  <span>{consumer.ageInDays}d</span>
                  
                  {consumer.status !== ConsumerStatus.PENDING && consumer.status !== ConsumerStatus.PAID && (
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
  );
};

export default ConsumerList;
