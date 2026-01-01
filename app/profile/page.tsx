"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { useToastStore } from "@/store/toastStore";
import { getCSV, getVersion } from "@/lib/csv";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { session } = useAuthStore();
  const [csvPath, setCsvPath] = useState<string>("");
  const [csvVersion, setCsvVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  const email = session?.user?.email || "";
  const name = session?.user?.name || "";
  const image = session?.user?.image || "";

  useEffect(() => {
    const loadCSVInfo = async () => {
      if (!email) {
        setLoading(false);
        return;
      }
      try {
        const data = await getCSV(email);
        setCsvVersion(getVersion(data));
        // Путь к файлу в IndexedDB
        setCsvPath(`IndexedDB: CSVStorage/csv_files/csv_data_${email}`);
      } catch (error) {
        console.error("Error loading CSV info:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCSVInfo();
  }, [email]);

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvPath(e.target.value);
  };

  const handleSavePath = () => {
    // Здесь можно добавить сохранение пути в localStorage или другое хранилище
    localStorage.setItem(`csv_path_${email}`, csvPath);
    addToast("Путь к файлу сохранен", "success");
  };

  const savedPath = typeof window !== "undefined" ? localStorage.getItem(`csv_path_${email}`) : null;
  const displayPath = savedPath || csvPath;

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex w-full flex-col gap-6 py-4 px-4 sm:py-8 sm:px-6">
        <h1 className="text-2xl font-semibold">Профиль</h1>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
            {image ? (
              <img
                src={image}
                alt={name || "User"}
                className="w-24 h-24 rounded-full border-2 border-zinc-200 dark:border-zinc-800"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-3xl font-semibold text-zinc-600 dark:text-zinc-400">
                {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold mb-1">{name || "Пользователь"}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 break-all">{email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <p className="text-sm break-all">{email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Путь к файлу</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={csvPath}
                  onChange={handlePathChange}
                  placeholder="Введите путь к файлу"
                  className="flex-1 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                />
                <button
                  onClick={handleSavePath}
                  className="px-4 py-3 rounded-lg bg-foreground text-background text-sm font-medium transition-colors active:bg-[#383838] hover:bg-[#383838] dark:active:bg-[#ccc] dark:hover:bg-[#ccc] touch-manipulation"
                >
                  Сохранить
                </button>
              </div>
              {displayPath && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 break-all">
                  Текущий путь: {displayPath}
                </p>
              )}
            </div>

            {loading ? (
              <div>
                <label className="block text-sm font-medium mb-2">Информация о CSV</label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">Версия CSV файла</label>
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <p className="text-sm">{csvVersion || "Не указана"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

