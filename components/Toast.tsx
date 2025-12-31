"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-900 dark:text-green-400",
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-400",
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 text-sm shadow-lg animate-in slide-in-from-top-2",
        styles[toast.type]
      )}
    >
      <span className="text-base">{icons[toast.type]}</span>
      <p className="flex-1">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="text-current opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 max-w-sm sm:w-full w-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

