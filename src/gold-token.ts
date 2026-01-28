import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/GoldToken/GoldToken";
import { TokenHolder, TokenStats, Transfer, UserActivity } from "../generated/schema";
import { updateDailyTransfer } from "./utils/daily-stats";

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
const STATS_ID = "1";

function getOrCreateTokenStats(): TokenStats {
  let stats = TokenStats.load(STATS_ID);
  if (stats == null) {
    stats = new TokenStats(STATS_ID);
    stats.totalHolders = 0;
    stats.totalTransfers = BigInt.fromI32(0);
  }
  return stats;
}

function getOrCreateTokenHolder(address: Bytes, timestamp: BigInt): TokenHolder {
  let holder = TokenHolder.load(address);
  if (holder == null) {
    holder = new TokenHolder(address);
    holder.balance = BigInt.fromI32(0);
    holder.transferInCount = 0;
    holder.transferOutCount = 0;
    holder.firstSeenAt = timestamp;
    holder.lastSeenAt = timestamp;
  }
  return holder;
}

export function handleTransfer(event: TransferEvent): void {
  let stats = getOrCreateTokenStats();
  let isNewHolder = false;
  

  // Create Transfer entity
  let transfer = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.value = event.params.value;
  transfer.blockNumber = event.block.number;
  transfer.timestamp = event.block.timestamp;
  transfer.transactionHash = event.transaction.hash;
  transfer.save();

  // Update total transfers
  stats.totalTransfers = stats.totalTransfers.plus(BigInt.fromI32(1));

  // Handle sender (from)
  if (event.params.from != ZERO_ADDRESS) {
    let fromHolder = getOrCreateTokenHolder(event.params.from, event.block.timestamp);
    let previousBalance = fromHolder.balance;
    fromHolder.balance = fromHolder.balance.minus(event.params.value);
    fromHolder.transferOutCount = fromHolder.transferOutCount + 1;
    fromHolder.lastSeenAt = event.block.timestamp;
    fromHolder.save();

    // If holder balance becomes zero, decrease total holders
    if (previousBalance.gt(BigInt.fromI32(0)) && fromHolder.balance.equals(BigInt.fromI32(0))) {
      stats.totalHolders = stats.totalHolders - 1;
    }
  }

  // Handle receiver (to)
  if (event.params.to != ZERO_ADDRESS) {
    let toHolder = getOrCreateTokenHolder(event.params.to, event.block.timestamp);
    let previousBalance = toHolder.balance;
    toHolder.balance = toHolder.balance.plus(event.params.value);
    toHolder.transferInCount = toHolder.transferInCount + 1;
    toHolder.lastSeenAt = event.block.timestamp;
    toHolder.save();

    // If this is a new holder (balance was zero before), increase total holders
    if (previousBalance.equals(BigInt.fromI32(0)) && toHolder.balance.gt(BigInt.fromI32(0))) {
      stats.totalHolders = stats.totalHolders + 1;
      isNewHolder = true;
    }
  }

  stats.save();

  // Update daily stats
  updateDailyTransfer(event.block.timestamp, event.params.value, isNewHolder, stats.totalHolders);

  // Create UserActivity for sender (transfer_out)
  if (event.params.from != ZERO_ADDRESS) {
    let activityOut = new UserActivity(
      event.transaction.hash.concatI32(event.logIndex.toI32()).concat(Bytes.fromUTF8("out"))
    );
    activityOut.user = event.params.from;
    activityOut.activityType = "transfer_out";
    activityOut.amount = event.params.value;
    activityOut.counterparty = event.params.to;
    activityOut.blockNumber = event.block.number;
    activityOut.timestamp = event.block.timestamp;
    activityOut.transactionHash = event.transaction.hash;
    activityOut.save();
  }

  // Create UserActivity for receiver (transfer_in)
  if (event.params.to != ZERO_ADDRESS) {
    let activityIn = new UserActivity(
      event.transaction.hash.concatI32(event.logIndex.toI32()).concat(Bytes.fromUTF8("in"))
    );
    activityIn.user = event.params.to;
    activityIn.activityType = "transfer_in";
    activityIn.amount = event.params.value;
    activityIn.counterparty = event.params.from;
    activityIn.blockNumber = event.block.number;
    activityIn.timestamp = event.block.timestamp;
    activityIn.transactionHash = event.transaction.hash;
    activityIn.save();
  }
}
