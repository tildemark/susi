'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from './toast-context';

function ToastListenerContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      showToast(success, 'success');
    }
    if (error) {
      showToast(error, 'error');
    }

    if (success || error) {
      // Clear query params from URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, showToast]);

  return null;
}

export function ToastListener() {
  return (
    <Suspense fallback={null}>
      <ToastListenerContent />
    </Suspense>
  );
}
