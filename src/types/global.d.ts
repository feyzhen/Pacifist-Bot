// 扩展 Screeps Creep 接口以包含自定义方法
declare global {
  interface Creep {
    Boost: () => boolean | "done";
    Speak: () => void;
    evacuate: any;
    findFillerTarget: any;
    findSource: () => object;
    findSpawn: () => object | void;
    findStorage: () => object | void;
    findClosestLink: () => object | void;
    findClosestLinkToStorage: () => object | void;
    withdrawStorage: (storage: StructureStorage | StructureContainer) => number | void;
    moveToRoom: (roomName: string, travelTarget_x?: number, travelTarget_y?: number, ignoreRoadsBool?: boolean, swampCostValue?: number, rangeValue?: number) => void;
    moveToRoomAvoidEnemyRooms: any;
    harvestEnergy: any;
    acquireEnergyWithContainersAndOrDroppedEnergy: any;
    roadCheck: () => boolean;
    roadlessLocation: (RoomPosition: object) => RoomPosition | null;
    fleeHomeIfInDanger: () => void | string;
    fleeFromMelee: (creep: Creep) => void;
    fleeFromRanged: (creep: Creep) => void;
    moveAwayIfNeedTo: any;
    Sweep: () => string | number | false;
    recycle: () => void;
    RangedAttackFleeFromMelee: any;
    SwapPositionWithCreep: any;
    MoveCostMatrixRoadPrio: any;
    MoveCostMatrixSwampPrio: any;
    MoveCostMatrixIgnoreRoads: any;
    roomCallbackRoadPrioUpgraderInPosition: any;
    moveToSafePositionToRepairRampart: any;
    MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch: any;
    MoveToSourceSafely: any;

    // 新增的模块化方法
    smartMoveTo: (target: any, range?: number) => any;
    avoidEnemiesMoveTo: (target: any, range?: number) => any;
    roadMoveTo: (target: any, range?: number) => any;
    retreat: () => boolean;
    isStuck: () => boolean;
    handleStuck: () => boolean;
    getEnergy: () => any;
    storeEnergy: () => any;
    transferEnergy: (target?: Creep) => any;
    needsEnergy: () => boolean;
    isFullOfEnergy: () => boolean;
    getTotalCarry: () => number;
    getEnergyCarry: () => number;
    hasEmptyCapacity: () => boolean;
    getWorkingStatus: () => string;
  }

  interface RoomMemory {
    defence?: {
      towerShotsInRow: number;
      nuke?: boolean;
      evacuate?: boolean;
    };
    defenceRadius?: number;
    blown_fuse?: boolean;
    layout?: { [structureType: string]: { x: number; y: number }[] };
    layoutVersion?: string;
    layoutTime?: number;
    lastAutoPlan?: number;
    layoutRCL?: number;
    containerStats?: { [containerId: string]: { lastFull: number; totalTransferred: number } };
    linkStats?: { [linkId: string]: { lastTransfer: number; totalTransferred: number } };
    keepTheseRoads?: string[];
    roadConstructionSites?: string[];
    data?: {
      DOB: number;
      c_spawned: number;
      [key: string]: any;
    };
    rampartsCompleted?: boolean;
  }

  interface CreepMemory {
    fleeing?: boolean;
    homeRoom?: string;
    targetRoom?: string;
    targetBuildingId?: string;
    targetPos?: RoomPosition;
  }
// 布局管理全局函数
  interface Global {
    enableAutoPlanner: (roomName?: string) => void;
    disableAutoPlanner: (roomName?: string) => void;
    forceReplan: (roomName: string) => void;
    layoutStatus: (roomName: string) => void;
    clearLayout: (roomName: string) => void;
    setLayoutConfig: (config: any) => void;
    getLayoutConfig: () => void;
    batchReplan: (roomNames: string[]) => void;
    allLayoutStatus: () => void;
    enableRooms: (roomNames: string[]) => void;
    checkPerformance: (roomName: string) => void;
    enableAllAutoPlanner: () => void;
    RP: (roomName: string) => void;
    VP: (roomName: string) => void;
    SP: (roomName: string) => void;
  }
}

export {};

// Memory类型扩展
declare global {
  interface Memory {
    layoutConfig?: {
      forceReplan: boolean;
      minControllerLevel: number;
      enabledRooms: string[];
    };
    roomPlanner?: {
      [roomName: string]: {
        layout: { [structureType: string]: { x: number; y: number }[] };
        timestamp: number;
        savedAt: number;
      };
    };
    buildingStrategy?: {
      [roomName: string]: {
        mode: 'AUTO' | 'SAFE' | 'SMART' | 'AGGRESSIVE';
        enabled: boolean;
        lastMigration: number;
        backupId: string;
      };
    };
  }
}
