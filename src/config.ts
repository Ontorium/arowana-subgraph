import { Address, Bytes } from "@graphprotocol/graph-ts";

export const AGT_TOKEN = Address.fromString(
    "0xa79266d31dd53c36a4dfe81fc86ab75363c69640",
);
export const USDT_TOKEN = Address.fromString(
    "0xcf7b084757873062fc7a86320f400380f9358cda",
);
export const USDC_TOKEN = Address.fromString(
    "0x9848bb9287ba3f87c8098dbf7533e604030fe912",
);

// export const POOL_V2_AGT_USDT = Address.fromString(
//     "0x436D13E80CfbD0045AE1667201A792b60214793b",
// );
// export const POOL_V2_AGT_USDC = Address.fromString(
//     "0xEa4A71D0617CDaA4b2494a447016D6DF17fE2Ed9",
// );

// V3 Pools
export const POOL_V3_AGT_USDT = Address.fromString(
    "0xa09b371d4682715a0b2f8988141607a8fe6a4cee",
);
export const POOL_V3_AGT_USDC = Address.fromString(
    "0xd1157048cfa4954c1b6c9cac0919129b3adb6a0c",
);

// Legacy aliases for V2 pools
// export const POOL_AGT_USDT = POOL_V2_AGT_USDT;
// export const POOL_AGT_USDC = POOL_V2_AGT_USDC;

export function isAGTToken0(poolAddress: Address): boolean {
    // V3 풀들은 모두 AGT가 token0
    return (
        poolAddress.equals(POOL_V3_AGT_USDT) ||
        poolAddress.equals(POOL_V3_AGT_USDC)
    );
}

export function getStablecoinForPool(poolAddress: Address): Bytes {
    if (
        // poolAddress.equals(POOL_V2_AGT_USDT) ||
        poolAddress.equals(POOL_V3_AGT_USDT)
    ) {
        return Bytes.fromHexString(USDT_TOKEN.toHexString());
    } else {
        return Bytes.fromHexString(USDC_TOKEN.toHexString());
    }
}

export function isV3Pool(poolAddress: Address): boolean {
    return (
        poolAddress.equals(POOL_V3_AGT_USDT) ||
        poolAddress.equals(POOL_V3_AGT_USDC)
    );
}

export function getTokenSymbol(tokenAddress: Bytes): string {
    let addr = Address.fromBytes(tokenAddress);
    if (addr.equals(AGT_TOKEN)) {
        return "AGT";
    } else if (addr.equals(USDT_TOKEN)) {
        return "USDT";
    } else if (addr.equals(USDC_TOKEN)) {
        return "USDC";
    }
    return "UNKNOWN";
}
