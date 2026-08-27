"use client";

import { useEffect, useState, useRef } from "react";
import { SettingsSection } from "./SettingsSection";
import { SettingRow } from "./SettingRow";
import {
  User,
  Shield,
  KeyRound,
  Lock,
  RefreshCw,
  Copy,
  Check,
  Download,
  AlertCircle,
  PlusCircle,
  Eye,
  EyeOff,
  Camera,
  Upload,
  Trash2,
  ZoomIn,
  Move,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Building,
  UserCheck,
  Save,
} from "lucide-react";

import { SecurityStatusData } from "@/types/electron";
import {
  fetchLicenseStatus,
  activateLicense,
  deactivateLicense,
} from "@/services/licensing/licenseService";
import { LicenseInfo, DEFAULT_FREE_LICENSE } from "@/services/licensing/licenseVerifier";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  status: string;
  createdAt?: string;
}

export function AccountSettings() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem("ai_prompt_library_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          id: "local",
          username: parsed.username || "Developer",
          email: parsed.email || "developer@example.com",
          status: "Active",
        };
      }
    } catch {}
    return {
      id: "local",
      username: "Developer",
      email: "developer@example.com",
      status: "Active",
    };
  });

  const [editUsername, setEditUsername] = useState(profile.username);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [loading, setLoading] = useState(false);

  // Security Status
  const [secStatus, setSecStatus] = useState<SecurityStatusData | null>(null);

  // Avatar Management & Adjuster Modal
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ai_prompt_library_user_avatar");
    } catch {
      return null;
    }
  });

  const [rawAvatarSrc, setRawAvatarSrc] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // PIN Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinPassword, setPinPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPinPass, setShowPinPass] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Remove Password Modal State
  const [showRemovePasswordModal, setShowRemovePasswordModal] = useState(false);
  const [removePasswordInput, setRemovePasswordInput] = useState("");
  const [removePasswordLoading, setRemovePasswordLoading] = useState(false);
  const [removePasswordMsg, setRemovePasswordMsg] = useState<{ type: "error"; text: string } | null>(null);

  // Remove PIN Modal State
  const [showRemovePinModal, setShowRemovePinModal] = useState(false);
  const [removePinInput, setRemovePinInput] = useState("");
  const [removePinLoading, setRemovePinLoading] = useState(false);
  const [removePinMsg, setRemovePinMsg] = useState<{ type: "error"; text: string } | null>(null);

  // Recovery Key Display Modal
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // License State in Account Settings
  const [license, setLicense] = useState<LicenseInfo>(DEFAULT_FREE_LICENSE);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [guardWarning, setGuardWarning] = useState<string | null>(null);

  // Fetch unified security status
  const fetchSecurityStatus = async () => {
    if (typeof window !== "undefined" && window.electronAPI?.security) {
      try {
        const res = await window.electronAPI.security.getStatus();
        setSecStatus(res);
        return;
      } catch (err) {
        console.error("Failed to get security status from electron:", err);
      }
    }

    // Local / Desktop Fallback
    if (typeof window !== "undefined") {
      const hasPass = Boolean(
        localStorage.getItem("appLockPasswordPlain") ||
        localStorage.getItem("appLockPassword") ||
        localStorage.getItem("appLockPasswordHash")
      );
      const hasPin = Boolean(
        localStorage.getItem("appLockPinPlain") ||
        localStorage.getItem("appLockPin") ||
        localStorage.getItem("appLockPinHash")
      );
      const enabled = localStorage.getItem("appLockEnabled") === "true" || (hasPass || hasPin);
      const isLocked = localStorage.getItem("ai_prompt_library_is_locked") === "true";
      const method = (localStorage.getItem("appLockMethod") as "password" | "pin") || (hasPin && !hasPass ? "pin" : "password");
      const hasKey = Boolean(localStorage.getItem("appLockRecoveryKey"));

      setSecStatus({
        enabled: enabled && (hasPass || hasPin),
        method,
        requireStartup: localStorage.getItem("appLockRequireStartup") === "true",
        isLocked,
        hasPassword: hasPass,
        hasPin,
        hasRecoveryKey: hasKey,
        hasSecurityQuestions: false,
        lockoutRemainingSeconds: 0,
      });
    }
  };

  const loadLicenseData = async () => {
    try {
      const data = await fetchLicenseStatus();
      setLicense(data);
    } catch (err) {
      console.error("Failed to load license:", err);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    loadLicenseData();

    const handleLockStateChange = () => fetchSecurityStatus();
    window.addEventListener("app:lock-state-changed", handleLockStateChange);
    window.addEventListener("storage", handleLockStateChange);
    return () => {
      window.removeEventListener("app:lock-state-changed", handleLockStateChange);
      window.removeEventListener("storage", handleLockStateChange);
    };
  }, []);

  // Save User Profile Information
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...profile,
      username: editUsername.trim() || "Developer",
      email: editEmail.trim() || "developer@example.com",
    };
    setProfile(updated);
    try {
      localStorage.setItem("ai_prompt_library_user_profile", JSON.stringify({
        username: updated.username,
        email: updated.email,
      }));
      window.dispatchEvent(new CustomEvent("app:user-profile-updated", { detail: updated }));
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 2500);
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  // Avatar Selection & Adjuster Handlers
  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Image size should be under 8MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setRawAvatarSrc(dataUrl);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setShowAdjustModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Render Cropped & Position-Adjusted Avatar to Canvas
  const handleApplyAdjustedAvatar = () => {
    if (!rawAvatarSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw adjusted image onto square canvas
      ctx.clearRect(0, 0, size, size);

      const aspect = img.width / img.height;
      let drawWidth = size * zoom;
      let drawHeight = size * zoom;

      if (aspect > 1) {
        drawHeight = (size / aspect) * zoom;
      } else {
        drawWidth = size * aspect * zoom;
      }

      const drawX = (size - drawWidth) / 2 + panX * 2;
      const drawY = (size - drawHeight) / 2 + panY * 2;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      const finalDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setAvatarUrl(finalDataUrl);
      setShowAdjustModal(false);
      setRawAvatarSrc(null);

      try {
        localStorage.setItem("ai_prompt_library_user_avatar", finalDataUrl);
        window.dispatchEvent(new CustomEvent("user-avatar-updated", { detail: finalDataUrl }));
      } catch (err) {
        console.error("Failed to save avatar:", err);
      }
    };
    img.src = rawAvatarSrc;
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    try {
      localStorage.removeItem("ai_prompt_library_user_avatar");
      window.dispatchEvent(new CustomEvent("user-avatar-updated", { detail: null }));
    } catch (err) {
      console.error("Failed to remove avatar:", err);
    }
  };

  // Lock & Security Handlers
  const handleToggleLock = async (targetEnabled: boolean) => {
    setGuardWarning(null);

    if (targetEnabled && (!secStatus?.hasPassword && !secStatus?.hasPin)) {
      setGuardWarning("You need to configure an application password or PIN first before enabling Application Lock.");
      setShowPasswordModal(true);
      return;
    }

    if (window.electronAPI?.security) {
      await window.electronAPI.security.toggleLock(targetEnabled);
    } else {
      localStorage.setItem("appLockEnabled", targetEnabled ? "true" : "false");
      window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
    }
    await fetchSecurityStatus();
  };

  const handleSetLockMethod = async (method: "password" | "pin") => {
    if (method === "pin" && (!secStatus || !secStatus.hasPin)) {
      setShowPinModal(true);
      return;
    }
    if (window.electronAPI?.security) {
      await window.electronAPI.security.setLockMethod(method);
    } else {
      localStorage.setItem("appLockMethod", method);
      window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
    }
    await fetchSecurityStatus();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    const isCreating = !secStatus?.hasPassword;

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (!isCreating && !currentPassword) {
      const storedPass = localStorage.getItem("appLockPasswordPlain") || localStorage.getItem("appLockPassword");
      if (storedPass && storedPass !== currentPassword) {
        setPasswordMsg({ type: "error", text: "Current password does not match." });
        return;
      }
    }

    setPasswordLoading(true);
    try {
      if (window.electronAPI?.security) {
        const res = await window.electronAPI.security.changePassword(
          isCreating ? undefined : currentPassword,
          newPassword
        );
        if (res.success) {
          setPasswordMsg({ type: "success", text: isCreating ? "Password created successfully!" : "Password changed successfully!" });
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setTimeout(() => setShowPasswordModal(false), 1000);
          await fetchSecurityStatus();
        } else {
          setPasswordMsg({ type: "error", text: res.error || "Failed to update password." });
        }
      } else {
        // Local persistence
        localStorage.setItem("appLockPasswordPlain", newPassword);
        localStorage.setItem("appLockPassword", newPassword);
        localStorage.setItem("appLockPasswordHash", "local_hash_" + Date.now());
        localStorage.setItem("appLockEnabled", "true");
        localStorage.setItem("appLockMethod", "password");

        // Generate initial recovery key if not exists
        if (!localStorage.getItem("appLockRecoveryKey")) {
          const sampleKey = "APL7-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" +
            Math.random().toString(36).substring(2, 6).toUpperCase() + "-" +
            Math.random().toString(36).substring(2, 6).toUpperCase() + "-" +
            Math.random().toString(36).substring(2, 6).toUpperCase();
          localStorage.setItem("appLockRecoveryKey", sampleKey);
        }

        setPasswordMsg({ type: "success", text: isCreating ? "Password created and activated!" : "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setGuardWarning(null);
        window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
        setTimeout(() => setShowPasswordModal(false), 1000);
        await fetchSecurityStatus();
      }
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.message || "An error occurred." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (!/^\d{6}$/.test(newPin)) {
      setPinMsg({ type: "error", text: "PIN must be exactly 6 digits." });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ type: "error", text: "PINs do not match." });
      return;
    }

    setPinLoading(true);
    try {
      if (window.electronAPI?.security) {
        const res = await window.electronAPI.security.setupPin(pinPassword, newPin);
        if (res.success) {
          setPinMsg({ type: "success", text: "6-Digit PIN configured!" });
          setPinPassword("");
          setNewPin("");
          setConfirmPin("");
          setTimeout(() => setShowPinModal(false), 1000);
          await fetchSecurityStatus();
        } else {
          setPinMsg({ type: "error", text: res.error || "Failed to setup PIN." });
        }
      } else {
        localStorage.setItem("appLockPinPlain", newPin);
        localStorage.setItem("appLockPin", newPin);
        localStorage.setItem("appLockPinHash", "local_pin_" + Date.now());
        localStorage.setItem("appLockMethod", "pin");
        localStorage.setItem("appLockEnabled", "true");

        setPinMsg({ type: "success", text: "6-Digit PIN configured and active!" });
        setPinPassword("");
        setNewPin("");
        setConfirmPin("");
        window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
        setTimeout(() => setShowPinModal(false), 1000);
        await fetchSecurityStatus();
      }
    } catch (err: any) {
      setPinMsg({ type: "error", text: err?.message || "Error configuring PIN." });
    } finally {
      setPinLoading(false);
    }
  };

  const handleRemovePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemovePasswordMsg(null);

    if (!removePasswordInput) {
      setRemovePasswordMsg({ type: "error", text: "Current password is required." });
      return;
    }

    setRemovePasswordLoading(true);
    try {
      if (window.electronAPI?.security) {
        const res = await window.electronAPI.security.removePassword(removePasswordInput);
        if (res.success) {
          setRemovePasswordInput("");
          setShowRemovePasswordModal(false);
          await fetchSecurityStatus();
        } else {
          setRemovePasswordMsg({ type: "error", text: res.error || "Failed to remove password." });
        }
      } else {
        const stored = localStorage.getItem("appLockPasswordPlain") || localStorage.getItem("appLockPassword");
        if (stored && stored !== removePasswordInput) {
          setRemovePasswordMsg({ type: "error", text: "Incorrect password." });
          return;
        }
        localStorage.removeItem("appLockPasswordPlain");
        localStorage.removeItem("appLockPassword");
        localStorage.removeItem("appLockPasswordHash");
        if (!localStorage.getItem("appLockPinPlain")) {
          localStorage.setItem("appLockEnabled", "false");
        }
        setRemovePasswordInput("");
        setShowRemovePasswordModal(false);
        window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
        await fetchSecurityStatus();
      }
    } catch (err: any) {
      setRemovePasswordMsg({ type: "error", text: err?.message || "An error occurred." });
    } finally {
      setRemovePasswordLoading(false);
    }
  };

  const handleRemovePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemovePinMsg(null);

    if (!removePinInput) {
      setRemovePinMsg({ type: "error", text: "Current PIN is required." });
      return;
    }

    setRemovePinLoading(true);
    try {
      if (window.electronAPI?.security) {
        const res = await window.electronAPI.security.removePin(removePinInput);
        if (res.success) {
          setRemovePinInput("");
          setShowRemovePinModal(false);
          await fetchSecurityStatus();
        } else {
          setRemovePinMsg({ type: "error", text: res.error || "Failed to remove PIN." });
        }
      } else {
        const stored = localStorage.getItem("appLockPinPlain") || localStorage.getItem("appLockPin");
        if (stored && stored !== removePinInput) {
          setRemovePinMsg({ type: "error", text: "Incorrect PIN." });
          return;
        }
        localStorage.removeItem("appLockPinPlain");
        localStorage.removeItem("appLockPin");
        localStorage.removeItem("appLockPinHash");
        if (!localStorage.getItem("appLockPasswordPlain")) {
          localStorage.setItem("appLockEnabled", "false");
        } else {
          localStorage.setItem("appLockMethod", "password");
        }
        setRemovePinInput("");
        setShowRemovePinModal(false);
        window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
        await fetchSecurityStatus();
      }
    } catch (err: any) {
      setRemovePinMsg({ type: "error", text: err?.message || "An error occurred." });
    } finally {
      setRemovePinLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    setRecoveryLoading(true);
    try {
      if (window.electronAPI?.security) {
        const res = await window.electronAPI.security.generateRecoveryKey();
        if (res.success && res.recoveryKey) {
          setGeneratedKey(res.recoveryKey);
          setShowRecoveryModal(true);
          await fetchSecurityStatus();
        }
      } else {
        const newKey = "APL7-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" +
          Math.random().toString(36).substring(2, 6).toUpperCase() + "-" +
          Math.random().toString(36).substring(2, 6).toUpperCase() + "-" +
          Math.random().toString(36).substring(2, 6).toUpperCase();
        localStorage.setItem("appLockRecoveryKey", newKey);
        setGeneratedKey(newKey);
        setShowRecoveryModal(true);
        window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
        await fetchSecurityStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecoveryLoading(false);
    }
  };

  // License Activation Handler
  const handleActivateLicenseInAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      setLicenseMsg({ type: "error", text: "Please enter a valid license key or token." });
      return;
    }

    setActivatingLicense(true);
    setLicenseMsg(null);
    try {
      const res = await activateLicense(licenseKeyInput.trim());
      if (res.success && res.license) {
        setLicense(res.license);
        setLicenseKeyInput("");
        setLicenseMsg({
          type: "success",
          text: `Activated ${res.license.edition.toUpperCase()} edition! All offline features verified.`,
        });
      } else {
        setLicenseMsg({ type: "error", text: res.error || "License verification failed. Signature mismatch." });
      }
    } catch (err: any) {
      setLicenseMsg({ type: "error", text: err?.message || "Activation error." });
    } finally {
      setActivatingLicense(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl text-left">
      {/* 1. Account Profile Details */}
      <SettingsSection
        title="Profile Information"
        description="Personal account parameters retrieved from local workspace authentication session."
      >
        <div className="glass-card p-5 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary overflow-hidden shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-primary" />
                )}
              </div>
              <label
                htmlFor="avatar-file-input"
                className="absolute inset-0 bg-black/50 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                title="Upload & Adjust Profile Photo"
              >
                <Camera className="h-5 w-5" />
              </label>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelected}
                className="hidden"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground">
                {profile.username}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {profile.email}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <label
                  htmlFor="avatar-file-input"
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  <span>{avatarUrl ? "Change & Adjust Photo" : "Upload Photo"}</span>
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-[11px] font-semibold text-danger hover:underline cursor-pointer flex items-center gap-1 bg-danger/10 hover:bg-danger/20 px-2.5 py-1 rounded-lg border border-danger/20 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-status-online text-status-online-foreground capitalize self-start sm:self-center">
            {profile.status}
          </span>
        </div>

        {/* Editable Username and Email Form */}
        <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
          {profileSavedMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Profile details updated and saved successfully!</span>
            </div>
          )}

          <SettingRow title="Username" description="Your unique developer workspace handle.">
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="e.g. PromptEngineer"
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary w-48 text-right"
            />
          </SettingRow>

          <SettingRow title="Email Address" description="Primary account email used for sign in and receipts.">
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="e.g. dev@example.com"
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary w-56 text-right font-mono"
            />
          </SettingRow>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Profile Details</span>
            </button>
          </div>
        </form>
      </SettingsSection>

      {/* 2. License Activation & Product Status Section */}
      <SettingsSection
        title="License & Product Activation"
        description="Activate your offline commercial license key to unlock advanced features."
      >
        <div className="p-4 rounded-2xl border border-border bg-card/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  {license.edition === "free" ? "Free Community License" : `${license.edition.toUpperCase()} License`}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Status: <strong className={license.status === "ACTIVE" ? "text-emerald-500" : "text-foreground"}>{license.status}</strong>
                  {license.licensee && ` • Registered to: ${license.licensee}`}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground border border-border">
              {license.edition.toUpperCase()}
            </span>
          </div>

          {licenseMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              licenseMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}>
              {licenseMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{licenseMsg.text}</span>
            </div>
          )}

          {/* Direct Activation Form */}
          <form onSubmit={handleActivateLicenseInAccount} className="pt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
              placeholder="Enter cryptographic activation token..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={activatingLicense || !licenseKeyInput.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
            >
              {activatingLicense ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              <span>Activate Key</span>
            </button>
          </form>
        </div>
      </SettingsSection>

      {/* 3. Application Security & Lock */}
      <SettingsSection
        title="Application Security"
        description="Configure your application password, application lock, and emergency recovery key."
      >
        {guardWarning && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{guardWarning}</span>
          </div>
        )}

        {/* Lock Application Toggle */}
        <SettingRow
          title="Enable Application Lock"
          description="Require password or PIN authentication to access workspace prompts."
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={secStatus?.enabled ?? false}
              onChange={(e) => handleToggleLock(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </SettingRow>

        {/* Lock Method */}
        {secStatus?.enabled && (
          <SettingRow
            title="Authentication Method"
            description="Select whether you prefer a password or a 6-digit numeric PIN."
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetLockMethod("password")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  secStatus?.method === "password"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => handleSetLockMethod("pin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  secStatus?.method === "pin"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                6-Digit PIN
              </button>
            </div>
          </SettingRow>
        )}

        {/* Password Management Row */}
        <SettingRow
          title="Application Password"
          description={secStatus?.hasPassword ? "Password is configured and active." : "No application password configured."}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPasswordMsg(null);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowPasswordModal(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              {secStatus?.hasPassword ? "Change Password" : "Create Password"}
            </button>
            {secStatus?.hasPassword && (
              <button
                type="button"
                onClick={() => {
                  setRemovePasswordMsg(null);
                  setRemovePasswordInput("");
                  setShowRemovePasswordModal(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/10 hover:bg-danger/20 text-xs font-semibold text-danger transition-colors cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        </SettingRow>

        {/* PIN Management Row */}
        <SettingRow
          title="6-Digit PIN"
          description={secStatus?.hasPin ? "PIN is configured and active." : "Quick unlock 6-digit numeric PIN."}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPinMsg(null);
                setPinPassword("");
                setNewPin("");
                setConfirmPin("");
                setShowPinModal(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              {secStatus?.hasPin ? "Change PIN" : "Setup PIN"}
            </button>
            {secStatus?.hasPin && (
              <button
                type="button"
                onClick={() => {
                  setRemovePinMsg(null);
                  setRemovePinInput("");
                  setShowRemovePinModal(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/10 hover:bg-danger/20 text-xs font-semibold text-danger transition-colors cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        </SettingRow>

        {/* Emergency Recovery Key Row */}
        <SettingRow
          title="Emergency Recovery Key"
          description="24-character key used to regain workspace access if you forget your password."
        >
          <button
            type="button"
            onClick={handleRegenerateKey}
            disabled={recoveryLoading}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {recoveryLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 text-warning" />}
            <span>View / Regenerate Key</span>
          </button>
        </SettingRow>
      </SettingsSection>

      {/* Avatar Position Adjuster & Cropper Modal */}
      {showAdjustModal && rawAvatarSrc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-3xl border border-primary/20 shadow-2xl bg-card space-y-4 text-left">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <span>Adjust & Position Avatar Photo</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Zoom and drag sliders to perfectly position your profile picture before saving.
            </p>

            {/* Circular Preview Viewport */}
            <div className="flex items-center justify-center py-4">
              <div className="w-48 h-48 rounded-full border-4 border-primary/40 overflow-hidden relative shadow-inner bg-black/20 flex items-center justify-center">
                <div
                  className="w-full h-full relative"
                  style={{
                    transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                    transition: "transform 0.05s ease-out",
                  }}
                >
                  <img
                    src={rawAvatarSrc}
                    alt="Adjusting Avatar"
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Controls: Zoom & Pan */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                  <span className="flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5 text-primary" /> Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                  <span className="flex items-center gap-1"><Move className="h-3.5 w-3.5 text-primary" /> Horizontal Position (X)</span>
                  <span>{panX}px</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={panX}
                  onChange={(e) => setPanX(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                  <span className="flex items-center gap-1"><Move className="h-3.5 w-3.5 text-primary" /> Vertical Position (Y)</span>
                  <span>{panY}px</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={panY}
                  onChange={(e) => setPanY(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowAdjustModal(false);
                  setRawAvatarSrc(null);
                }}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAdjustedAvatar}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Apply & Save Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-border shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-bold text-foreground">
              {secStatus?.hasPassword ? "Change Application Password" : "Create Application Password"}
            </h3>

            {passwordMsg && (
              <div className={`p-3 rounded-xl text-xs ${passwordMsg.type === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-danger/10 text-danger"}`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              {secStatus?.hasPassword && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {passwordLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-border shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-bold text-foreground">
              {secStatus?.hasPin ? "Change 6-Digit PIN" : "Configure 6-Digit Numeric PIN"}
            </h3>

            {pinMsg && (
              <div className={`p-3 rounded-xl text-xs ${pinMsg.type === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-danger/10 text-danger"}`}>
                {pinMsg.text}
              </div>
            )}

            <form onSubmit={handleSetupPinSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">New 6-Digit PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-mono text-center tracking-widest"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Confirm 6-Digit PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-mono text-center tracking-widest"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinLoading || newPin.length !== 6 || newPin !== confirmPin}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {pinLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Save PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Password Modal */}
      {showRemovePasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-border shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-bold text-foreground">Remove Application Password</h3>
            {removePasswordMsg && (
              <div className="p-3 bg-danger/10 text-danger text-xs rounded-xl">{removePasswordMsg.text}</div>
            )}
            <form onSubmit={handleRemovePasswordSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Enter current password to confirm</label>
                <input
                  type="password"
                  value={removePasswordInput}
                  onChange={(e) => setRemovePasswordInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemovePasswordModal(false)}
                  className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={removePasswordLoading}
                  className="px-4 py-2 rounded-lg bg-danger text-white text-xs font-bold hover:bg-danger/90 transition-colors cursor-pointer"
                >
                  Remove Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove PIN Modal */}
      {showRemovePinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-border shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-bold text-foreground">Remove 6-Digit PIN</h3>
            {removePinMsg && (
              <div className="p-3 bg-danger/10 text-danger text-xs rounded-xl">{removePinMsg.text}</div>
            )}
            <form onSubmit={handleRemovePinSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Enter current PIN to confirm</label>
                <input
                  type="password"
                  value={removePinInput}
                  onChange={(e) => setRemovePinInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-mono text-center tracking-widest"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemovePinModal(false)}
                  className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={removePinLoading}
                  className="px-4 py-2 rounded-lg bg-danger text-white text-xs font-bold hover:bg-danger/90 transition-colors cursor-pointer"
                >
                  Remove PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Recovery Key Modal */}
      {showRecoveryModal && generatedKey && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-warning/30 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning/10 text-warning border border-warning/20">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Emergency Recovery Key</h3>
                <p className="text-xs text-muted-foreground">Save this key in a secure location.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/60 border border-border font-mono text-sm font-bold text-center tracking-wider text-primary select-all">
              {generatedKey}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey ? "Copied" : "Copy Key"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
