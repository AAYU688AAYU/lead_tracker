'use client';

import React, { useState } from 'react';
import { FileUp, CheckCircle, Clock, ShieldCheck, Trash2 } from 'lucide-react';

interface MockDoc {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  date: string;
}

export function DocumentUploader() {
  const [docs, setDocs] = useState<MockDoc[]>([
    {
      id: 'doc-1',
      name: 'Official_Undergraduate_Transcript.pdf',
      type: 'ACADEMIC TRANSCRIPT',
      size: '2.4 MB',
      status: 'VERIFIED',
      date: '2026-09-10',
    },
    {
      id: 'doc-2',
      name: 'IELTS_Academic_Scorecard_Band_7.5.pdf',
      type: 'LANGUAGE TEST',
      size: '1.1 MB',
      status: 'VERIFIED',
      date: '2026-09-11',
    },
    {
      id: 'doc-3',
      name: 'Passport_Biometric_Scan.pdf',
      type: 'PASSPORT IDENTIFICATION',
      size: '3.8 MB',
      status: 'PENDING',
      date: '2026-09-12',
    },
  ]);

  const handleSimulateUpload = () => {
    const newDoc: MockDoc = {
      id: 'doc-' + Date.now(),
      name: 'Statement_of_Purpose_V2.pdf',
      type: 'STATEMENT OF PURPOSE',
      size: '850 KB',
      status: 'PENDING',
      date: new Date().toISOString().split('T')[0],
    };
    setDocs([...docs, newDoc]);
  };

  const handleDelete = (id: string) => {
    setDocs(docs.filter((d) => d.id !== id));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Confidential Document Vault (Supabase Storage)
          </h3>
          <p className="text-xs text-slate-500">
            Files are protected with 60-minute expiring signed URLs and AES-256 encryption.
          </p>
        </div>

        <button
          onClick={handleSimulateUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>Upload Academic File</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 truncate max-w-[240px] sm:max-w-md">{doc.name}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-blue-700 font-medium">{doc.type}</span>
                  <span>•</span>
                  <span>{doc.size}</span>
                  <span>•</span>
                  <span>Uploaded {doc.date}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {doc.status === 'VERIFIED' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3 h-3" />
                  VERIFIED
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3 h-3" />
                  PENDING REVIEW
                </span>
              )}

              <button
                onClick={() => handleDelete(doc.id)}
                title="Remove Document"
                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
