// Утилиты для работы с Google Drive API

export interface DriveFileInfo {
  fileId: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface DriveSyncStatus {
  status: "idle" | "syncing" | "success" | "error";
  lastSyncTime: string | null;
  error: string | null;
  fileId: string | null;
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// Получение информации о файле по ID
export async function getDriveFileInfo(
  accessToken: string,
  fileId: string
): Promise<DriveFileInfo | null> {
  try {
    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,modifiedTime,webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      fileId: data.id,
      name: data.name,
      modifiedTime: data.modifiedTime,
      webViewLink: data.webViewLink,
    };
  } catch (error) {
    console.error("Error getting drive file info:", error);
    return null;
  }
}

// Поиск файла по имени
export async function findDriveFile(
  accessToken: string,
  fileName: string
): Promise<DriveFileInfo | null> {
  try {
    const response = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${encodeURIComponent(fileName)}' and trashed=false&fields=files(id,name,modifiedTime,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search file: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        fileId: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
      };
    }

    return null;
  } catch (error) {
    console.error("Error finding drive file:", error);
    return null;
  }
}

// Создание или обновление файла в Google Drive
export async function uploadToDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = "text/csv",
  existingFileId?: string
): Promise<DriveFileInfo> {
  try {
    const metadata = {
      name: fileName,
      mimeType: mimeType,
    };

    let response: Response;

    if (existingFileId) {
      // Обновление существующего файла
      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      formData.append("file", new Blob([content], { type: mimeType }));

      response = await fetch(
        `${DRIVE_UPLOAD_API}/files/${existingFileId}?uploadType=multipart`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );
    } else {
      // Создание нового файла
      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      formData.append("file", new Blob([content], { type: mimeType }));

      response = await fetch(
        `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return {
      fileId: data.id,
      name: data.name,
      modifiedTime: data.modifiedTime || new Date().toISOString(),
      webViewLink: data.webViewLink,
    };
  } catch (error) {
    console.error("Error uploading to drive:", error);
    throw error;
  }
}

// Сохранение fileId в IndexedDB
export async function saveDriveFileId(email: string, fileId: string): Promise<void> {
  if (typeof window === "undefined") return;

  const DB_NAME = "CSVStorage";
  const STORE_NAME = "drive_files";

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ email, fileId, updatedAt: new Date().toISOString() }, email);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    };

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Получение fileId из IndexedDB
export async function getDriveFileId(email: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const DB_NAME = "CSVStorage";
  const STORE_NAME = "drive_files";

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(email);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result?.fileId || null);
      };
      req.onerror = () => reject(req.error);
    };

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

