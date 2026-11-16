import Link from "next/link";
import type { CSSProperties } from "react";
import classes from "./CryptoOrbit.module.css";

interface OrbitCoin {
  id: string;
  name: string;
  glyph: string;
  bg: string;
  shadow: string;
}

const outerCoins: OrbitCoin[] = [
  { id: "ethereum", name: "Ethereum", glyph: "Ξ", bg: "linear-gradient(135deg, #8aa2ff, #4e5fd8)", shadow: "rgba(98, 126, 234, 0.7)" },
  { id: "solana", name: "Solana", glyph: "◎", bg: "linear-gradient(135deg, #9945ff, #14f195)", shadow: "rgba(153, 69, 255, 0.7)" },
  { id: "the-open-network", name: "TON", glyph: "▽", bg: "linear-gradient(135deg, #3fc1ff, #0077c8)", shadow: "rgba(0, 152, 234, 0.7)" },
  { id: "binancecoin", name: "BNB", glyph: "◆", bg: "linear-gradient(135deg, #ffd666, #e0a100)", shadow: "rgba(243, 186, 47, 0.7)" },
  { id: "ripple", name: "XRP", glyph: "✕", bg: "linear-gradient(135deg, #5b6470, #23292f)", shadow: "rgba(120, 130, 145, 0.6)" },
  { id: "dogecoin", name: "Dogecoin", glyph: "Ð", bg: "linear-gradient(135deg, #e3c45c, #a8891e)", shadow: "rgba(194, 166, 51, 0.7)" },
];

const innerCoins: OrbitCoin[] = [
  { id: "cardano", name: "Cardano", glyph: "₳", bg: "linear-gradient(135deg, #3d6bff, #0033ad)", shadow: "rgba(0, 51, 173, 0.7)" },
  { id: "tether", name: "Tether", glyph: "₮", bg: "linear-gradient(135deg, #3dd6a3, #1a8a64)", shadow: "rgba(38, 161, 123, 0.7)" },
  { id: "chainlink", name: "Chainlink", glyph: "⬡", bg: "linear-gradient(135deg, #5a85ff, #2a5ada)", shadow: "rgba(42, 90, 218, 0.7)" },
];

const sparks = [
  { top: "8%", left: "22%", delay: "0s" },
  { top: "18%", left: "86%", delay: "0.8s" },
  { top: "82%", left: "12%", delay: "1.6s" },
  { top: "90%", left: "70%", delay: "0.4s" },
  { top: "48%", left: "2%", delay: "2.2s" },
];

function Orbit({ coins, radius, className }: { coins: OrbitCoin[]; radius: string; className: string }) {
  return (
    <div className={`${classes.ring} ${className}`}>
      {coins.map((coin, i) => (
        <div
          key={coin.id}
          className={classes.slot}
          style={{ "--angle": `${(360 / coins.length) * i}deg`, "--radius": radius } as CSSProperties}
        >
          <div className={classes.counter}>
            <Link
              href={`/crypto/${coin.id}`}
              className={classes.badge}
              aria-label={`${coin.name} price`}
              title={coin.name}
              style={{ "--coin-bg": coin.bg, "--coin-shadow": coin.shadow } as CSSProperties}
            >
              <span aria-hidden="true">{coin.glyph}</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CryptoOrbit() {
  return (
    <div className={classes.root}>
      {sparks.map((s) => (
        <span key={s.top + s.left} className={classes.spark} style={{ top: s.top, left: s.left, animationDelay: s.delay }} aria-hidden="true" />
      ))}
      <Orbit coins={outerCoins} radius="47cqw" className={classes.ringOuter} />
      <Orbit coins={innerCoins} radius="28cqw" className={classes.ringInner} />
      <Link href="/crypto/bitcoin" className={classes.center} aria-label="Bitcoin price" title="Bitcoin">
        <span aria-hidden="true">₿</span>
      </Link>
    </div>
  );
}
