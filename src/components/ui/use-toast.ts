import { toast as sonnerToast } from "sonner";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
};

export function useToast() {
  return {
    toast: (opts: ToastOptions) => {
      const { title, description, variant } = opts || {};
      const message = title
        ? description
          ? `${title}: ${description}`
          : title
        : description || "";

      // Basic variant-aware styling via Sonner's rich API could be added here.
      // For now, we just show a single toast line; callers already pass clear messages.
      sonnerToast(message, {
        // You can map variants to different classes if desired
        className:
          variant === "destructive"
            ? "bg-red-50 text-red-900 border border-red-200"
            : variant === "success"
            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
            : variant === "warning"
            ? "bg-amber-50 text-amber-900 border border-amber-200"
            : undefined,
      });
    },
  } as const;
}

