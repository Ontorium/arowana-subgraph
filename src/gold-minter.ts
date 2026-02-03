import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  RequestMint as RequestMintEvent,
  SettleMint as SettleMintEvent,
  RequestBurn as RequestBurnEvent,
  SettleBurn as SettleBurnEvent
} from "../generated/GoldMinter/GoldMinter";
import {
  MintRequest,
  RedeemRequest,
  MintStats,
  UserMintStats,
  UserActivity
} from "../generated/schema";
import { updateDailyMint, updateDailyRedeem } from "./utils/daily-stats";

const STATS_ID = "1";
const FEE_BPS = BigInt.fromI32(40); // 0.4% = 40 basis points
const BPS_DENOMINATOR = BigInt.fromI32(10000);

function calculateNetGoldAmount(grossGoldAmount: BigInt): BigInt {
  let feeAmount = grossGoldAmount.times(FEE_BPS).div(BPS_DENOMINATOR);
  return grossGoldAmount.minus(feeAmount);
}

function getOrCreateMintStats(): MintStats {
  let stats = MintStats.load(STATS_ID);
  if (stats == null) {
    stats = new MintStats(STATS_ID);
    stats.totalMintCount = BigInt.fromI32(0);
    stats.totalMintVolume = BigInt.fromI32(0);
    stats.totalRedeemCount = BigInt.fromI32(0);
    stats.totalRedeemVolume = BigInt.fromI32(0);
  }
  return stats;
}

function getOrCreateUserMintStats(address: Bytes, timestamp: BigInt): UserMintStats {
  let userStats = UserMintStats.load(address);
  if (userStats == null) {
    userStats = new UserMintStats(address);
    userStats.mintCount = 0;
    userStats.redeemCount = 0;
    userStats.totalMintVolume = BigInt.fromI32(0);
    userStats.totalRedeemVolume = BigInt.fromI32(0);
    userStats.firstActivityAt = timestamp;
    userStats.lastActivityAt = timestamp;
  }
  return userStats;
}

export function handleRequestMint(event: RequestMintEvent): void {
  let id = event.params.nonce.toString();

  let mintRequest = new MintRequest(id);
  mintRequest.nonce = event.params.nonce;
  mintRequest.buyer = event.params.buyer;
  mintRequest.usdToken = event.params.usdToken;
  mintRequest.usdAmount = event.params.usdAmount;
  mintRequest.minGoldAmount = event.params.minGoldAmount;
  mintRequest.status = "pending";
  mintRequest.requestBlockNumber = event.block.number;
  mintRequest.requestTimestamp = event.block.timestamp;
  mintRequest.requestTxHash = event.transaction.hash;
  mintRequest.save();
}

export function handleSettleMint(event: SettleMintEvent): void {
  let id = event.params.nonce.toString();
  let mintRequest = MintRequest.load(id);

  if (mintRequest != null) {
    let grossGoldAmount = event.params.goldAmount;
    let netGoldAmount = calculateNetGoldAmount(grossGoldAmount);

    mintRequest.goldAmount = netGoldAmount;
    mintRequest.success = event.params.success;
    mintRequest.status = "settled";
    mintRequest.settleBlockNumber = event.block.number;
    mintRequest.settleTimestamp = event.block.timestamp;
    mintRequest.settleTxHash = event.transaction.hash;
    mintRequest.save();

    // Update stats only if mint was successful
    if (event.params.success) {
      let stats = getOrCreateMintStats();
      stats.totalMintCount = stats.totalMintCount.plus(BigInt.fromI32(1));
      stats.totalMintVolume = stats.totalMintVolume.plus(netGoldAmount);
      stats.save();

      let userStats = getOrCreateUserMintStats(mintRequest.buyer, event.block.timestamp);
      userStats.mintCount = userStats.mintCount + 1;
      userStats.totalMintVolume = userStats.totalMintVolume.plus(netGoldAmount);
      userStats.lastActivityAt = event.block.timestamp;
      userStats.save();

      // Create UserActivity
      let activity = new UserActivity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
      );
      activity.user = mintRequest.buyer;
      activity.activityType = "mint";
      activity.amount = netGoldAmount;
      activity.relatedToken = mintRequest.usdToken;
      activity.relatedAmount = mintRequest.usdAmount;
      activity.blockNumber = event.block.number;
      activity.timestamp = event.block.timestamp;
      activity.transactionHash = event.transaction.hash;
      activity.save();

      // Update daily stats
      updateDailyMint(event.block.timestamp, netGoldAmount);
    }
  }
}

export function handleRequestBurn(event: RequestBurnEvent): void {
  let id = event.params.nonce.toString();

  let redeemRequest = new RedeemRequest(id);
  redeemRequest.nonce = event.params.nonce;
  redeemRequest.seller = event.params.seller;
  redeemRequest.usdToken = event.params.usdToken;
  redeemRequest.goldAmount = event.params.goldAmount;
  redeemRequest.minUsdAmount = event.params.minUsdAmount;
  redeemRequest.status = "pending";
  redeemRequest.requestBlockNumber = event.block.number;
  redeemRequest.requestTimestamp = event.block.timestamp;
  redeemRequest.requestTxHash = event.transaction.hash;
  redeemRequest.save();
}

export function handleSettleBurn(event: SettleBurnEvent): void {
  let id = event.params.nonce.toString();
  let redeemRequest = RedeemRequest.load(id);

  if (redeemRequest != null) {
    redeemRequest.usdAmount = event.params.usdAmount;
    redeemRequest.success = event.params.success;
    redeemRequest.status = "settled";
    redeemRequest.settleBlockNumber = event.block.number;
    redeemRequest.settleTimestamp = event.block.timestamp;
    redeemRequest.settleTxHash = event.transaction.hash;
    redeemRequest.save();

    // Update stats only if redeem was successful
    if (event.params.success) {
      let stats = getOrCreateMintStats();
      stats.totalRedeemCount = stats.totalRedeemCount.plus(BigInt.fromI32(1));
      stats.totalRedeemVolume = stats.totalRedeemVolume.plus(redeemRequest.goldAmount);
      stats.save();

      let userStats = getOrCreateUserMintStats(redeemRequest.seller, event.block.timestamp);
      userStats.redeemCount = userStats.redeemCount + 1;
      userStats.totalRedeemVolume = userStats.totalRedeemVolume.plus(redeemRequest.goldAmount);
      userStats.lastActivityAt = event.block.timestamp;
      userStats.save();

      // Create UserActivity
      let activity = new UserActivity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
      );
      activity.user = redeemRequest.seller;
      activity.activityType = "redeem";
      activity.amount = redeemRequest.goldAmount;
      activity.relatedToken = redeemRequest.usdToken;
      activity.relatedAmount = event.params.usdAmount;
      activity.blockNumber = event.block.number;
      activity.timestamp = event.block.timestamp;
      activity.transactionHash = event.transaction.hash;
      activity.save();

      // Update daily stats
      updateDailyRedeem(event.block.timestamp, redeemRequest.goldAmount);
    }
  }
}
