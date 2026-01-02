import { create } from "zustand";
import { DriveSyncStatus } from "@/lib/drive";

interface DriveState extends DriveSyncStatus {
  setStatus: (status: DriveSyncStatus["status"]) => void;
  setLastSyncTime: (time: string | null) => void;
  setError: (error: string | null) => void;
  setFileId: (fileId: string | null) => void;
  updateFromResponse: (data: {
    status?: DriveSyncStatus["status"];
    lastSyncTime?: string | null;
    error?: string | null;
    fileId?: string | null;
  }) => void;
  reset: () => void;
}

const initialState: DriveSyncStatus = {
  status: "idle",
  lastSyncTime: null,
  error: null,
  fileId: null,
};

export const useDriveStore = create<DriveState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setError: (error) => set({ error }),
  setFileId: (fileId) => set({ fileId }),
  updateFromResponse: (data) =>
    set((state) => ({
      ...state,
      ...data,
    })),
  reset: () => set(initialState),
}));


