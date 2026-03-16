import { Address, Bytes } from "@graphprotocol/graph-ts";

export const AGT_TOKEN = Address.fromString(
    "0x56780f90f467e4f8a05f37538f1288a4caa5a9a1",
);
export const USDT_TOKEN = Address.fromString(
    "0x6777ab1c1ebfc40d3442202158bea959e04ac744",
);
export const USDC_TOKEN = Address.fromString(
    "0xc3437da5e936d3449d6f0700a71847305e9357be",
);

// V2 Pools
// export const POOL_V2_AGT_USDT = Address.fromString(
//     "0x958bd5d338a61868ff800c2bb98b973a3102b7fe",
// );
// export const POOL_V2_AGT_USDC = Address.fromString(
//     "0x7522681bc79c8f60840f409fec03051cbe04eea9",
// );

// V3 Pools
export const POOL_V3_AGT_USDT = Address.fromString(
    "0xe6b9f60ca0f39fab65174bede99831486cb23a52",
);
export const POOL_V3_AGT_USDC = Address.fromString(
    "0xeb9c16f86bda1d0d5e378e6d645e367bb48fb9f7",
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
