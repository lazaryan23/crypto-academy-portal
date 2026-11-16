const ETHEREUM: Record<string, string> = {
  "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance",
  "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance",
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance",
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance",
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase",
  "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase",
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": "Coinbase",
  "0xda9dfa130df4de4673b89022ee50ff26f6ea73cf": "Kraken",
  "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": "OKX",
  "0xf89d7b9c864f589bbf53a82105107622b35eaa40": "Bybit",
  "0xd24400ae8bfebb18ca49be86258a3c749cf46853": "Gemini",
  "0x6262998ced04146fa42253a5c0af90ca02dfd2a3": "Crypto.com",
};

const BITCOIN: Record<string, string> = {
  "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo": "Binance",
  bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97: "Bitfinex",
};

export function ethereumExchange(address: string | null | undefined) {
  return address ? (ETHEREUM[address.toLowerCase()] ?? null) : null;
}

export function bitcoinExchange(address: string | null | undefined) {
  return address ? (BITCOIN[address] ?? null) : null;
}
