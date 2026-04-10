import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Swap as SwapEvent } from "../generated/PancakeV2Pair_OXAU_USDT/PancakeV2Pair";
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

export function handleSwapV2(event: SwapEvent): void {
    let stats = getOrCreateSwapStats();

    // PancakeSwap V2 Swap 이벤트
    let amount0In = event.params.amount0In;
    let amount1In = event.params.amount1In;
    let amount0Out = event.params.amount0Out;
    let amount1Out = event.params.amount1Out;

    // 풀 설정 확인
    let oxauIsToken0 = isOXAUToken0(event.address);
    let stablecoin = getStablecoinForPool(event.address);

    // 스왑 방향 결정
    let amountIn: BigInt;
    let amountOut: BigInt;
    let tokenIn: Bytes;
    let tokenOut: Bytes;
    let isOXAUIn: boolean;
    let oxauVolume: BigInt;

    if (oxauIsToken0) {
        if (amount0In.gt(BigInt.fromI32(0))) {
            amountIn = amount0In;
            amountOut = amount1Out;
            tokenIn = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            tokenOut = stablecoin;
            isOXAUIn = true;
            oxauVolume = amount0In;
        } else {
            amountIn = amount1In;
            amountOut = amount0Out;
            tokenIn = stablecoin;
            tokenOut = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            isOXAUIn = false;
            oxauVolume = amount0Out;
        }
    } else {
        if (amount1In.gt(BigInt.fromI32(0))) {
            amountIn = amount1In;
            amountOut = amount0Out;
            tokenIn = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            tokenOut = stablecoin;
            isOXAUIn = true;
            oxauVolume = amount1In;
        } else {
            amountIn = amount0In;
            amountOut = amount1Out;
            tokenIn = stablecoin;
            tokenOut = Bytes.fromHexString(OXAU_TOKEN.toHexString());
            isOXAUIn = false;
            oxauVolume = amount1Out;
        }
    }

    let swap = new Swap(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );

    swap.user = event.params.to;
    swap.tokenIn = tokenIn;
    swap.tokenOut = tokenOut;
    swap.amountIn = amountIn;
    swap.amountOut = amountOut;
    swap.pool = event.address;
    swap.blockNumber = event.block.number;
    swap.timestamp = event.block.timestamp;
    swap.transactionHash = event.transaction.hash;
    swap.save();

    stats.totalSwapCount = stats.totalSwapCount.plus(BigInt.fromI32(1));
    stats.totalVolumeOXAU = stats.totalVolumeOXAU.plus(oxauVolume);
    stats.save();

    let userStats = getOrCreateUserSwapStats(
        event.params.to,
        event.block.timestamp,
    );
    userStats.swapCount = userStats.swapCount + 1;
    userStats.lastSwapAt = event.block.timestamp;

    if (isOXAUIn) {
        userStats.totalVolumeOut = userStats.totalVolumeOut.plus(oxauVolume);
    } else {
        userStats.totalVolumeIn = userStats.totalVolumeIn.plus(oxauVolume);
    }
    userStats.save();

    let activity = new UserActivity(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );

    activity.user = event.params.to;
    activity.activityType = isOXAUIn ? "swap_sell" : "swap_buy";
    activity.amount = oxauVolume;
    activity.relatedToken = isOXAUIn ? tokenOut : tokenIn;
    activity.relatedTokenType = getTokenSymbol(isOXAUIn ? tokenOut : tokenIn);
    activity.relatedAmount = isOXAUIn ? amountOut : amountIn;
    activity.blockNumber = event.block.number;
    activity.timestamp = event.block.timestamp;
    activity.transactionHash = event.transaction.hash;
    activity.save();

    // Update daily stats
    updateDailySwap(event.block.timestamp, oxauVolume);
}
