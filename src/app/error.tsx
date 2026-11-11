"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/common/ErrorState";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      title="Something went wrong"
      message="We couldn't load this page. Market data may be temporarily unavailable."
      onRetry={retry}
    />
  );
}
