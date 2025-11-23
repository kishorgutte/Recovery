import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Consumer, ConsumerStatus } from '../types';
import { Users, CheckCircle, AlertTriangle, IndianRupee, Calendar } from 'lucide-react';
import Header from '../components/Header';

const Dashboard: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayFollowUps: 0,
    todayPaidCount: 0,
    todayCollected: 0,
    totalUnpaid: 0,
    highDueCount: 0,
    totalConsumers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const consumers = await db.getAllConsumers();
      const settings = await db.getSettings();
      const todayStr = new Date().toISOString().split('T')[0];

      let followUps = 0;
      let paidCount = 0;
      let collected = 0;
      let unpaid = 0;
      let highDue = 0;

      consumers.forEach(c => {
        const isPaid = c.status === ConsumerStatus.PAID;
        
        // Follow ups today
        if (c.nextFollowUpDate === todayStr && !isPaid) {
          followUps++;
        }

        // Paid today check (simplified logic: if status is PAID and updatedAt is today)
        // Ideally, we'd check history, but for dashboard snapshot this is faster
        if (isPaid && c.updatedAt.startsWith(todayStr)) {
          paidCount++;
          collected += c.totalDue; // Assuming totalDue is what was collected
        }

        if (!isPaid) {
          unpaid++;
          if (c.totalDue >= settings.highDueThreshold) {
            highDue++;
          }
        }
      });

      setStats({
        todayFollowUps: followUps,
        todayPaidCount: paidCount,
        todayCollected: collected,
        totalUnpaid: unpaid,
        highDueCount: highDue,
        totalConsumers: consumers.length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, subText, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-full ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {subText && <p className="text-xs text-slate-400 mt-3">{subText}</p>}
    </div>
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title="Dashboard" onMenuClick={toggleSidebar} />
      
      <main className="flex-1 p-4 overflow-y-auto">
        {/* Changed grid to 4 columns on large screens to accommodate new card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          <StatCard 
            title="Today's Follow-ups"
            value={stats.todayFollowUps}
            icon={Calendar}
            colorClass="bg-blue-500"
            subText="Scheduled for today"
            onClick={() => navigate('/consumers?filter=FollowUpToday')}
          />

          <StatCard 
            title="Paid Today Count"
            value={stats.todayPaidCount}
            icon={CheckCircle}
            colorClass="bg-teal-500"
            subText="Consumers cleared dues"
            onClick={() => navigate('/consumers?filter=PaidToday')}
          />
          
          <StatCard 
            title="Today Collected"
            value={`₹${stats.todayCollected.toLocaleString()}`}
            icon={IndianRupee}
            colorClass="bg-green-600"
            subText="Total amount recovered"
            onClick={() => navigate('/consumers?filter=PaidToday')}
          />

          <StatCard 
            title="High Due Cases"
            value={stats.highDueCount}
            icon={AlertTriangle}
            colorClass="bg-red-500"
            subText="Priority recovery targets"
            onClick={() => navigate('/consumers?filter=HighDue')}
          />

          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
             <div 
               onClick={() => navigate('/consumers?filter=Unpaid')}
               className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-xl p-6 text-white shadow-md cursor-pointer hover:opacity-95 transition-opacity"
             >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold opacity-90">Total Pending Recovery</h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{stats.totalUnpaid}</span>
                      <span className="text-indigo-200">consumers remaining</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

        </div>

        {stats.totalConsumers === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500 mb-2">No data found.</p>
            <p className="text-sm text-slate-400">Go to "Import / Cycle" to load your consumer list.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
