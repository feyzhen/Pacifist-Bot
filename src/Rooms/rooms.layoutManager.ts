/**
 * 房间布局管理器
 * 负责自动建筑布局系统
 */


export interface LayoutConfig {
    forceReplan: boolean;
    minControllerLevel: number;
    enabledRooms: string[];
}

class LayoutManager {
    private config: LayoutConfig;
    private defaultConfig: LayoutConfig = {
        forceReplan: false,
        minControllerLevel: 3,
        enabledRooms: []  // 空数组表示所有房间都启用
    };

    constructor() {
        this.config = this.loadConfig();
    }

    /**
     * 加载配置
     */
    private loadConfig(): LayoutConfig {
        if (Memory.layoutConfig) {
            return { ...this.defaultConfig, ...Memory.layoutConfig };
        }
        return { ...this.defaultConfig };
    }

    /**
     * 保存配置
     */
    private saveConfig(): void {
        Memory.layoutConfig = this.config;
    }

    /**
     * 检查房间是否启用自动规划
     */
    private isRoomEnabled(roomName: string): boolean {
        return this.config.enabledRooms.length === 0 || this.config.enabledRooms.includes(roomName);
    }

    /**
     * 检查房间是否满足自动规划条件
     */
    private shouldUseAutoPlanner(room: Room): boolean {
        if (!this.isRoomEnabled(room.name)) {
            return false;
        }

        if (room.controller.level < this.config.minControllerLevel) {
            return false;
        }

        // 检查房间是否已经有布局
        if (room.memory.layout && !this.config.forceReplan) {
            return false;
        }

        return true;
    }

    /**
     * 主要的布局管理函数
     */
    public manageRoomLayout(room: Room): void {
        console.log(`[LayoutManager] 处理房间 ${room.name} 的布局`);

        if (this.shouldUseAutoPlanner(room)) {
            console.log(`[LayoutManager] 使用自动规划器处理房间 ${room.name}`);
            const success = this.useAutoPlanner(room);
            
            if (success) {
                console.log(`[LayoutManager] 房间 ${room.name} 自动规划成功`);
                // 记录规划时间
                room.memory.lastAutoPlan = Game.time;
            } else {
                console.log(`[LayoutManager] 房间 ${room.name} 自动规划失败`);
            }
        } else {
            console.log(`[LayoutManager] 房间 ${room.name} 已有布局或条件不满足，跳过规划`);
        }
    }

    /**
     * 使用自动规划系统
     */
    private useAutoPlanner(room: Room): boolean {
        try {
            // 使用全局的PlannerWrapper
            const plannerWrapper = (global as any).PlannerWrapper;
            if (!plannerWrapper) {
                console.log(`[LayoutManager] PlannerWrapper 未加载`);
                return false;
            }

            // 运行规划
            const planSuccess = plannerWrapper.runPlan(room.name);
            if (!planSuccess) {
                console.log(`[LayoutManager] 房间 ${room.name} 规划失败`);
                return false;
            }

            // 应用布局
            const applySuccess = plannerWrapper.applyLayout(room.name);
            if (!applySuccess) {
                console.log(`[LayoutManager] 房间 ${room.name} 应用布局失败`);
                return false;
            }

            // 保存到Memory
            plannerWrapper.savePlanToMemory(room.name);
            
            return true;
        } catch (error) {
            console.log(`[LayoutManager] 自动规划系统在房间 ${room.name} 出错: ${error}`);
            return false;
        }
    }


    /**
     * 设置配置
     */
    public setConfig(newConfig: Partial<LayoutConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        console.log(`[LayoutManager] 配置已更新: ${JSON.stringify(this.config)}`);
    }

    /**
     * 获取配置
     */
    public getConfig(): LayoutConfig {
        return { ...this.config };
    }

    /**
     * 启用房间的自动规划
     */
    public enableAutoPlanner(roomName: string): void {
        if (!this.config.enabledRooms.includes(roomName)) {
            this.config.enabledRooms.push(roomName);
            this.saveConfig();
            console.log(`[LayoutManager] 已为房间 ${roomName} 启用自动规划`);
        }
    }

    /**
     * 禁用房间的自动规划
     */
    public disableAutoPlanner(roomName: string): void {
        const index = this.config.enabledRooms.indexOf(roomName);
        if (index > -1) {
            this.config.enabledRooms.splice(index, 1);
            this.saveConfig();
            console.log(`[LayoutManager] 已为房间 ${roomName} 禁用自动规划`);
        }
    }

    /**
     * 强制重新规划指定房间
     */
    public forceReplanRoom(roomName: string): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`[LayoutManager] 房间 ${roomName} 不存在或不可见`);
            return false;
        }

        console.log(`[LayoutManager] 强制重新规划房间 ${roomName}`);
        return this.useAutoPlanner(room);
    }

    /**
     * 获取房间布局状态
     */
    public getRoomLayoutStatus(roomName: string): any {
        const room = Game.rooms[roomName];
        if (!room) {
            return { error: '房间不存在或不可见' };
        }

        return {
            roomName,
            hasLayout: !!room.memory.layout,
            layoutVersion: room.memory.layoutVersion,
            layoutTime: room.memory.layoutTime,
            lastAutoPlan: room.memory.lastAutoPlan,
            controllerLevel: room.controller.level,
            isAutoPlannerEnabled: this.isRoomEnabled(roomName),
            shouldUseAutoPlanner: this.shouldUseAutoPlanner(room)
        };
    }


    /**
     * 清除房间布局
     */
    public clearRoomLayout(roomName: string): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            return false;
        }

        // 清除工地
        const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        for (const site of constructionSites) {
            site.remove();
        }

        // 清除memory中的布局
        delete room.memory.layout;
        delete room.memory.layoutVersion;
        delete room.memory.layoutTime;
        delete room.memory.lastAutoPlan;

        console.log(`[LayoutManager] 已清除房间 ${roomName} 的布局`);
        return true;
    }
}

// 创建全局实例
const layoutManager = new LayoutManager();

export default layoutManager;

// 导出便捷函数
export const manageRoomLayout = (room: Room) => layoutManager.manageRoomLayout(room);
export const setLayoutConfig = (config: Partial<LayoutConfig>) => layoutManager.setConfig(config);
export const getLayoutConfig = () => layoutManager.getConfig();
export const forceReplanRoom = (roomName: string) => layoutManager.forceReplanRoom(roomName);
export const getRoomLayoutStatus = (roomName: string) => layoutManager.getRoomLayoutStatus(roomName);
