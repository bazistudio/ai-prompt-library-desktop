import { useState, useEffect, useCallback, useRef } from "react";
import { updaterService } from "@/services/updaterService";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "error";

export interface AutoUpdaterState {
  status: UpdaterStatus;
  isTauri: boolean;
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  downloadProgress: number; // 0 to 100
  isModalOpen: boolean;
  error: string | null;
  dismissModal: () => void;
  installNow: () => Promise<void>;
}

export function useAutoUpdater(): AutoUpdaterState {
  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [currentVersion, setCurrentVersion] = useState<string>("1.0.2");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasCheckedRef = useRef(false);
  const isTauri = updaterService.isTauriRuntime();

  // Startup silent update check & background download
  useEffect(() => {
    if (!isTauri || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    let isMounted = true;

    async function runUpdateFlow() {
      try {
        const installedVer = await updaterService.getCurrentAppVersion();
        if (isMounted) setCurrentVersion(installedVer);

        if (isMounted) setStatus("checking");
        const updateInfo = await updaterService.checkForUpdate();

        if (!isMounted) return;

        if (!updateInfo || !updateInfo.available || !updateInfo.version) {
          setStatus("up-to-date");
          return;
        }

        // Update is available
        setStatus("available");
        setAvailableVersion(updateInfo.version);
        if (updateInfo.body) {
          setReleaseNotes(updateInfo.body);
        }

        // Begin silent background download
        setStatus("downloading");
        const success = await updaterService.downloadUpdate((downloaded, total) => {
          if (!isMounted) return;
          if (total && total > 0) {
            const pct = Math.min(100, Math.round((downloaded / total) * 100));
            setDownloadProgress(pct);
          }
        });

        if (!isMounted) return;

        if (success) {
          setStatus("downloaded");
          setDownloadProgress(100);
          setIsModalOpen(true);
        } else {
          setStatus("error");
          setError("Failed to download background update");
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Update check failed");
      }
    }

    // Delay by 2 seconds after mount to ensure UI renders smoothly without startup lag
    const timer = setTimeout(() => {
      runUpdateFlow();
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isTauri]);

  const dismissModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const installNow = useCallback(async () => {
    if (!isTauri) return;
    try {
      setStatus("installing");
      await updaterService.installAndRelaunch();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to install update");
    }
  }, [isTauri]);

  return {
    status,
    isTauri,
    currentVersion,
    availableVersion,
    releaseNotes,
    downloadProgress,
    isModalOpen,
    error,
    dismissModal,
    installNow,
  };
}
