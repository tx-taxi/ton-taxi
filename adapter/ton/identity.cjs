"use strict";
const { ProviderError } = require("./provider.cjs");
function address(value) {
  if (/^-?\d+:[a-fA-F0-9]{64}$/.test(value)) {
    const [wc, hash] = value.split(":");
    if (Number(wc) < -128 || Number(wc) > 127)
      throw new ProviderError("Invalid address", 400);
    return `${Number(wc)}:${hash.toLowerCase()}`;
  }
  if (!/^[A-Za-z0-9_+/-]{48}$/.test(value))
    throw new ProviderError("Invalid address", 400);
  const b = Buffer.from(value, "base64url");
  if (b.length !== 36) throw new ProviderError("Invalid address", 400);
  let crc = 0;
  for (const byte of b.subarray(0, 34)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  if (b.readUInt16BE(34) !== crc || ![0x11, 0x51, 0x91, 0xd1].includes(b[0]))
    throw new ProviderError("Invalid address", 400);
  if (b[0] & 0x80) throw new ProviderError("Testnet address", 400);
  return `${b.readInt8(1)}:${b.subarray(2, 34).toString("hex")}`;
}
function input(value) {
  value = value.trim();
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (
      ![
        "tonviewer.com",
        "www.tonviewer.com",
        "tonscan.org",
        "www.tonscan.org",
        "ton.tx.taxi",
      ].includes(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.port
    )
      throw new ProviderError("Unsupported URL", 400);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 1) value = decodeURIComponent(parts[0]);
    else if (
      parts.length === 2 &&
      [
        "transaction",
        "tx",
        "address",
        "block",
        "nft",
        "collection",
        "jetton",
      ].includes(parts[0])
    )
      value = decodeURIComponent(parts[1]);
    else throw new ProviderError("Unsupported URL", 400);
  }
  if (/^[A-Za-z0-9_+/-]{43}=?$/.test(value))
    value = Buffer.from(value, "base64url").toString("hex");
  return value;
}
module.exports = { address, input };
