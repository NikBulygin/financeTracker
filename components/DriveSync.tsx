"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDriveStore } from "@/store/driveStore";
import { useToastStore } from "@/store/toastStore";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getCSV, stringifyCSV, saveCSV, parseCSV } from "@/lib/csv";

export default function DriveSync() {
  const { session } = useAuthStore();
  const { status, lastSyncTime, error, fileId, setStatus, updateFromResponse } = useDriveStore();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadStatus = async () => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch("/api/drive/status");
      if (response.ok) {
        const data = await response.json();
        updateFromResponse(data);
      }
    } catch (error) {
      console.error("Error loading drive status:", error);
    }
  };

  useEffect(() => {
    loadStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSave = async () => {
    if (!session?.user?.email) {
      addToast("Необходима авторизация", "error");
      return;
    }

    setLoading(true);
    setStatus("syncing");

    try {
      // Получаем CSV данные на клиенте
      const csvData = await getCSV(session.user.email);
      const csvContent = stringifyCSV(csvData);

      const response = await fetch("/api/drive/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка сохранения");
      }

      updateFromResponse({
        status: "success",
        lastSyncTime: data.modifiedTime || new Date().toISOString(),
        error: null,
        fileId: data.fileId,
      });

      addToast("Файл успешно сохранен в Google Drive", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      updateFromResponse({
        status: "error",
        error: errorMessage,
      });
      addToast(`Ошибка сохранения: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!session?.user?.email) {
      addToast("Необходима авторизация", "error");
      return;
    }

    if (!fileId) {
      addToast("Файл не найден в Drive. Сначала сохраните файл.", "error");
      return;
    }

    setDownloading(true);

    try {
      const response = await fetch("/api/drive/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка скачивания");
      }

      // Парсим CSV и сохраняем в IndexedDB
      const csvData = parseCSV(data.csvContent);
      await saveCSV(session.user.email, csvData);

      updateFromResponse({
        status: "success",
        lastSyncTime: new Date().toISOString(),
        error: null,
      });

      addToast("Файл успешно загружен из Google Drive", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      updateFromResponse({
        status: "error",
        error: errorMessage,
      });
      addToast(`Ошибка загрузки: ${errorMessage}`, "error");
    } finally {
      setDownloading(false);
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "syncing":
        return "Синхронизация...";
      case "success":
        return "Синхронизировано";
      case "error":
        return "Ошибка";
      default:
        return "Не синхронизировано";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "syncing":
        return "text-blue-600 dark:text-blue-400";
      case "success":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-zinc-600 dark:text-zinc-400";
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="mb-4 text-lg font-semibold">Синхронизация с Google Drive</h2>
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Статус</p>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusLabel()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || status === "syncing"}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors active:bg-[#383838] hover:bg-[#383838] dark:active:bg-[#ccc] dark:hover:bg-[#ccc] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || status === "syncing" ? "Сохранение..." : "Сохранить"}
            </button>
            {fileId && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm font-medium transition-colors active:bg-zinc-100 dark:active:bg-zinc-900 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? "Загрузка..." : "Скачать"}
              </button>
            )}
          </div>
        </div>

        {lastSyncTime && (
          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              Последнее сохранение:
            </p>
            <p className="text-sm font-medium">
              {format(new Date(lastSyncTime), "d MMMM yyyy, HH:mm", { locale: ru })}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {fileId && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            File ID: {fileId.substring(0, 20)}...
          </div>
        )}
      </div>
    </div>
  );
}

