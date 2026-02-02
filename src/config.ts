import { Address, Bytes } from "@graphprotocol/graph-ts";

export const AGT_TOKEN = Address.fromString(
    "0xfa23fd059662ab424a75691c03b62126afe78057",
);
export const USDT_TOKEN = Address.fromString(
    "0xcf7b084757873062fc7a86320f400380f9358cda",
);
export const USDC_TOKEN = Address.fromString(
    "0x9848bb9287ba3f87c8098dbf7533e604030fe912",
);

export const POOL_AGT_USDT = Address.fromString(
    "0x436D13E80CfbD0045AE1667201A792b60214793b",
);
export const POOL_AGT_USDC = Address.fromString(
    "0xEa4A71D0617CDaA4b2494a447016D6DF17fE2Ed9",
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
