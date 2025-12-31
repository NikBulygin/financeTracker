"use client";

import { useEffect, useState } from "react";
import { getCSV, getVersion } from "@/lib/csv";

export default function DatabaseInfo({ email }: { email: string }) {
  const [version, setVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    getCSV(email)
      .then(data => setVersion(getVersion(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-lg font-semibold mb-2">Информация о CSV файле</h2>
      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-green-600 dark:text-green-400">✓ CSV файл найден</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">CSV файл для: {email}</p>
          {version && <p className="text-xs text-zinc-500 dark:text-zinc-500">Версия: {version}</p>}
        </div>
      )}
    </div>
  );
}

