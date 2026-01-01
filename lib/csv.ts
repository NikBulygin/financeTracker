// Библиотека для работы с CSV файлами на клиенте
export interface CSVRow {
  [key: string]: string | number | null;
}

export interface CSVData {
  headers: string[];
  rows: CSVRow[];
  metadata?: CSVRow;
}

const DB_NAME = "CSVStorage";
const DB_VERSION = 2; // Версия IndexedDB
const STORE_NAME = "csv_files";
const getStorageKey = (email: string) => `csv_data_${email}`;
const getAppVersion = () => process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

// IndexedDB helper
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      // Создаем хранилище для CSV файлов
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      // Создаем хранилище для Drive файлов (если его еще нет)
      if (!db.objectStoreNames.contains("drive_files")) {
        db.createObjectStore("drive_files");
      }
    };
  });
};

const loadFromDB = async (email: string): Promise<CSVData | null> => {
  if (typeof window === "undefined") return null;
  const db = await openDB();
  const tx = db.transaction([STORE_NAME], "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.get(getStorageKey(email));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

const saveToDB = async (email: string, data: CSVData): Promise<void> => {
  if (typeof window === "undefined") return;
  const db = await openDB();
  const tx = db.transaction([STORE_NAME], "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.put(data, getStorageKey(email));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// CSV parsing
const parseLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const escapeValue = (value: string | number | null): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function parseCSV(csvText: string): CSVData {
  if (typeof window === "undefined") return { headers: [], rows: [] };
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = parseLine(lines[0]);
  const rows: CSVRow[] = [];
  let metadata: CSVRow | null = null;
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: CSVRow = {};
    headers.forEach((h, idx) => row[h] = values[idx] || null);
    if (i === 1 && row.type === "metadata") {
      metadata = row;
    } else {
      rows.push(row);
    }
  }
  return { headers, rows, metadata: metadata || undefined };
}

export function stringifyCSV(data: CSVData): string {
  if (!data.headers?.length) return "";
  const lines = [data.headers.map(escapeValue).join(',')];
  if (data.metadata) {
    lines.push(data.headers.map(h => escapeValue(data.metadata![h] || null)).join(','));
  }
  data.rows.forEach(row => {
    lines.push(data.headers.map(h => escapeValue(row[h] || null)).join(','));
  });
  return lines.join('\n');
}

// Main API
export async function getCSV(email: string, defaultHeaders: string[] = []): Promise<CSVData> {
  if (typeof window === "undefined") throw new Error("Browser only");
  const data = await loadFromDB(email);
  if (data) {
    // Если файл существует, проверяем заголовки
    if (defaultHeaders.length > 0) {
      const existingHeaders = new Set(data.headers);
      const missingHeaders = defaultHeaders.filter(h => !existingHeaders.has(h));
      if (missingHeaders.length > 0) {
        data.headers = [...data.headers, ...missingHeaders];
        await saveToDB(email, data);
      }
    }
    return data;
  }
  // Если файла нет, создаем новый с указанными заголовками
  return initCSV(email, defaultHeaders);
}

export async function saveCSV(email: string, data: CSVData): Promise<void> {
  await saveToDB(email, data);
}

export async function csvExists(email: string): Promise<boolean> {
  return (await loadFromDB(email)) !== null;
}

export async function initCSV(
  email: string,
  headers: string[] = ["id", "name", "created_at"],
  version: string = getAppVersion()
): Promise<CSVData> {
  if (typeof window === "undefined") throw new Error("Browser only");
  const existing = await loadFromDB(email);
  if (existing) {
    // Если файл существует, проверяем заголовки и добавляем недостающие
    const existingHeaders = new Set(existing.headers);
    const newHeaders = headers.filter(h => !existingHeaders.has(h));
    if (newHeaders.length > 0) {
      existing.headers = [...existing.headers, ...newHeaders];
      await saveToDB(email, existing);
    }
    return existing;
  }
  
  const metadata: CSVRow = {
    type: "metadata",
    version,
    created_at: new Date().toISOString(),
    email,
    user_agent: navigator?.userAgent || "",
  };
  
  const allHeaders = [...new Set(["type", "version", "email", "user_agent", ...headers])];
  const data: CSVData = { headers: allHeaders, rows: [], metadata };
  await saveToDB(email, data);
  return data;
}

export function getVersion(data: CSVData): string {
  return (data.metadata?.version as string) || "unknown";
}

export async function addRow(email: string, row: CSVRow): Promise<void> {
  const data = await getCSV(email);
  data.rows.push(row);
  await saveCSV(email, data);
}

export function downloadCSV(data: CSVData, filename: string = "data.csv"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([stringifyCSV(data)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importCSVFromFile(email: string, file: File): Promise<void> {
  if (typeof window === "undefined") throw new Error("Browser only");
  const text = await file.text();
  await saveCSV(email, parseCSV(text));
}
