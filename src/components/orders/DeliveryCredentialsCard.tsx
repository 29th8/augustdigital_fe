"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, CheckCheck, Key, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TOAST } from "@/lib/toastMessages";
import type { DeliveryItem, DeliveryCredential } from "@/types/order";

// ─── Copy helper ──────────────────────────────────────────────────────────────

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(TOAST.COPIED);
  } catch {
    toast.error("Không thể sao chép.");
  }
}

function buildCopyAll(credential: DeliveryCredential): string {
  if (credential.type === "KEY") {
    return `Key: ${credential.key}`;
  }
  const lines = [
    `Email: ${credential.email}`,
    `Mật khẩu: ${credential.password}`,
  ];
  if (credential.profile) lines.push(`Profile: ${credential.profile}`);
  if (credential.pin) lines.push(`PIN: ${credential.pin}`);
  return lines.join("\n");
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors",
        className,
      )}
      title="Sao chép"
    >
      {copied ? (
        <CheckCheck className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function CredentialField({
  label,
  value,
  revealed,
  mono = true,
}: {
  label: string;
  value: string;
  revealed: boolean;
  mono?: boolean;
}) {
  const displayValue = revealed ? value : "••••••••••••";

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <span
        className={cn(
          "flex-1 text-sm text-gray-900 break-all select-all",
          mono && "font-mono",
          !revealed && "tracking-wider",
        )}
      >
        {displayValue}
      </span>
      <CopyButton value={value} />
    </div>
  );
}

// ─── Key credential layout ────────────────────────────────────────────────────

function KeyCredentialView({
  credential,
  revealed,
}: {
  credential: Extract<DeliveryCredential, { type: "KEY" }>;
  revealed: boolean;
}) {
  return (
    <div className="px-4">
      <CredentialField label="Key" value={credential.key} revealed={revealed} />
    </div>
  );
}

// ─── Account credential layout ────────────────────────────────────────────────

function AccountCredentialView({
  credential,
  revealed,
}: {
  credential: Extract<DeliveryCredential, { type: "ACCOUNT" }>;
  revealed: boolean;
}) {
  return (
    <div className="px-4 divide-y divide-gray-50">
      <CredentialField label="Email" value={credential.email} revealed={revealed} mono={false} />
      <CredentialField label="Mật khẩu" value={credential.password} revealed={revealed} />
      {credential.profile && (
        <CredentialField label="Profile" value={credential.profile} revealed={revealed} mono={false} />
      )}
      {credential.pin && (
        <CredentialField label="PIN" value={credential.pin} revealed={revealed} />
      )}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface DeliveryCredentialsCardProps {
  item: DeliveryItem;
  index?: number;
}

export default function DeliveryCredentialsCard({ item, index }: DeliveryCredentialsCardProps) {
  const [revealed, setRevealed] = useState(false);
  const isAccount = item.credential.type === "ACCOUNT";
  const Icon = isAccount ? User : Key;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 leading-tight">
              {index !== undefined ? `#${index + 1} — ` : ""}
              {item.productName}
            </span>
            <span className="text-xs text-gray-500">{item.variantName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copy all */}
          <button
            type="button"
            onClick={() => copyText(buildCopyAll(item.credential))}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Copy className="h-3 w-3" />
            <span>Copy tất cả</span>
          </button>

          {/* Reveal / hide */}
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
              revealed
                ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                : "text-blue-600 bg-blue-50 hover:bg-blue-100",
            )}
          >
            {revealed ? (
              <>
                <EyeOff className="h-3 w-3" />
                Ẩn
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Hiện
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn("py-2 transition-all", !revealed && "select-none")}>
        {item.credential.type === "KEY" ? (
          <KeyCredentialView credential={item.credential} revealed={revealed} />
        ) : (
          <AccountCredentialView credential={item.credential} revealed={revealed} />
        )}
      </div>

      {/* Footer: warranty status hint */}
      {item.warrantyStatus !== "NONE" && (
        <div className="px-4 py-2 border-t border-gray-50 bg-gray-50">
          <span className="text-xs text-gray-400">
            Bảo hành:{" "}
            <span
              className={cn(
                "font-medium",
                item.warrantyStatus === "CLAIMED" && "text-amber-600",
                item.warrantyStatus === "RESOLVED" && "text-green-600",
                item.warrantyStatus === "REJECTED" && "text-red-500",
              )}
            >
              {item.warrantyStatus === "CLAIMED" && "Đang xử lý"}
              {item.warrantyStatus === "RESOLVED" && "Đã giải quyết"}
              {item.warrantyStatus === "REJECTED" && "Từ chối"}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
