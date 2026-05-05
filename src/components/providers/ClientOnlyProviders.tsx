"use client";

import dynamic from "next/dynamic";

const AppInit = dynamic(
  () => import("@/components/providers/AppInit").then((m) => ({ default: m.AppInit })),
  { ssr: false },
);

const OfflineBanner = dynamic(
  () => import("@/components/common/OfflineBanner").then((m) => ({ default: m.OfflineBanner })),
  { ssr: false },
);

export default function ClientOnlyProviders() {
  return (
    <>
      <AppInit />
      <OfflineBanner />
    </>
  );
}
