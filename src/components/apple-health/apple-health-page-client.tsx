"use client";

import { useRouter } from "next/navigation";
import { AppleHealthUploader } from "./apple-health-uploader";

interface AppleHealthPageClientProps {
  canWrite: boolean;
}

export function AppleHealthPageClient({
  canWrite,
}: AppleHealthPageClientProps) {
  const router = useRouter();
  return (
    <AppleHealthUploader
      canWrite={canWrite}
      onImported={() => router.refresh()}
    />
  );
}
