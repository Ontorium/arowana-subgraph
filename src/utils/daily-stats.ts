import { BigInt } from "@graphprotocol/graph-ts";
import { DailyStats } from "../../generated/schema";

const SECONDS_PER_DAY = 86400;

export function getDayId(timestamp: BigInt): string {
    let dayTimestamp = timestamp.toI32() / SECONDS_PER_DAY;
    return dayTimestamp.toString();
}

export function getDayStartTimestamp(timestamp: BigInt): BigInt {
    let dayTimestamp = timestamp.toI32() / SECONDS_PER_DAY;
    return BigInt.fromI32(dayTimestamp * SECONDS_PER_DAY);
}

export function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
    let dayId = getDayId(timestamp);
    let dailyStats = DailyStats.load(dayId);

    if (dailyStats == null) {
        dailyStats = new DailyStats(dayId);
        dailyStats.date = getDayStartTimestamp(timestamp);

        // 홀더 통계
        dailyStats.totalHolders = 0;
        dailyStats.newHolders = 0;

        // 전송 통계
        dailyStats.transferCount = 0;
        dailyStats.transferVolume = BigInt.fromI32(0);

        // 스왑 통계
        dailyStats.swapCount = 0;
        dailyStats.swapVolumeOXAU = BigInt.fromI32(0);

        // 민트 통계
        dailyStats.mintCount = 0;
        dailyStats.mintVolume = BigInt.fromI32(0);

        // 리딤 통계
        dailyStats.redeemCount = 0;
        dailyStats.redeemVolume = BigInt.fromI32(0);
    }

    return dailyStats;
}

export function updateDailyTransfer(
    timestamp: BigInt,
    volume: BigInt,
    isNewHolder: boolean,
    totalHolders: i32,
): void {
    let dailyStats = getOrCreateDailyStats(timestamp);

    dailyStats.transferCount = dailyStats.transferCount + 1;
    dailyStats.transferVolume = dailyStats.transferVolume.plus(volume);
    dailyStats.totalHolders = totalHolders;

    if (isNewHolder) {
        dailyStats.newHolders = dailyStats.newHolders + 1;
    }

    dailyStats.save();
}

export function updateDailySwap(timestamp: BigInt, volumeOXAU: BigInt): void {
    let dailyStats = getOrCreateDailyStats(timestamp);

    dailyStats.swapCount = dailyStats.swapCount + 1;
    dailyStats.swapVolumeOXAU = dailyStats.swapVolumeOXAU.plus(volumeOXAU);

    dailyStats.save();
}

export function updateDailyMint(timestamp: BigInt, volume: BigInt): void {
    let dailyStats = getOrCreateDailyStats(timestamp);

    dailyStats.mintCount = dailyStats.mintCount + 1;
    dailyStats.mintVolume = dailyStats.mintVolume.plus(volume);

    dailyStats.save();
}

export function updateDailyRedeem(timestamp: BigInt, volume: BigInt): void {
    let dailyStats = getOrCreateDailyStats(timestamp);

    dailyStats.redeemCount = dailyStats.redeemCount + 1;
    dailyStats.redeemVolume = dailyStats.redeemVolume.plus(volume);

    dailyStats.save();
}
