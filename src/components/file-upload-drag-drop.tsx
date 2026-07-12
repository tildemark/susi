'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from './ui-elements';

interface FileUploadDragDropProps {
  leaseId: string;
  action: (formData: FormData) => Promise<void>;
}

export function FileUploadDragDrop({ leaseId, action }: FileUploadDragDropProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const onButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!file) {
      inputRef.current?.click();
    }
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="uploadedBy" value="landlord" />
      
      <div 
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center cursor-pointer min-h-[140px] ${
          dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          id="signedFile"
          name="file"
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          required
        />
        
        {file ? (
          <div className="space-y-2">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 break-all">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold underline"
            >
              Clear file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Drag &amp; drop your signed lease here, or <span className="text-indigo-600 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports PDF, JPG, PNG up to 10MB</p>
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="text-xs w-full sm:w-auto cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Signed Copy
          </Button>
        </div>
      )}
    </form>
  );
}
