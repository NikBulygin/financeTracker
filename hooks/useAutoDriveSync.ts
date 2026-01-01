import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDriveStore } from "@/store/driveStore";
import { getCSV, saveCSV, parseCSV, stringifyCSV } from "@/lib/csv";

const DEBOUNCE_DELAY = 2000; // 2 секунды после последнего изменения
const CHECK_INTERVAL = 5 * 60 * 1000; // Проверка каждые 5 минут

export function useAutoDriveSync(enabled: boolean = true) {
  const { session } = useAuthStore();
  const { status, setStatus, updateFromResponse, fileId } = useDriveStore();
  const lastDataHashRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const hasDownloadedRef = useRef(false);
  const hasLoadedStatusRef = useRef(false);
  const emailRef = useRef<string | null>(null);

  const downloadFromDrive = async () => {
    if (!session?.user?.email || !fileId || isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setStatus("syncing");

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
        throw new Error(data.error || "Ошибка загрузки");
      }

      // Парсим CSV и сохраняем в IndexedDB
      const csvData = parseCSV(data.csvContent);
      await saveCSV(session.user.email, csvData);

      updateFromResponse({
        status: "success",
        lastSyncTime: new Date().toISOString(),
        error: null,
      });

      hasDownloadedRef.current = true;
    } catch (error) {
      console.error("Error downloading from drive:", error);
      // Не показываем ошибку при первой попытке загрузки, если файла еще нет
      if (hasDownloadedRef.current) {
        const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
        updateFromResponse({
          status: "error",
          error: errorMessage,
        });
      }
    } finally {
      isSyncingRef.current = false;
    }
  };

  const saveToDrive = async () => {
    if (!session?.user?.email || isSyncingRef.current || status === "syncing") {
      return;
    }

    isSyncingRef.current = true;
    setStatus("syncing");

    try {
      // Получаем CSV данные на клиенте и конвертируем в строку
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
      // Сбрасываем флаги при отсутствии сессии
      hasLoadedStatusRef.current = false;
      hasDownloadedRef.current = false;
      lastDataHashRef.current = null;
      emailRef.current = null;
      return;
    }

    // Сбрасываем флаг загрузки статуса при изменении email
    // Это позволит загружать статус при обновлении страницы или смене пользователя
    const currentEmail = session.user.email;
    
    if (emailRef.current !== currentEmail) {
      hasLoadedStatusRef.current = false;
      hasDownloadedRef.current = false;
      lastDataHashRef.current = null;
      emailRef.current = currentEmail;
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

    // Функция для загрузки статуса и файла при первом запуске
    const loadDriveStatus = async () => {
      // Загружаем статус только один раз при монтировании
      if (hasLoadedStatusRef.current) {
        return;
      }
      
      hasLoadedStatusRef.current = true;
      
      try {
        const response = await fetch("/api/drive/status");
        if (response.ok) {
          const data = await response.json();
          updateFromResponse(data);
          
          // Если есть fileId - загружаем файл из Drive
          if (data.fileId) {
            // Сбрасываем флаг загрузки, чтобы загрузить файл
            hasDownloadedRef.current = false;
            await downloadFromDrive();
            // После загрузки обновляем хеш
            const csvData = await getCSV(session.user.email!);
            const dataString = JSON.stringify(csvData);
            lastDataHashRef.current = simpleHash(dataString);
          } else {
            // Если файла нет в Drive, инициализируем хеш текущих данных
            const csvData = await getCSV(session.user.email!);
            const dataString = JSON.stringify(csvData);
            lastDataHashRef.current = simpleHash(dataString);
          }
        }
      } catch (error) {
        console.error("Error loading drive status:", error);
        // Даже при ошибке инициализируем хеш
        try {
          const csvData = await getCSV(session.user.email!);
          const dataString = JSON.stringify(csvData);
          lastDataHashRef.current = simpleHash(dataString);
        } catch (e) {
          console.error("Error initializing hash:", e);
        }
      }
    };

    // Функция для проверки изменений и синхронизации
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

    // При первом запуске загружаем статус и файл из Drive
    loadDriveStatus();

    // Периодическая проверка изменений каждые 5 минут
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

