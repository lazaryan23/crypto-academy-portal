import { getChainFees } from "@/lib/chain-fees";
import { ChainFeesBoard } from "./ChainFeesBoard";

export async function ChainFeesSection({ title = true }: { title?: boolean }) {
  const snapshot = await getChainFees();
  if (!snapshot.chains.length) return null;
  return <ChainFeesBoard initial={snapshot} title={title} />;
}
