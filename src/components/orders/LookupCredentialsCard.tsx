"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, CheckCheck, Key } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TOAST } from "@/lib/toastMessages";
import type { LookupDelivery } from "@/types/order";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedField {
  label: string;
  value: string;
  isSensitive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SENSITIVE_PATTERNS = [
  /^(password|mật\s*khẩu|pass|pin|secret|token|key|mã)$/i,
];

function isSensitiveLabel(label: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(label.trim()));
}

function parseCredentialString(raw: string): ParsedField {
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) {
    return { label: "", value: raw, isSensitive: false };
  }
  const label = raw.slice(0, colonIdx).trim();
  const value = raw.slice(colonIdx + 1).trim();
  return { label, value, isSensitive: isSensitiveLabel(label) };
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(TOAST.COPIED);
  } catch {
    toast.error("Không thể sao chép.");
  }
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

// ─── FieldRow ─────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  globalRevealed,
}: {
  field: ParsedField;
  globalRevealed: boolean;
}) {
  const [localRevealed, setLocalRevealed] = useState(false);
  const revealed = !field.isSensitive || globalRevealed || localRevealed;
  const displayValue = revealed ? field.value : "••••••••••••";

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      {field.label ? (
        <span className="text-xs text-gray-500 w-24 shrink-0">{field.label}</span>
      ) : null}
      <span
        className={cn(
          "flex-1 text-sm text-gray-900 break-all select-all font-mono",
          !revealed && "tracking-wider",
        )}
      >
        {displayValue}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        {field.isSensitive && (
          <button
            type="button"
            onClick={() => setLocalRevealed((v) => !v)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={localRevealed ? "Ẩn" : "Hiện"}
          >
            {localRevealed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <CopyButton value={field.value} />
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export interface LookupCredentialsCardProps {
  delivery: LookupDelivery;
  index?: number;
}

export default function LookupCredentialsCard({ delivery, index }: LookupCredentialsCardProps) {
  const [revealed, setRevealed] = useState(false);
  const fields = delivery.credentials.map(parseCredentialString);
  const hasSensitive = fields.some((f) => f.isSensitive);
  const copyAllText = delivery.credentials.join("\n");

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Key className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-900 leading-tight">
            {index !== undefined ? `#${index + 1} — ` : ""}
            {delivery.productName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copy all */}
          <button
            type="button"
            onClick={() => copyText(copyAllText)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Copy className="h-3 w-3" />
            <span>Copy tất cả</span>
          </button>

          {/* Reveal / hide (only if there are sensitive fields) */}
          {hasSensitive && (
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
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("px-4 py-2 divide-y divide-gray-50", !revealed && hasSensitive && "select-none")}>
        {fields.map((field, i) => (
          <FieldRow key={i} field={field} globalRevealed={revealed} />
        ))}
      </div>
    </div>
  );
}
