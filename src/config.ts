import { Address, Bytes } from "@graphprotocol/graph-ts";

export const OXAU_TOKEN = Address.fromString(
    "0xCCb9e3Fb2F4ed30346F2bdeb4cD9564e5ab9fE48",
);
export const USDT_TOKEN = Address.fromString(
    "0x6777ab1c1ebfc40d3442202158bea959e04ac744",
);
export const USDC_TOKEN = Address.fromString(
    "0xc3437da5e936d3449d6f0700a71847305e9357be",
);

// V2 Pools
// export const POOL_V2_OXAU_USDT = Address.fromString(
//     "0x958bd5d338a61868ff800c2bb98b973a3102b7fe",
// );
// export const POOL_V2_OXAU_USDC = Address.fromString(
//     "0x7522681bc79c8f60840f409fec03051cbe04eea9",
// );

// V3 Pools
export const POOL_V3_OXAU_USDT = Address.fromString(
    "0x6Bc8a2CC9552C74BBBDE736e1260893de4E0503A",
);
export const POOL_V3_OXAU_USDC = Address.fromString(
    "0x97974e3D7D48a21A109B1d87Cf4453DB627325Fb",
);

// Legacy aliases for V2 pools
// export const POOL_OXAU_USDT = POOL_V2_OXAU_USDT;
// export const POOL_OXAU_USDC = POOL_V2_OXAU_USDC;

export function isOXAUToken0(poolAddress: Address): boolean {
    // V3 풀들은 모두 OXAU가 token0
    return (
        poolAddress.equals(POOL_V3_OXAU_USDT) ||
        poolAddress.equals(POOL_V3_OXAU_USDC)
    );
}

export function getStablecoinForPool(poolAddress: Address): Bytes {
    if (
        // poolAddress.equals(POOL_V2_OXAU_USDT) ||
        poolAddress.equals(POOL_V3_OXAU_USDT)
    ) {
        return Bytes.fromHexString(USDT_TOKEN.toHexString());
    } else {
        return Bytes.fromHexString(USDC_TOKEN.toHexString());
    }
}

export function isV3Pool(poolAddress: Address): boolean {
    return (
        poolAddress.equals(POOL_V3_OXAU_USDT) ||
        poolAddress.equals(POOL_V3_OXAU_USDC)
    );
}

export function getTokenSymbol(tokenAddress: Bytes): string {
    let addr = Address.fromBytes(tokenAddress);
    if (addr.equals(OXAU_TOKEN)) {
        return "OXAU";
    } else if (addr.equals(USDT_TOKEN)) {
        return "USDT";
    } else if (addr.equals(USDC_TOKEN)) {
        return "USDC";
    }
    return "UNKNOWN";
}
