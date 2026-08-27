import { isTauri } from "@tauri-apps/api/core";
import { check, Update, DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  version?: string;
  body?: string;
  date?: string;
}

export type DownloadProgressCallback = (downloadedBytes: number, totalBytes: number | null) => void;

class UpdaterService {
  private activeUpdate: Update | null = null;
  private isChecking = false;
  private isDownloading = false;

  /**
   * Safe check for whether the current environment is running inside Tauri Desktop
   */
  public isTauriRuntime(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return isTauri();
    } catch {
      return false;
    }
  }

  /**
   * Retrieves the currently installed application version
   */
  public async getCurrentAppVersion(): Promise<string> {
    if (!this.isTauriRuntime()) {
      return "2.0.0";
    }
    try {
      return await getVersion();
    } catch {
      return "2.0.0";
    }
  }

  /**
   * Checks for available updates from GitHub Releases manifest
   */
  public async checkForUpdate(): Promise<UpdateInfo | null> {
    if (!this.isTauriRuntime()) {
      return null;
    }

    if (this.isChecking) {
      return null;
    }

    this.isChecking = true;
    try {
      const update = await check();
      this.isChecking = false;

      if (!update) {
        const currentVersion = await this.getCurrentAppVersion();
        return {
          available: false,
          currentVersion,
        };
      }

      this.activeUpdate = update;
      return {
        available: true,
        currentVersion: update.currentVersion || (await this.getCurrentAppVersion()),
        version: update.version,
        body: update.body ?? undefined,
        date: update.date ?? undefined,
      };
    } catch (err) {
      this.isChecking = false;
      // Fail silently without crashing the app (offline, network glitch, or unreleased tag)
      console.warn("[Updater] Update check skipped or failed:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Downloads the update package in the background
   */
  public async downloadUpdate(onProgress?: DownloadProgressCallback): Promise<boolean> {
    if (!this.isTauriRuntime() || !this.activeUpdate) {
      return false;
    }

    if (this.isDownloading) {
      return false;
    }

    this.isDownloading = true;
    try {
      let downloaded = 0;
      let total: number | null = null;

      await this.activeUpdate.download((event: DownloadEvent) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null;
          downloaded = 0;
          if (onProgress) onProgress(downloaded, total);
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (onProgress) onProgress(downloaded, total);
        } else if (event.event === "Finished") {
          if (onProgress) onProgress(downloaded, total);
        }
      });

      this.isDownloading = false;
      return true;
    } catch (err) {
      this.isDownloading = false;
      console.warn("[Updater] Silent background download failed:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Installs the downloaded update and relaunches the application
   */
  public async installAndRelaunch(): Promise<void> {
    if (!this.isTauriRuntime() || !this.activeUpdate) {
      return;
    }

    try {
      await this.activeUpdate.install();
      await relaunch();
    } catch (err) {
      console.error("[Updater] Failed to install update and relaunch:", err);
      throw err;
    }
  }
}

export const updaterService = new UpdaterService();
