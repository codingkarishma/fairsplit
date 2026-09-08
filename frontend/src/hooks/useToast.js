import { toast } from 'sonner';

export function useToast() {
  const showToast = (message, type = 'success') => {
    const show = toast[type] || toast;
    return show(message);
  };

  const dismissToast = (toastId) => toast.dismiss(toastId);

  return { showToast, dismissToast };
}
