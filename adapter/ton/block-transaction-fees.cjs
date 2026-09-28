"use strict";

const { Cell } = require("@ton/core");
const MAX_BOC_BYTES = 16 * 1024 * 1024;
const MAX_DICTIONARY_NODES = 131072;

// Only the native currency is displayed. Consume the optional extra-currency
// reference without traversing a second, unrelated dictionary.
function nativeCoins(slice) {
  const coins = slice.loadCoins();
  if (slice.loadBit()) slice.loadRef();
  return coins;
}

// HashmapAug is not an ordinary @ton/core Dictionary: every node also carries
// a CurrencyCollection. Bound all account/transaction nodes with one budget.
function walkAug(slice, bits, leaf, budget, prefix = 0n) {
  if (--budget.nodes < 0) throw new Error("Block transaction dictionary exceeds bound");
  let length = 0, label = 0n;
  if (!slice.loadBit()) {
    while (slice.loadBit()) {
      if (++length > bits) throw new Error("Invalid transaction dictionary label");
    }
    if (length) label = slice.loadUintBig(length);
  } else if (!slice.loadBit()) {
    length = slice.loadUint(Math.ceil(Math.log2(bits + 1)));
    if (length > bits) throw new Error("Invalid transaction dictionary label");
    if (length) label = slice.loadUintBig(length);
  } else {
    const bit = slice.loadBit();
    length = slice.loadUint(Math.ceil(Math.log2(bits + 1)));
    if (length > bits) throw new Error("Invalid transaction dictionary label");
    if (bit) label = (1n << BigInt(length)) - 1n;
  }
  const key = (prefix << BigInt(length)) | label;
  const remaining = bits - length;
  if (!remaining) { nativeCoins(slice); return leaf(slice, key); }
  const left = slice.loadRef(), right = slice.loadRef();
  if (left.isExotic || right.isExotic) throw new Error("Incomplete transaction dictionary");
  nativeCoins(slice);
  return walkAug(left.beginParse(), remaining - 1, leaf, budget, key << 1n)
    + walkAug(right.beginParse(), remaining - 1, leaf, budget, (key << 1n) | 1n);
}

function summarize(fees) {
  fees.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const count = fees.length, middle = Math.floor(count / 2);
  const denominator = count % 2 ? 1n : 2n;
  const numerator = count ? count % 2 ? fees[middle] : fees[middle - 1] + fees[middle] : 0n;
  return {
    transactionCount: count, complete: true,
    total: fees.reduce((sum, fee) => sum + fee, 0n).toString(),
    min: count ? fees[0].toString() : null,
    max: count ? fees[count - 1].toString() : null,
    median: count ? (numerator / denominator).toString() : null,
    medianExact: count ? { remainder: (numerator % denominator).toString(), denominator: denominator.toString() } : null,
  };
}

function decodeAccountBlockTransactions(accounts) {
  const fees = [], budget = { nodes: MAX_DICTIONARY_NODES };
  let transactionCount = 0, complete = true;
  if (accounts.loadBit()) {
    const dictionary = accounts.loadRef();
    if (dictionary.isExotic) throw new Error("Incomplete account block dictionary");
    transactionCount = walkAug(dictionary.beginParse(), 256, (account, accountKey) => {
      if (account.loadUint(4) !== 5) throw new Error("Invalid AccountBlock tag");
      const address = account.loadUintBig(256);
      if (address !== accountKey) complete = false;
      return walkAug(account, 64, (transaction, logicalTime) => {
        const cell = transaction.loadRef();
        if (cell.isExotic) throw new Error("Incomplete Transaction leaf");
        const tx = cell.beginParse();
        if (tx.loadUint(4) !== 7) throw new Error("Invalid Transaction tag");
        try {
          if (tx.loadUintBig(256) !== address || tx.loadUintBig(64) !== logicalTime)
            throw new Error("Transaction identity does not match dictionary");
          // Transaction#0111 has a fixed prefix before total_fees. Reading only
          // that field avoids decoding messages, VM descriptions or payloads.
          tx.skip(256 + 64 + 32 + 15 + 2 + 2);
          tx.loadRef(); // in/out messages
          fees.push(nativeCoins(tx));
        } catch { complete = false; }
        return 1;
      }, budget);
    }, budget);
  }
  nativeCoins(accounts); // HashmapAugE root augmentation (also present if empty)
  return { transactionCount, transaction_fee_stats: complete ? summarize(fees) : null };
}

// Callers authenticate root/file hashes before using this optional enrichment.
function decodeBlockTransactionFees(data) {
  if (!Buffer.isBuffer(data) || !data.length || data.length > MAX_BOC_BYTES)
    throw new Error("Invalid transaction block BOC size");
  const roots = Cell.fromBoc(data);
  if (roots.length !== 1 || roots[0].isExotic) throw new Error("Invalid transaction block root");
  const block = roots[0].beginParse();
  if (block.loadUint(32) !== 0x11ef55aa) throw new Error("Invalid Block tag");
  block.skip(32); block.loadRef(); block.loadRef(); block.loadRef();
  const extraCell = block.loadRef();
  if (extraCell.isExotic) throw new Error("Incomplete BlockExtra");
  const extra = extraCell.beginParse();
  if (extra.loadUint(32) !== 0x4a33f6fd) throw new Error("Invalid BlockExtra tag");
  extra.loadRef(); extra.loadRef();
  const accounts = extra.loadRef();
  if (accounts.isExotic) throw new Error("Incomplete account blocks");
  return decodeAccountBlockTransactions(accounts.beginParse()).transaction_fee_stats;
}

function matchingTransactionFees(header, stats = header?.transaction_fee_stats) {
  const count = Number(header?.tx_quantity);
  return stats?.complete === true && /^\d+$/.test(String(header?.tx_quantity))
    && Number.isSafeInteger(count) && count === stats.transactionCount ? stats : null;
}

module.exports = { decodeAccountBlockTransactions, decodeBlockTransactionFees, matchingTransactionFees };
