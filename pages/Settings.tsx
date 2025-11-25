import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/db';
import { AppSettings, DEFAULT_SETTINGS } from '../types';
import { Save, Download, Upload, RefreshCw } from 'lucide-react';
import Header from '../components/Header';

const Settings: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await db.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBackup = async () => {
    try {
      const json = await db.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `MRA_Backup_History_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to create backup.");
      console.error(e);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("This will REPLACE your current follow-up history and settings. Your Consumer List will remain safe. Continue?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await db.importData(json);
        
        // Reload local settings state to reflect changes immediately
        const newSettings = await db.getSettings();
        setSettings(newSettings);
        
        alert("History and Settings restored successfully!");
        
      } catch (err) {
        alert("Restoration Failed. Please check if the file is a valid backup.");
        console.error(err);
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title="Settings" onMenuClick={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto p-4 w-full">
        <div className="max-w-2xl mx-auto space-y-6 pb-6">
        
          {/* Backup & Restore Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Backup & Restore (History Only)
            </h3>
            <p className="text-sm text-slate-600 mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <strong>Note:</strong> Backup includes <u>Follow-up History</u> and <u>Settings</u> only. <br/>
              It does <strong>NOT</strong> include the Consumer List. You must import the Excel file separately to see consumer details.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleBackup}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 active:bg-slate-200"
              >
                <Download className="w-4 h-4" /> Backup History
              </button>
              
              <div className="relative">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".json"
                  onChange={handleRestore}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button 
                  className="w-full h-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 active:bg-slate-200 pointer-events-none"
                >
                  <Upload className="w-4 h-4" /> Restore History
                </button>
              </div>
            </div>
          </div>

          {/* Thresholds Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Thresholds</h3>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">High Due Threshold (₹)</label>
              <input 
                type="number" 
                className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                value={settings.highDueThreshold}
                onChange={(e) => setSettings({...settings, highDueThreshold: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-slate-400 mt-1">Consumers with dues above this amount will be highlighted in red.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Communication Templates</h3>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 mb-1">SMS Template</label>
                <textarea 
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                  rows={3}
                  value={settings.smsTemplate}
                  onChange={(e) => setSettings({...settings, smsTemplate: e.target.value})}
                ></textarea>
                <p className="text-xs text-slate-400 mt-1">Use {'{name}'}, {'{amount}'}, {'{consumerNo}'} as placeholders.</p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 mb-1">WhatsApp Template</label>
                <textarea 
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                  rows={5}
                  value={settings.whatsappTemplate}
                  onChange={(e) => setSettings({...settings, whatsappTemplate: e.target.value})}
                ></textarea>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            <Save className="w-5 h-5" />
            {saved ? "Saved!" : "Save Settings"}
          </button>

        </div>
      </main>
    </div>
  );
};

export default Settings;