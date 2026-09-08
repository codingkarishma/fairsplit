import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from 'lucide-react';
import { Toaster as Sonner } from 'sonner';

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-oklch(1 0 0) group-[.toaster]:text-oklch(0.147 0.004 49.25) group-[.toaster]:border-oklch(0.923 0.003 48.717) group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-oklch(0.147 0.004 49.25) dark:group-[.toaster]:text-oklch(0.985 0.001 106.423) dark:group-[.toaster]:border-oklch(1 0 0 / 10%)',
          description:
            'group-[.toast]:text-oklch(0.553 0.013 58.071) dark:group-[.toast]:text-oklch(0.709 0.01 56.259)',
          actionButton:
            'group-[.toast]:bg-oklch(0.216 0.006 56.043) group-[.toast]:text-oklch(0.985 0.001 106.423) dark:group-[.toast]:bg-oklch(0.923 0.003 48.717) dark:group-[.toast]:text-oklch(0.216 0.006 56.043)',
          cancelButton:
            'group-[.toast]:bg-oklch(0.97 0.001 106.424) group-[.toast]:text-oklch(0.553 0.013 58.071) dark:group-[.toast]:bg-oklch(0.268 0.007 34.298) dark:group-[.toast]:text-oklch(0.709 0.01 56.259)',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
