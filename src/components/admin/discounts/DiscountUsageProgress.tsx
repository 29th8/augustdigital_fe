// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscountUsageProgressProps {
  usedCount: number;
  usageLimit: number;
  remainingUses: number;
  size?: "sm" | "md";
  showLabels?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type ColorConfig = {
  track: string;
  fill: string;
  text: string;
};

function getColorConfig(percentage: number): ColorConfig {
  if (percentage >= 100) {
    return { track: "bg-gray-100", fill: "bg-red-500", text: "text-red-600" };
  }
  if (percentage >= 80) {
    return { track: "bg-gray-100", fill: "bg-red-500", text: "text-red-600" };
  }
  if (percentage >= 50) {
    return {
      track: "bg-gray-100",
      fill: "bg-amber-500",
      text: "text-amber-600",
    };
  }
  return {
    track: "bg-gray-100",
    fill: "bg-green-500",
    text: "text-green-600",
  };
}

const BAR_HEIGHT = {
  sm: "h-1.5",
  md: "h-2",
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function DiscountUsageProgress({
  usedCount,
  usageLimit,
  remainingUses: _remainingUses,
  size = "md",
  showLabels = true,
}: DiscountUsageProgressProps) {
  const percentage =
    usageLimit === 0
      ? 0
      : Math.min(Math.round((usedCount / usageLimit) * 100), 100);

  const { track, fill, text } = getColorConfig(percentage);
  const barHeight = BAR_HEIGHT[size];

  return (
    <div className="w-full space-y-1">
      {showLabels && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {usedCount} / {usageLimit}
          </span>
          <span className={`text-xs font-medium ${text}`}>{percentage}%</span>
        </div>
      )}

      <div
        className={`w-full rounded-full ${barHeight} ${track} overflow-hidden`}
        role="progressbar"
        aria-valuenow={usedCount}
        aria-valuemin={0}
        aria-valuemax={usageLimit}
        aria-label={`${usedCount} of ${usageLimit} uses`}
      >
        <div
          className={`${barHeight} rounded-full ${fill} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
