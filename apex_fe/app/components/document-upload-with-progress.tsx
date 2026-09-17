'use client';

import { useRef, useState, useCallback } from 'react';
import { UploadProgress, LoadingSpinner } from './loading-spinner';
import { useErrorHandler } from '@/app/lib/use-mutation-toast';

interface DocumentUploadWithProgressProps {
  leadId: string;
  onSuccess?: (documentId: string, fileName: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  accept?: string;
  maxSizeMB?: number;
}

/**
 * Document Upload Component with Progress Tracking
 * Handles file selection, upload progress, and error states
 */
export function DocumentUploadWithProgress({
  leadId,
  onSuccess,
  onError,
  disabled = false,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxSizeMB = 10,
}: DocumentUploadWithProgressProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError } = useErrorHandler();

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (selectedFile.size > maxSizeBytes) {
        showError(
          `File is too large. Maximum size: ${maxSizeMB}MB`,
          'File too large'
        );
        return;
      }

      // Validate file type
      const allowedTypes = accept.split(',').map(t => t.trim());
      const fileExt = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;
      if (!allowedTypes.includes(fileExt)) {
        showError(
          `File type not allowed. Accepted: ${accept}`,
          'Invalid file type'
        );
        return;
      }

      setFile(selectedFile);
      setProgress(0);
    },
    [showError, accept, maxSizeMB]
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lead_id', leadId);

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();

      // Track progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      });

      // Handle completion
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                setProgress(100);
                onSuccess?.(response.documentId, file.name);
                setFile(null);
                setProgress(0);
                setUploadedFileName(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                resolve();
              } else {
                reject(new Error(response.error || 'Upload failed'));
              }
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', '/api/documents/upload');
        xhr.send(formData);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload document';
      showError(errorMessage);
      onError?.(errorMessage);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }, [file, leadId, onSuccess, onError, showError]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || uploading) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [disabled, uploading]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled || uploading) return;
      e.preventDefault();
      e.stopPropagation();

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        const fakeEvent = {
          target: { files: [droppedFile] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileSelect(fakeEvent);
      }
    },
    [disabled, uploading, handleFileSelect]
  );

  return (
    <div className="space-y-3">
      {/* File Input Area */}
      <div
        className={`rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-center transition-colors ${
          !disabled && !uploading
            ? 'hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'
            : ''
        } ${disabled || uploading ? 'opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!uploading && !file && (
          <>
            <svg
              className="mx-auto h-8 w-8 text-[var(--text-muted)] mb-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>

            <p className="text-sm font-medium text-[var(--text)]">
              Drag and drop your file here, or click to select
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Accepted: {accept} (Max {maxSizeMB}MB)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              accept={accept}
              className="hidden"
              aria-label="Upload document"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="mt-3 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              Select File
            </button>
          </>
        )}

        {!uploading && file && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 text-green-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-[var(--text)]">
                {file.name}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={disabled}
                className="flex-1 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setProgress(0);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={disabled}
                className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--background)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {uploading && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="md" />
              <span className="text-sm font-medium text-[var(--text)]">
                Uploading...
              </span>
            </div>
            {uploadedFileName && (
              <UploadProgress progress={progress} fileName={uploadedFileName} />
            )}
          </div>
        )}
      </div>

      {/* Hidden feedback for screen readers */}
      {uploading && (
        <div className="sr-only" role="status" aria-live="polite">
          Uploading {uploadedFileName} - {progress}% complete
        </div>
      )}
    </div>
  );
}
