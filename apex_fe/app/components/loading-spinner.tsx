'use client';

/**
 * Loading Spinner Components
 * Provide visual feedback for async operations
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

/**
 * Simple spinner icon for inline loading states
 */
export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6',
  };

  return (
    <div className="inline-block">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]`}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

/**
 * Full-screen overlay spinner for page-level loading
 */
export function FullScreenSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-[var(--radius-md)] bg-white px-8 py-12 text-center shadow-xl">
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading state for buttons
 */
export function LoadingButton({
  isLoading,
  disabled,
  children,
  loadingText = 'Loading...',
  className = '',
}: {
  isLoading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}) {
  return (
    <button
      disabled={isLoading || disabled}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Upload progress indicator
 */
export function UploadProgress({
  progress,
  fileName,
}: {
  progress: number; // 0-100
  fileName?: string;
}) {
  return (
    <div className="space-y-2">
      {fileName && (
        <p className="text-sm font-medium text-[var(--text)] truncate">
          {fileName}
        </p>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-200"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={fileName ? `Uploading ${fileName}` : 'Uploading'}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)]">{progress}%</p>
    </div>
  );
}

/**
 * Minimal loading bar (top of page)
 */
export function PageLoadingBar({
  isVisible = true,
  progress = 50,
}: {
  isVisible?: boolean;
  progress?: number;
}) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--border)]"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
    >
      <div
        className="h-full bg-[var(--accent)] transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
