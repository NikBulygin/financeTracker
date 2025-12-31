"use client";

import { Alert } from "@/lib/alerts";

interface AlertBannerProps {
  alerts: Alert[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`rounded-lg border p-3 text-sm ${
            alert.type === "danger"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
              : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-400"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-base">
              {alert.type === "danger" ? "⚠️" : "⚠️"}
            </span>
            <p>{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

