import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Swap as SwapEvent } from "../generated/PancakeV3Pool_OXAU_USDC/PancakeV3Pool";
import {
    Swap,
    SwapStats,
    UserSwapStats,
    UserActivity,
} from "../generated/schema";
import { updateDailySwap } from "./utils/daily-stats";
import { OXAU_TOKEN, isOXAUToken0, getStablecoinForPool, getTokenSymbol } from "./config";

const SWAP_STATS_ID = "1";

function getOrCreateSwapStats(): SwapStats {
    let stats = SwapStats.load(SWAP_STATS_ID);
    if (stats == null) {
        stats = new SwapStats(SWAP_STATS_ID);
        stats.totalSwapCount = BigInt.fromI32(0);
        stats.totalVolumeOXAU = BigInt.fromI32(0);
    }
    return stats;
}

function getOrCreateUserSwapStats(
    user: Bytes,
    timestamp: BigInt,
): UserSwapStats {
    let userStats = UserSwapStats.load(user);
    if (userStats == null) {
        userStats = new UserSwapStats(user);
        userStats.swapCount = 0;
        userStats.totalVolumeIn = BigInt.fromI32(0);
        userStats.totalVolumeOut = BigInt.fromI32(0);
        userStats.firstSwapAt = timestamp;
        userStats.lastSwapAt = timestamp;
    }
    return userStats;
}

function abs(value: BigInt): BigInt {
    if (value.lt(BigInt.fromI32(0))) {
        return value.neg();
    }
    return value;
}

export function handleSwapV3(event: SwapEvent): void {
    let stats = getOrCreateSwapStats();

    let amount0 = event.params.amount0;
    let amount1 = event.params.amount1;

    let oxauIsToken0 = isOXAUToken0(event.address);
    let stablecoin = getStablecoinForPool(event.address);

    let amountIn: BigInt;
    let amountOut: BigInt;
    let tokenIn: Bytes;
    let tokenOut: Bytes;
    let isOXAUIn: boolean;
    let oxauVolume: BigInt;

    if (oxauIsToken0) {
        if (amount0.gt(BigInt.fromI32(0))) {
            amountIn = amount0;
            amountOut = abs(amount1);
            tokenIn = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            tokenOut = stablecoin;
            isOXAUIn = true;
            oxauVolume = amount0;
        } else {
            amountIn = amount1;
            amountOut = abs(amount0);
            tokenIn = stablecoin;
            tokenOut = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            isOXAUIn = false;
            oxauVolume = abs(amount0);
        }
    } else {
        if (amount1.gt(BigInt.fromI32(0))) {
            amountIn = amount1;
            amountOut = abs(amount0);
            tokenIn = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            tokenOut = stablecoin;
            isOXAUIn = true;
            oxauVolume = amount1;
        } else {
            amountIn = amount0;
            amountOut = abs(amount1);
            tokenIn = stablecoin;
            tokenOut = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            isOXAUIn = false;
            oxauVolume = abs(amount1);
        }
    }

    let swap = new Swap(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );

    swap.user = event.params.recipient;
    swap.tokenIn = tokenIn;
    swap.tokenOut = tokenOut;
    swap.amountIn = abs(amountIn);
    swap.amountOut = amountOut;
    swap.pool = event.address;
    swap.blockNumber = event.block.number;
    swap.timestamp = event.block.timestamp;
    swap.transactionHash = event.transaction.hash;
    swap.save();

    stats.totalSwapCount = stats.totalSwapCount.plus(BigInt.fromI32(1));
    stats.totalVolumeOXAU = stats.totalVolumeOXAU.plus(abs(oxauVolume));
    stats.save();

    let userStats = getOrCreateUserSwapStats(
        event.params.recipient,
        event.block.timestamp,
    );
    userStats.swapCount = userStats.swapCount + 1;
    userStats.lastSwapAt = event.block.timestamp;

    if (isOXAUIn) {
        userStats.totalVolumeOut = userStats.totalVolumeOut.plus(
            abs(oxauVolume),
        );
    } else {
        userStats.totalVolumeIn = userStats.totalVolumeIn.plus(abs(oxauVolume));
    }
    userStats.save();

    let activity = new UserActivity(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );
    activity.user = event.params.recipient;
    activity.activityType = isOXAUIn ? "swap_sell" : "swap_buy";
    activity.amount = abs(oxauVolume);
    activity.relatedToken = isOXAUIn ? tokenOut : tokenIn;
    activity.relatedTokenType = getTokenSymbol(isOXAUIn ? tokenOut : tokenIn);
    activity.relatedAmount = isOXAUIn ? amountOut : abs(amountIn);
    activity.blockNumber = event.block.number;
    activity.timestamp = event.block.timestamp;
    activity.transactionHash = event.transaction.hash;
    activity.save();

    // DailyStats 업데이트
    updateDailySwap(event.block.timestamp, abs(oxauVolume));
}
