"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/common/ErrorState";

export default function CoinError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      title="Couldn't load this coin"
      message="The market data provider didn't respond (it may be rate limiting requests). Please try again in a moment."
      onRetry={retry}
    />
  );
}
