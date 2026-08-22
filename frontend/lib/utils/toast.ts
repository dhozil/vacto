import { toast as sonnerToast, ExternalToast } from "sonner";

const defaultOptions: ExternalToast = {
  duration: 4000,
  closeButton: true,
  style: {
    background: "var(--background)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  },
};

export const success = (message: string, options?: ExternalToast) => {
  return sonnerToast.success(message, {
    ...defaultOptions,
    duration: 4000,
    style: {
      background: "var(--background)",
      border: "1px solid var(--accent) / 0.3",
      color: "var(--accent)",
      ...options?.style,
    },
    ...options,
  });
};

export const error = (message: string, options?: ExternalToast) => {
  return sonnerToast.error(message, {
    ...defaultOptions,
    duration: 6000,
    style: {
      background: "var(--background)",
      border: "1px solid var(--destructive) / 0.5",
      color: "var(--destructive)",
      ...options?.style,
    },
    ...options,
  });
};

export const warning = (message: string, options?: ExternalToast) => {
  return sonnerToast.warning(message, {
    ...defaultOptions,
    duration: 5000,
    style: {
      background: "var(--background)",
      border: "1px solid rgb(234 179 8 / 0.3)",
      color: "rgb(250 204 21)",
      ...options?.style,
    },
    ...options,
  });
};

export const info = (message: string, options?: ExternalToast) => {
  return sonnerToast.info(message, {
    ...defaultOptions,
    duration: 3000,
    ...options,
  });
};

export const configError = (
  message: string,
  description?: string,
  action?: { label: string; onClick: () => void }
) => {
  return sonnerToast.error(message, {
    description,
    duration: Infinity,
    closeButton: true,
    action: action
      ? { label: action.label, onClick: action.onClick }
      : undefined,
    style: {
      background: "var(--background)",
      border: "1px solid var(--destructive) / 0.5",
      color: "var(--destructive)",
    },
  });
};

export const userRejected = (message: string) => {
  return sonnerToast.info(message, {
    duration: 2000,
    closeButton: false,
    style: {
      background: "var(--background)",
      border: "1px solid var(--border)",
      color: "var(--muted-foreground)",
    },
  });
};

export { sonnerToast as toast };
export default {
  success,
  error,
  warning,
  info,
  configError,
  userRejected,
  toast: sonnerToast,
};