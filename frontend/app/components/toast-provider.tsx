'use client';

import { ReactNode } from 'react';
import { useToast } from '@/app/lib/use-toast';
import { ErrorToast, SuccessToast, WarningToast } from './error-toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          switch (toast.type) {
            case 'error':
              return (
                <div key={toast.id} className="pointer-events-auto">
                  <ErrorToast
                    message={toast.message}
                    onDismiss={() => removeToast(toast.id)}
                  />
                </div>
              );
            case 'success':
              return (
                <div key={toast.id} className="pointer-events-auto">
                  <SuccessToast
                    message={toast.message}
                    onDismiss={() => removeToast(toast.id)}
                  />
                </div>
              );
            case 'warning':
              return (
                <div key={toast.id} className="pointer-events-auto">
                  <WarningToast
                    message={toast.message}
                    onDismiss={() => removeToast(toast.id)}
                    action={toast.action}
                  />
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </>
  );
}
