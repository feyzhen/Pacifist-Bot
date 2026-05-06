/**
 * 市场交易常量
 * 定义购买和售卖资源的信用点要求、数量要求、价格等参数
 */

// import { ResourceConstant } from "game/constants";

// ==================== 信用点要求 ====================
export const CREDIT_REQUIREMENTS = {
    // 基础资源购买信用点要求
    BASE_RESOURCE_PURCHASE: {
        SHARD3: 1000000,      // shard3需要100万信用点
        OTHER: 10000         // 其他分片需要1万信用点
    },

    // 特殊资源购买信用点要求
    POWER_PURCHASE: 100000000,  // 购买Power需要1亿信用点
    ENERGY_PURCHASE: 1000000,   // 购买能量需要100万信用点

    // 市场爬虫信用点要求
    MARKET_CRAWLER: 9000,        // 市场爬虫需要9000 CPU bucket
} as const;

// ==================== 库存阈值 ====================
export const STORAGE_THRESHOLDS = {
    // 基础资源库存阈值
    BASE_RESOURCES: {
        TERMINAL_CAPACITY: 300000,        // 终端容量阈值
        STORAGE_ENERGY_HIGH: 430000,       // 存储能量高阈值
        STORAGE_ENERGY_LOW: 100000,        // 存储能量低阈值
        TERMINAL_ENERGY_MIN: 2000,         // 终端能量最小值
        TERMINAL_ENERGY_MAX: 10000,        // 终端能量最大值
    },

    // 资源库存阈值
    RESOURCE_STOCK: {
        BASE_MIN: 1000,           // 基础最小库存
        BASE_MAX: 8000,           // 基础最大库存
        LOCAL_MIN: 1000,          // 本地矿物最小库存
        POWER_TOTAL: 5000,        // Power总量阈值
        OPS_MIN: 35000,           // OPS最小库存
    },

    // 销售阈值
    SELL_THRESHOLDS: {
        DEFAULT: 1000,           // 默认销售阈值
        SPECIAL: 3500,           // 特殊资源销售阈值(避免与生产冲突)
        ROOM_MINERAL: 30000,     // 房间矿物销售阈值
        ROOM_MINERAL_AMOUNT: 100000, // 房间矿物数量阈值
    },
} as const;

// ==================== 购买参数 ====================
export const PURCHASE_CONFIG = {
    // 基础资源购买配置
    BASE_RESOURCES: {
        // 分层购买价格策略
        PRICE_TIERS: [
            { price: 2, amount: 1000 },
            { price: 50, amount: 1000 },
            { price: 100, amount: 1000 },
            { price: 500, amount: 1000 }
        ],

        // 能量成本限制
        ENERGY_COST_MULTIPLIER: 4,  // 订单数量 × 4
    },

    // 特殊资源购买配置
    SPECIAL_RESOURCES: {
        POWER: {
            amount: 5000,
            price: 5000
        },
        ENERGY: {
            amount: 5000,
            price: 20,
            energyCostMultiplier: 0.5  // 特殊的能量成本计算
        }
    },

    // 市场爬虫配置
    MARKET_CRAWLER: {
        price: 3,
        amount: 50,
        energyCostMultiplier: 8,
        shuffleList: true  // 是否随机化资源列表
    },
} as const;

