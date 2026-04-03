import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from "../utils/capacitorBridge";

const PERMISSIONS_KEY = "writefy_permissions_asked";

interface PermissionManagerProps {
  onComplete: () => void;
}

type PermStatus = "granted" | "denied" | "default";

function statusLabel(s: PermStatus): string {
  if (s === "granted") return "Granted";
  if (s === "denied") return "Denied";
  return "Not Asked";
}

function statusVariant(s: PermStatus): "default" | "destructive" | "secondary" {
  if (s === "granted") return "default";
  if (s === "denied") return "destructive";
  return "secondary";
}

export function PermissionManager({ onComplete }: PermissionManagerProps) {
  const alreadyAsked =
    typeof localStorage !== "undefined" &&
    localStorage.getItem(PERMISSIONS_KEY) === "true";

  const [visible, setVisible] = useState(!alreadyAsked);
  const [notifPerm, setNotifPerm] = useState<PermStatus>(
    checkNotificationPermission,
  );
  const [requesting, setRequesting] = useState(false);

  // Re-check on visibility
  useEffect(() => {
    const update = () => setNotifPerm(checkNotificationPermission());
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, []);

  const handleRequestNotif = useCallback(async () => {
    setRequesting(true);
    const result = await requestNotificationPermission();
    setNotifPerm(result);
    setRequesting(false);
  }, []);

  const handleContinue = useCallback(() => {
    localStorage.setItem(PERMISSIONS_KEY, "true");
    setVisible(false);
    onComplete();
  }, [onComplete]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="perm-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "oklch(0.05 0 0 / 95%)" }}
        data-ocid="permissions.modal"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: "oklch(0.11 0 0)",
            border: "1px solid oklch(0.22 0 0)",
            boxShadow:
              "0 32px 80px oklch(0.0 0 0 / 60%), 0 0 0 1px oklch(0.18 0 0)",
          }}
        >
          {/* Header */}
          <div
            className="px-6 pt-7 pb-5"
            style={{ borderBottom: "1px solid oklch(0.18 0 0)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: "oklch(0.18 0 0)",
                  border: "1px solid oklch(0.25 0 0)",
                }}
              >
                🔐
              </div>
              <div>
                <h2
                  className="text-[18px] font-bold tracking-tight"
                  style={{ color: "oklch(0.95 0 0)" }}
                >
                  App Permissions
                </h2>
                <p className="text-[12px]" style={{ color: "oklch(0.45 0 0)" }}>
                  Writefy needs a few permissions to work correctly
                </p>
              </div>
            </div>
          </div>

          {/* Permissions List */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Notifications Row */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "oklch(0.14 0 0)",
                border: "1px solid oklch(0.20 0 0)",
              }}
              data-ocid="permissions.panel"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔔</span>
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: "oklch(0.88 0 0)" }}
                  >
                    Notifications
                  </span>
                </div>
                <Badge
                  variant={statusVariant(notifPerm)}
                  className="text-[10px] shrink-0"
                  style={{
                    background:
                      notifPerm === "granted"
                        ? "oklch(0.48 0.17 145)"
                        : notifPerm === "denied"
                          ? "oklch(0.50 0.22 20)"
                          : "oklch(0.22 0 0)",
                    color:
                      notifPerm === "default"
                        ? "oklch(0.65 0 0)"
                        : "oklch(0.97 0 0)",
                    border: "none",
                  }}
                  data-ocid="permissions.success_state"
                >
                  {statusLabel(notifPerm)}
                </Badge>
              </div>
              <p
                className="text-[12px] mb-3 leading-relaxed"
                style={{ color: "oklch(0.50 0 0)" }}
              >
                Receive autosave confirmations and writing reminders — even when
                Writefy is in the background.
              </p>
              {notifPerm !== "granted" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestNotif}
                  disabled={requesting || notifPerm === "denied"}
                  className="text-[12px] h-8"
                  style={{
                    background: "oklch(0.18 0 0)",
                    border: "1px solid oklch(0.28 0 0)",
                    color:
                      notifPerm === "denied"
                        ? "oklch(0.40 0 0)"
                        : "oklch(0.80 0 0)",
                    cursor: notifPerm === "denied" ? "not-allowed" : "pointer",
                  }}
                  data-ocid="permissions.primary_button"
                >
                  {requesting
                    ? "Requesting…"
                    : notifPerm === "denied"
                      ? "Blocked — enable in browser settings"
                      : "Request Notification Permission"}
                </Button>
              )}
              {notifPerm === "granted" && (
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: "oklch(0.55 0.17 145)" }}
                >
                  ✓ Notifications enabled
                </p>
              )}
            </div>

            {/* Storage Row */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "oklch(0.14 0 0)",
                border: "1px solid oklch(0.20 0 0)",
              }}
              data-ocid="permissions.card"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">💾</span>
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: "oklch(0.88 0 0)" }}
                  >
                    Storage Access
                  </span>
                </div>
                <Badge
                  className="text-[10px] shrink-0"
                  style={{
                    background: "oklch(0.48 0.17 145)",
                    color: "oklch(0.97 0 0)",
                    border: "none",
                  }}
                >
                  Granted
                </Badge>
              </div>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "oklch(0.50 0 0)" }}
              >
                Storage is managed by the browser (IndexedDB + localStorage).
                Optionally, link a local folder in{" "}
                <span
                  className="font-semibold"
                  style={{ color: "oklch(0.70 0 0)" }}
                >
                  Settings → Data &amp; Backup
                </span>{" "}
                for a hard file backup.
              </p>
            </div>

            {/* Offline / PWA note */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "oklch(0.13 0.03 255 / 60%)",
                border: "1px solid oklch(0.25 0.05 255 / 50%)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">📡</span>
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: "oklch(0.78 0.08 255)" }}
                >
                  Offline Ready
                </span>
              </div>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "oklch(0.52 0.04 255)" }}
              >
                Writefy is a Progressive Web App. All scripts are cached locally
                — the app loads instantly even in Airplane Mode.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-6 pb-6"
            style={{ borderTop: "1px solid oklch(0.17 0 0)" }}
          >
            <Button
              onClick={handleContinue}
              className="w-full h-11 text-[14px] font-semibold mt-5"
              style={{
                background: "oklch(0.55 0.18 145)",
                color: "oklch(0.97 0 0)",
                boxShadow: "0 0 18px oklch(0.55 0.18 145 / 30%)",
              }}
              data-ocid="permissions.confirm_button"
            >
              Continue to Writefy
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
