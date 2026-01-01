import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDriveStore } from "@/store/driveStore";
import { getCSV } from "@/lib/csv";

const DEBOUNCE_DELAY = 2000; // 2 секунды
const CHECK_INTERVAL = 5000; // Проверка каждые 5 секунд

export function useAutoDriveSync(enabled: boolean = true) {
  const { session } = useAuthStore();
  const { status, setStatus, updateFromResponse } = useDriveStore();
  const lastDataHashRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  const saveToDrive = async () => {
    if (!session?.user?.email || isSyncingRef.current || status === "syncing") {
      return;
    }

    isSyncingRef.current = true;
    setStatus("syncing");

    try {
      const response = await fetch("/api/drive/save", {
        method: "POST",
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      updateFromResponse({
        status: "error",
        error: errorMessage,
      });
    } finally {
      isSyncingRef.current = false;
    }
  };

  const debouncedSave = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      saveToDrive();
    }, DEBOUNCE_DELAY);
  };

  useEffect(() => {
    if (!enabled || !session?.user?.email) {
      return;
    }

    // Простая функция хеширования для Unicode строк
    const simpleHash = (str: string): string => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36);
    };

    // Функция для проверки изменений
    const checkForChanges = async () => {
      try {
        const csvData = await getCSV(session.user.email!);
        const dataString = JSON.stringify(csvData);
        const dataHash = simpleHash(dataString);

        if (lastDataHashRef.current === null) {
          // Первая загрузка - сохраняем хеш
          lastDataHashRef.current = dataHash;
        } else if (lastDataHashRef.current !== dataHash) {
          // Данные изменились - запускаем автоматическое сохранение
          lastDataHashRef.current = dataHash;
          debouncedSave();
        }
      } catch (error) {
        console.error("Error checking for CSV changes:", error);
      }
    };

    // Первая проверка сразу
    checkForChanges();

    // Периодическая проверка
    const interval = setInterval(checkForChanges, CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, session?.user?.email]);
}