// ==================== 销售参数 ====================
export const SALES_CONFIG = {
    // 基础销售配置
    BASE_SALES: {
        // 分层销售策略
        TIERS: [
            { threshold: 1000, amount: 1000, frequency: null },
            { threshold: 100, amount: 100, frequency: 100 },
            { threshold: 1, amount: 10, frequency: 1000 },
            { threshold: 1, amount: 1, frequency: 10000 }
        ],

        // 能量成本限制
        ENERGY_COST_MULTIPLIER: 8,
    },

    // 特殊资源销售价格
    SPECIAL_PRICES: {
        [RESOURCE_CONDENSATE]: 999,
        [RESOURCE_CONCENTRATE]: 9999,
        [RESOURCE_EXTRACT]: 80000,
        [RESOURCE_SPIRIT]: 199999,
        [RESOURCE_EMANATION]: 800000,
        [RESOURCE_ESSENCE]: 2000000,
        [RESOURCE_WIRE]: 999,
        [RESOURCE_SWITCH]: 9999,
        [RESOURCE_TRANSISTOR]: 80000,
        [RESOURCE_MICROCHIP]: 199999,
        [RESOURCE_CIRCUIT]: 800000,
        [RESOURCE_DEVICE]: 2000000,
        [RESOURCE_CELL]: 999,
        [RESOURCE_PHLEGM]: 9999,
        [RESOURCE_TISSUE]: 80000,
        [RESOURCE_MUSCLE]: 199999,
        [RESOURCE_ORGANOID]: 800000,
        [RESOURCE_ORGANISM]: 2000000,
        [RESOURCE_ALLOY]: 999,
        [RESOURCE_TUBE]: 9999,
        [RESOURCE_FIXTURES]: 80000,
        [RESOURCE_FRAME]: 199999,
        [RESOURCE_HYDRAULICS]: 800000,
        [RESOURCE_MACHINE]: 2000000,
    } as Partial<Record<ResourceConstant, number>>,

    // 动态价格配置
    DYNAMIC_PRICING: {
        DEFAULT_MIN_PRICE: 2,
        STOCK_TIERS: [
            { threshold: 5000, strategy: 'aggressive' },    // 高库存：积极销售
            { threshold: 2000, strategy: 'normal' },       // 中等库存：正常销售
            { threshold: 0, strategy: 'conservative' }     // 低库存：保守销售
        ]
    },
} as const;

