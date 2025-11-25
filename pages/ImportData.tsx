import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Consumer, ConsumerStatus } from '../types';
import { FileUp, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';

// Revert to global variable for stability across environments
declare const XLSX: any;

const ImportData: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EXPECTED_COLUMNS = [
    "Consumer No (Required)", 
    "Name", 
    "Address", 
    "Consumer Mobile Number", 
    "Total Due Amount Including Current Bill", 
    "Bill Due Date", 
    "Age in Days", 
    "Last Receipt Date", 
    "Closing Balance", 
    "Sub Category", 
    "Meter Number", 
    "Remark", 
    "TD/PD Date"
  ];

  const executePurge = async () => {
    setShowPurgeModal(false);
    setMessage({ type: 'success', text: 'Purging data...' });
    
    try {
      await db.purgeConsumers();
      
      // Delay to ensure transaction clears
      await new Promise(resolve => setTimeout(resolve, 500));

      const count = await db.getConsumerCount();
      if (count > 0) {
        throw new Error(`Purge verification failed. ${count} records still exist.`);
      }

      setMessage({ type: 'success', text: 'Data purged successfully. Returning to Dashboard...' });
      
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (e: any) {
      console.error(e);
      setMessage({ type: 'error', text: e.message || 'Failed to purge data.' });
    }
  };

  const parseExcel = (file: File): Promise<Consumer[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          if (typeof XLSX === 'undefined') {
            throw new Error("Excel Parser not loaded. Please check your internet connection.");
          }

          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          if (jsonData.length === 0) {
            resolve([]);
            return;
          }

          const firstRow = jsonData[0] as any;
          const fileHeaders = Object.keys(firstRow);

          const findKey = (expected: string): string | null => {
            if (fileHeaders.includes(expected)) return expected;
            const normalizedExpected = expected.toLowerCase().replace(/\s+/g, '');
            return fileHeaders.find(h => 
              h.toLowerCase().replace(/\s+/g, '') === normalizedExpected
            ) || null;
          };

          const colMap = {
            consumerNo: findKey('Consumer No'),
            name: findKey('Name'),
            address: findKey('Address'),
            mobile: findKey('Consumer Mobile Number') || findKey('Mobile'),
            totalDue: findKey('Total Due Amount Including Current Bill') || findKey('Total Due'),
            billDueDate: findKey('Bill Due Date'),
            ageInDays: findKey('Age in Days'),
            lastReceiptDate: findKey('Last Receipt Date'),
            closingBalance: findKey('Closing Balance'),
            subCategory: findKey('Sub Category'),
            meterNumber: findKey('Meter Number'),
            remark: findKey('Remark'),
            tdPdDate: findKey('TD/PD Date') || findKey('TD PD Date'),
          };

          if (!colMap.consumerNo) {
             throw new Error(`Column "Consumer No" not found.`);
          }

          const consumers: Consumer[] = [];
          
          jsonData.forEach((row: any) => {
             const getVal = (mappedKey: string | null) => {
               if (!mappedKey) return '';
               const val = row[mappedKey];
               return (val !== undefined && val !== null) ? String(val).trim() : '';
             };
             
             const getNum = (mappedKey: string | null) => {
               if (!mappedKey) return 0;
               const val = row[mappedKey];
               if (typeof val === 'number') return val;
               if (typeof val === 'string') {
                 const clean = val.replace(/[^0-9.-]/g, '');
                 return clean ? parseFloat(clean) : 0;
               }
               return 0;
             };

             const consumerNo = getVal(colMap.consumerNo);
             if (!consumerNo) return;

             const consumer: Consumer = {
              consumerNo: consumerNo,
              name: getVal(colMap.name) || 'Unknown',
              address: getVal(colMap.address),
              mobile: getVal(colMap.mobile),
              totalDue: getNum(colMap.totalDue),
              billDueDate: getVal(colMap.billDueDate),
              ageInDays: parseInt(getVal(colMap.ageInDays) || '0'),
              lastReceiptDate: getVal(colMap.lastReceiptDate),
              closingBalance: getNum(colMap.closingBalance),
              subCategory: getVal(colMap.subCategory),
              meterNumber: getVal(colMap.meterNumber),
              remark: getVal(colMap.remark),
              tdPdDate: getVal(colMap.tdPdDate),
              status: ConsumerStatus.PENDING,
              updatedAt: new Date().toISOString()
            };
            
            consumers.push(consumer);
          });

          resolve(consumers);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      if (typeof XLSX === 'undefined') {
         throw new Error("Excel Parser not loaded.");
      }

      const consumers = await parseExcel(file);
      
      if (consumers.length === 0) {
        throw new Error("No valid rows found.");
      }

      await db.saveConsumers(consumers);
      
      setMessage({ type: 'success', text: `Successfully imported ${consumers.length} consumers.` });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || "Import failed." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <Header title="Import" onMenuClick={toggleSidebar} />
      
      <main className="p-4 md:p-6 w-full flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          
          {message && (
            <div className={`p-4 mb-6 rounded-lg flex items-center gap-3 shadow-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
               {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0"/> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
               <span className="font-medium text-sm">{message.text}</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-blue-600" /> Import New List
            </h2>
            
            <div className="space-y-4">
              <div className="text-sm text-slate-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span className="font-semibold text-blue-800">Format Guide</span>
                </div>
                <p className="mb-3">
                  Please ensure your Excel file (.xlsx) contains the following columns. 
                  The app matches them automatically (case-insensitive).
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPECTED_COLUMNS.map((col, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white border border-blue-200 text-slate-700 text-xs rounded shadow-sm">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={importing}
                />
                <div className="pointer-events-none group-hover:scale-105 transition-transform">
                  {importing ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <span className="text-blue-600 font-medium">Processing file...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FileUp className="w-10 h-10 text-slate-300 mb-2 group-hover:text-blue-500 transition-colors" />
                      <span className="text-slate-700 font-medium">Tap to select Excel file</span>
                      <span className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 mb-6">
             <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Trash2 className="w-5 h-5 text-red-600" /> Cycle Management
             </h2>
             <p className="text-sm text-slate-600 mb-4">
               Start a new recovery cycle by removing old consumer data. 
               <br/>
               <span className="text-xs font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded ml-1">Safe</span> 
               Follow-up history will be preserved.
             </p>
             <button 
               onClick={() => setShowPurgeModal(true)}
               className="w-full sm:w-auto px-6 py-2.5 bg-red-50 text-red-700 font-semibold rounded-lg border border-red-200 hover:bg-red-100 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
             >
               <Trash2 className="w-4 h-4" /> Purge Old Data
             </button>
          </div>
        </div>
      </main>

      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6">
                <div className="flex items-center gap-4 mb-5">
                   <div className="p-3 bg-red-100 text-red-600 rounded-full flex-shrink-0">
                     <AlertTriangle className="w-8 h-8" />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-slate-900">Start New Cycle?</h3>
                     <p className="text-sm text-slate-500">This action destroys current list data.</p>
                   </div>
                </div>
                
                <div className="space-y-4 text-slate-600 mb-8">
                   <p className="text-sm">You are about to purge the database. Please confirm:</p>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                      <div className="flex items-center gap-2 text-red-700 font-medium">
                        <Trash2 className="w-4 h-4" />
                        <span>Consumer List will be DELETED</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-700 font-medium">
                         <CheckCircle className="w-4 h-4" />
                         <span>History & Settings are PRESERVED</span>
                      </div>
                   </div>
                   <p className="text-xs text-slate-400">Ensure you have the new Excel file ready before proceeding.</p>
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={() => setShowPurgeModal(false)}
                     className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={executePurge}
                     className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-2"
                   >
                     <Trash2 className="w-5 h-5" />
                     Yes, Purge
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ImportData;