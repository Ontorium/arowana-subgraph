import { Address, Bytes } from "@graphprotocol/graph-ts";

export const AGT_TOKEN = Address.fromString(
    "0xe02b08b4e21baf8d364b547f932db939c76a33bf",
);
export const USDT_TOKEN = Address.fromString(
    "0x6777ab1c1ebfc40d3442202158bea959e04ac744",
);
export const USDC_TOKEN = Address.fromString(
    "0xc3437da5e936d3449d6f0700a71847305e9357be",
);

export const POOL_AGT_USDT = Address.fromString(
    "0x958bd5d338a61868ff800c2bb98b973a3102b7fe",
);
export const POOL_AGT_USDC = Address.fromString(
    "0x7522681bc79c8f60840f409fec03051cbe04eea9",
);

export function isAGTToken0(poolAddress: Address): boolean {
    return false;
}

export function getStablecoinForPool(poolAddress: Address): Bytes {
    if (poolAddress.equals(POOL_AGT_USDT)) {
        return Bytes.fromHexString(USDT_TOKEN.toHexString());
    } else {
        return Bytes.fromHexString(USDC_TOKEN.toHexString());
    }
}
