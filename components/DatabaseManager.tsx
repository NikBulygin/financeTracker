"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getCSV, initCSV, addRow, downloadCSV, importCSVFromFile, type CSVData } from "@/lib/csv";
import { useToastStore } from "@/store/toastStore";

export default function DatabaseManager() {
  const { data: session } = useSession();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  const email = session?.user?.email;
  const loadData = () => email && getCSV(email).then(setCsvData).catch(() => setCsvData(null));

  useEffect(() => {
    if (email && typeof window !== "undefined") {
      loadData().finally(() => setLoading(false));
    }
  }, [email]);

  const handleAction = async (action: () => Promise<void>, successMsg: string, errorMsg: string = "Ошибка") => {
    if (!email) return;
    try {
      await action();
      await loadData();
      addToast(successMsg, "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addToast(`${errorMsg}: ${errorMessage}`, "error");
    }
  };

  const initCSVFile = () => handleAction(
    () => initCSV(email, ["id", "name", "created_at"]),
    "CSV файл инициализирован успешно",
    "Ошибка инициализации CSV"
  );

  const addSampleRow = () => csvData && handleAction(
    () => addRow(email, {
      id: csvData.rows.length + 1,
      name: `Пользователь ${csvData.rows.length + 1}`,
      created_at: new Date().toISOString(),
    }),
    "Строка добавлена успешно",
    "Ошибка добавления строки"
  );

  const exportCSV = () => {
    if (!csvData) return;
    try {
      downloadCSV(csvData, `data_${email?.replace("@", "_") || "export"}.csv`);
      addToast("CSV файл экспортирован", "success");
    } catch (error) {
      addToast("Ошибка экспорта CSV", "error");
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!email || !e.target.files?.[0]) return;
    handleAction(
      () => importCSVFromFile(email, e.target.files![0]),
      "CSV файл импортирован успешно",
      "Ошибка импорта CSV"
    );
  };

  const btnClass = "w-full rounded-full bg-foreground px-5 py-3 text-sm text-background transition-colors active:bg-[#383838] hover:bg-[#383838] dark:active:bg-[#ccc] dark:hover:bg-[#ccc] touch-manipulation sm:w-auto sm:text-base";

  if (loading) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка CSV...</p>;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <h2 className="text-xl font-semibold sm:text-2xl">Управление CSV файлом</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 sm:text-base break-words">
        CSV файл для: {email}
      </p>
      
      <div className="flex flex-col gap-2 sm:flex-row flex-wrap">
        <button onClick={initCSVFile} className={btnClass}>Инициализировать CSV</button>
        {csvData && (
          <>
            <button onClick={addSampleRow} className={btnClass}>Добавить строку</button>
            <button onClick={exportCSV} className={btnClass}>Экспортировать CSV</button>
          </>
        )}
        <label className={`${btnClass} text-center cursor-pointer`}>
          Импортировать CSV
          <input type="file" accept=".csv" onChange={handleFileImport} className="hidden" />
        </label>
      </div>

      {csvData && csvData.rows.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2">Строк в файле: {csvData.rows.length}</p>
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  {csvData.headers.map(h => <th key={h} className="p-2 text-left border-r">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {csvData.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b">
                    {csvData.headers.map(h => (
                      <td key={h} className="p-2 border-r">{row[h] || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.rows.length > 5 && (
              <p className="text-xs text-zinc-500 mt-2">Показано 5 из {csvData.rows.length} строк</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

