/**
 * 实验室生产阈值常量
 * 定义各种化合物的生产暂停和恢复阈值
 */

// import { ResourceConstant } from "game/constants";

// 基础生产阈值
export const LAB_BASE_THRESHOLD = 1000;
export const LAB_PRODUCTION_THRESHOLD = 3000;

// 特殊资源生产阈值
export const LAB_SPECIAL_THRESHOLDS: Partial<Record<ResourceConstant, { pause: number; resume: number }>> = {
    // 基础酸类
    [RESOURCE_KEANIUM_ACID]: { pause: 3000, resume: 1000 },
    [RESOURCE_LEMERGIUM_ACID]: { pause: 3000, resume: 1000 },
    [RESOURCE_UTRIUM_ACID]: { pause: 3000, resume: 1000 },
    [RESOURCE_ZYNTHIUM_ACID]: { pause: 3000, resume: 1000 },

    // 氢化物
    [RESOURCE_KEANIUM_HYDRIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_LEMERGIUM_HYDRIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_UTRIUM_HYDRIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_ZYNTHIUM_HYDRIDE]: { pause: 3000, resume: 1000 },

    // 氧化物
    [RESOURCE_KEANIUM_OXIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_LEMERGIUM_OXIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_UTRIUM_OXIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_ZYNTHIUM_OXIDE]: { pause: 3000, resume: 1000 },

    // 碱化物
    [RESOURCE_KEANIUM_ALKALIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_LEMERGIUM_ALKALIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_UTRIUM_ALKALIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_ZYNTHIUM_ALKALIDE]: { pause: 3000, resume: 1000 },

    // Ghodium系列
    [RESOURCE_GHODIUM]: { pause: 20000, resume: 10000 },
    [RESOURCE_GHODIUM_HYDRIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_GHODIUM_OXIDE]: { pause: 3000, resume: 1000 },
    [RESOURCE_GHODIUM_ALKALIDE]: { pause: 3000, resume: 1000 },

    // 催化剂
    [RESOURCE_CATALYZED_KEANIUM_ACID]: { pause: 10000, resume: 0 },
    [RESOURCE_CATALYZED_LEMERGIUM_ACID]: { pause: 10000, resume: 0 },
    [RESOURCE_CATALYZED_UTRIUM_ACID]: { pause: 10000, resume: 0 },
    [RESOURCE_CATALYZED_ZYNTHIUM_ACID]: { pause: 10000, resume: 0 },
    [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]: { pause: 3000, resume: 0 },

    // 特殊资源
    [RESOURCE_HYDROXIDE]: { pause: 10000, resume: 1000 },
    [RESOURCE_ZYNTHIUM_KEANITE]: { pause: 3000, resume: 1000 },
    [RESOURCE_UTRIUM_LEMERGITE]: { pause: 3000, resume: 1000 },
};

// 获取资源生产阈值的辅助函数
export function getLabThreshold(resource: ResourceConstant): { pause: number; resume: number } {
    return LAB_SPECIAL_THRESHOLDS[resource] || {
        pause: LAB_PRODUCTION_THRESHOLD,
        resume: LAB_BASE_THRESHOLD
    };
}

// 检查是否应该暂停生产
export function shouldPauseProduction(resource: ResourceConstant, currentAmount: number): boolean {
    const threshold = getLabThreshold(resource);
    return currentAmount >= threshold.pause;
}

// 检查是否应该恢复生产
export function shouldResumeProduction(resource: ResourceConstant, currentAmount: number): boolean {
    const threshold = getLabThreshold(resource);
    return currentAmount < threshold.resume;
}
