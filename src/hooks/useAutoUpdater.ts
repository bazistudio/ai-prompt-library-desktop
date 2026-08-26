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
  manualMessage: string | null;
  isManualChecking: boolean;
  dismissModal: () => void;
  installNow: () => Promise<void>;
  checkForUpdatesManual: () => Promise<void>;
}

export function useAutoUpdater(): AutoUpdaterState {
  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [currentVersion, setCurrentVersion] = useState<string>("1.0.6");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [isManualChecking, setIsManualChecking] = useState<boolean>(false);

  const hasCheckedRef = useRef(false);
  const isTauri = updaterService.isTauriRuntime();

  // Initialize version on mount
  useEffect(() => {
    if (isTauri) {
      updaterService.getCurrentAppVersion().then((ver) => {
        if (ver) setCurrentVersion(ver);
      });
    }
  }, [isTauri]);

  const executeUpdateCheck = useCallback(async (isManual: boolean = false) => {
    if (!isTauri) {
      if (isManual) {
        setIsModalOpen(true);
        setManualMessage("Updates are only available in the installed desktop application.");
      }
      return;
    }

    if (isManual) {
      setIsModalOpen(true);
      setIsManualChecking(true);
      setManualMessage("Checking for updates from GitHub Releases...");
      setError(null);
    }

    setStatus("checking");

    // Timeout safety: 60 seconds search timeout
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 60000)
    );

    try {
      const checkPromise = updaterService.checkForUpdate();
      const result = await Promise.race([checkPromise, timeoutPromise]);

      if (result && "timeout" in result) {
        setStatus("up-to-date");
        setIsManualChecking(false);
        setManualMessage(`Search timed out. You are currently on v${currentVersion}.`);
        return;
      }

      const updateInfo = result;

      if (!updateInfo || !updateInfo.available || !updateInfo.version) {
        setStatus("up-to-date");
        setIsManualChecking(false);
        if (isManual) {
          setManualMessage(`Your application is already up to date (v${currentVersion}).`);
        }
        return;
      }

      // Update is available
      const nextVersion = updateInfo.version;
      setStatus("available");
      setAvailableVersion(nextVersion);
      if (updateInfo.body) {
        setReleaseNotes(updateInfo.body);
      }
      if (isManual) {
        setManualMessage(`New update available: v${nextVersion}. Starting background download...`);
      }

      // Begin background download with percentage progress
      setStatus("downloading");
      setDownloadProgress(10); // Start at 10%
      const success = await updaterService.downloadUpdate((downloaded, total) => {
        if (total && total > 0) {
          const rawPct = Math.round((downloaded / total) * 100);
          const pct = Math.max(10, Math.min(100, rawPct));
          setDownloadProgress(pct);
        }
      });

      setIsManualChecking(false);

      if (success) {
        setStatus("downloaded");
        setDownloadProgress(100);
        setIsModalOpen(true);
        if (isManual) {
          setManualMessage(`Update v${nextVersion} downloaded successfully. Ready to install!`);
        }
      } else {
        setStatus("error");
        setError("Failed to download update package.");
        if (isManual) {
          setManualMessage("Failed to download the update.");
        }
      }
    } catch (err) {
      setIsManualChecking(false);
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Update check failed";
      setError(msg);
      if (isManual) {
        setManualMessage(`Error checking for updates: ${msg}`);
      }
    }
  }, [isTauri, currentVersion]);

  // Startup silent update check (runs once 2s after startup)
  useEffect(() => {
    if (!isTauri || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const timer = setTimeout(() => {
      executeUpdateCheck(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isTauri, executeUpdateCheck]);

  // Listen to native desktop menu events (Help -> Check for Updates)
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("trigger-check-updates", () => {
        executeUpdateCheck(true);
      }).then((unsub) => {
        unlisten = unsub;
      });
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauri, executeUpdateCheck]);

  const checkForUpdatesManual = useCallback(async () => {
    await executeUpdateCheck(true);
  }, [executeUpdateCheck]);

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
    manualMessage,
    isManualChecking,
    dismissModal,
    installNow,
    checkForUpdatesManual,
  };
}

