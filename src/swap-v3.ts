import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Swap as SwapEvent } from "../generated/PancakeV3Pool/PancakeV3Pool";
import { Swap, SwapStats, UserSwapStats, UserActivity } from "../generated/schema";
import { updateDailySwap } from "./utils/daily-stats";
import { AGT_TOKEN, isAGTToken0, getStablecoinForPool } from "./config";

const SWAP_STATS_ID = "1";

function getOrCreateSwapStats(): SwapStats {
    let stats = SwapStats.load(SWAP_STATS_ID);
    if (stats == null) {
        stats = new SwapStats(SWAP_STATS_ID);
        stats.totalSwapCount = BigInt.fromI32(0);
        stats.totalVolumeAGT = BigInt.fromI32(0);
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

    // V3 Swap: amount0, amount1은 signed (양수=in, 음수=out)
    let amount0 = event.params.amount0;
    let amount1 = event.params.amount1;

    // 풀 설정 확인
    let agtIsToken0 = isAGTToken0(event.address);
    let stablecoin = getStablecoinForPool(event.address);

    // 스왑 방향 결정
    let amountIn: BigInt;
    let amountOut: BigInt;
    let tokenIn: Bytes;
    let tokenOut: Bytes;
    let isAGTIn: boolean;
    let agtVolume: BigInt;

    if (agtIsToken0) {
        // AGT가 token0인 경우
        if (amount0.gt(BigInt.fromI32(0))) {
            // amount0 > 0: AGT가 풀로 들어옴 (AGT 매도)
            amountIn = amount0;
            amountOut = abs(amount1);
            tokenIn = Bytes.fromHexString(AGT_TOKEN.toHexString());
            tokenOut = stablecoin;
            isAGTIn = true;
            agtVolume = amount0;
        } else {
            // amount0 < 0: AGT가 풀에서 나감 (AGT 매수)
            amountIn = amount1;
            amountOut = abs(amount0);
            tokenIn = stablecoin;
            tokenOut = Bytes.fromHexString(AGT_TOKEN.toHexString());
            isAGTIn = false;
            agtVolume = abs(amount0);
        }
    } else {
        // AGT가 token1인 경우
        if (amount1.gt(BigInt.fromI32(0))) {
            // amount1 > 0: AGT가 풀로 들어옴 (AGT 매도)
            amountIn = amount1;
            amountOut = abs(amount0);
            tokenIn = Bytes.fromHexString(AGT_TOKEN.toHexString());
            tokenOut = stablecoin;
            isAGTIn = true;
            agtVolume = amount1;
        } else {
            // amount1 < 0: AGT가 풀에서 나감 (AGT 매수)
            amountIn = amount0;
            amountOut = abs(amount1);
            tokenIn = stablecoin;
            tokenOut = Bytes.fromHexString(AGT_TOKEN.toHexString());
            isAGTIn = false;
            agtVolume = abs(amount1);
        }
    }

    // Swap 엔티티 생성
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

    // SwapStats 업데이트
    stats.totalSwapCount = stats.totalSwapCount.plus(BigInt.fromI32(1));
    stats.totalVolumeAGT = stats.totalVolumeAGT.plus(abs(agtVolume));
    stats.save();

    // UserSwapStats 업데이트
    let userStats = getOrCreateUserSwapStats(
        event.params.recipient,
        event.block.timestamp,
    );
    userStats.swapCount = userStats.swapCount + 1;
    userStats.lastSwapAt = event.block.timestamp;

    if (isAGTIn) {
        // AGT 매도
        userStats.totalVolumeOut = userStats.totalVolumeOut.plus(abs(agtVolume));
    } else {
        // AGT 매수
        userStats.totalVolumeIn = userStats.totalVolumeIn.plus(abs(agtVolume));
    }
    userStats.save();

    // UserActivity 생성
    let activity = new UserActivity(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );
    activity.user = event.params.recipient;
    activity.activityType = isAGTIn ? "swap_sell" : "swap_buy";
    activity.amount = abs(agtVolume);
    activity.relatedToken = isAGTIn ? tokenOut : tokenIn;
    activity.relatedAmount = isAGTIn ? amountOut : abs(amountIn);
    activity.blockNumber = event.block.number;
    activity.timestamp = event.block.timestamp;
    activity.transactionHash = event.transaction.hash;
    activity.save();

    // DailyStats 업데이트
    updateDailySwap(event.block.timestamp, abs(agtVolume));
}
