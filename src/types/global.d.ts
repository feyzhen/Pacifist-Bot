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
  }

  interface RoomMemory {
    defence?: {
      towerShotsInRow: number;
      nuke?: boolean;
      evacuate?: boolean;
    };
    blown_fuse?: boolean;
  }

  interface CreepMemory {
    fleeing?: boolean;
  }
}

export {};
