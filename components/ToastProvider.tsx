"use client";

import { useToastStore } from "@/store/toastStore";
import ToastContainer from "./Toast";

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToastStore();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