// ==================== 资源列表 ====================
export const RESOURCE_LISTS = {
    // 基础资源
    BASE_RESOURCES: [
        RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM,
        RESOURCE_KEANIUM, RESOURCE_LEMERGIUM, RESOURCE_ZYNTHIUM, RESOURCE_CATALYST
    ] as ResourceConstant[],

    // 销售资源
    SELL_RESOURCES: [
        RESOURCE_MIST, RESOURCE_GHODIUM_MELT, RESOURCE_COMPOSITE, RESOURCE_CRYSTAL, RESOURCE_LIQUID,
        RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_ZYNTHIUM_BAR, RESOURCE_LEMERGIUM_BAR,
        RESOURCE_UTRIUM_BAR, RESOURCE_KEANIUM_BAR, RESOURCE_PURIFIER, RESOURCE_METAL, RESOURCE_BIOMASS,
        RESOURCE_SILICON, RESOURCE_KEANIUM_ACID, RESOURCE_GHODIUM_HYDRIDE, RESOURCE_GHODIUM_ACID, RESOURCE_OPS
    ] as ResourceConstant[],

    // 市场爬虫资源列表
    CRAWLER_RESOURCES: [
        RESOURCE_ENERGY, RESOURCE_POWER, RESOURCE_HYDROGEN, RESOURCE_LEMERGIUM, RESOURCE_GHODIUM,
        RESOURCE_SILICON, RESOURCE_METAL, RESOURCE_BIOMASS, RESOURCE_MIST, RESOURCE_HYDROXIDE,
        RESOURCE_ZYNTHIUM_KEANITE, RESOURCE_UTRIUM_LEMERGITE, RESOURCE_UTRIUM_HYDRIDE,
        RESOURCE_UTRIUM_OXIDE, RESOURCE_KEANIUM_HYDRIDE, RESOURCE_KEANIUM_OXIDE, RESOURCE_LEMERGIUM_HYDRIDE,
        RESOURCE_LEMERGIUM_OXIDE, RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_GHODIUM_HYDRIDE,
        RESOURCE_GHODIUM_OXIDE, RESOURCE_UTRIUM_ACID, RESOURCE_UTRIUM_ALKALIDE, RESOURCE_KEANIUM_ACID,
        RESOURCE_KEANIUM_ALKALIDE, RESOURCE_LEMERGIUM_ACID, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_ZYNTHIUM_ACID,
        RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_GHODIUM_ACID, RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_UTRIUM_ACID,
        RESOURCE_CATALYZED_UTRIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ACID, RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
        RESOURCE_CATALYZED_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ACID,
        RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
        RESOURCE_OPS, RESOURCE_UTRIUM_BAR, RESOURCE_LEMERGIUM_BAR, RESOURCE_ZYNTHIUM_BAR, RESOURCE_KEANIUM_BAR,
        RESOURCE_GHODIUM_MELT, RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_PURIFIER, RESOURCE_BATTERY,
        RESOURCE_COMPOSITE, RESOURCE_CRYSTAL, RESOURCE_LIQUID, RESOURCE_WIRE, RESOURCE_SWITCH, RESOURCE_TRANSISTOR,
        RESOURCE_MICROCHIP, RESOURCE_CIRCUIT, RESOURCE_DEVICE, RESOURCE_CELL, RESOURCE_PHLEGM, RESOURCE_TISSUE,
        RESOURCE_MUSCLE, RESOURCE_ORGANOID, RESOURCE_ORGANISM, RESOURCE_ALLOY, RESOURCE_TUBE, RESOURCE_FIXTURES,
        RESOURCE_FRAME, RESOURCE_HYDRAULICS, RESOURCE_MACHINE, RESOURCE_CONDENSATE, RESOURCE_CONCENTRATE,
        RESOURCE_EXTRACT, RESOURCE_SPIRIT, RESOURCE_EMANATION, RESOURCE_ESSENCE
    ] as ResourceConstant[],

    // 需要特殊销售阈值的资源(避免与生产冲突)
    SPECIAL_SELL_RESOURCES: [
        // 基础酸类 (生产阈值3000)
        RESOURCE_KEANIUM_ACID,
        RESOURCE_LEMERGIUM_ACID,
        RESOURCE_UTRIUM_ACID,
        RESOURCE_ZYNTHIUM_ACID,
        
        // 氢化物 (生产阈值3000)
        RESOURCE_KEANIUM_HYDRIDE,
        RESOURCE_LEMERGIUM_HYDRIDE,
        RESOURCE_UTRIUM_HYDRIDE,
        RESOURCE_ZYNTHIUM_HYDRIDE,
        
        // 氧化物 (生产阈值3000)
        RESOURCE_KEANIUM_OXIDE,
        RESOURCE_LEMERGIUM_OXIDE,
        RESOURCE_UTRIUM_OXIDE,
        RESOURCE_ZYNTHIUM_OXIDE,
        
        // 碱化物 (生产阈值3000)
        RESOURCE_KEANIUM_ALKALIDE,
        RESOURCE_LEMERGIUM_ALKALIDE,
        RESOURCE_UTRIUM_ALKALIDE,
        RESOURCE_ZYNTHIUM_ALKALIDE,
        
        // Ghodium系列 (生产阈值3000)
        RESOURCE_GHODIUM_HYDRIDE,
        RESOURCE_GHODIUM_OXIDE,
        RESOURCE_GHODIUM_ALKALIDE,
        RESOURCE_GHODIUM_ACID
    ] as ResourceConstant[],
} as const;

// ==================== 辅助函数 ====================
export function getSellThreshold(resource: ResourceConstant): number {
    if (RESOURCE_LISTS.SPECIAL_SELL_RESOURCES.includes(resource)) {
        return STORAGE_THRESHOLDS.SELL_THRESHOLDS.SPECIAL;
    }
    return STORAGE_THRESHOLDS.SELL_THRESHOLDS.DEFAULT;
}

export function getSpecialPrice(resource: ResourceConstant): number | undefined {
    return SALES_CONFIG.SPECIAL_PRICES[resource];
}

export function hasSpecialPrice(resource: ResourceConstant): boolean {
    return resource in SALES_CONFIG.SPECIAL_PRICES;
}
