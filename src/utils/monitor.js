/**
 * monitor.js
 * 基地可视化仪表盘模块
 * 用法: 在 main.js 中调用 monitor.visuals(room);
 */

module.exports = {
    // 渲染仪表盘
    visuals: function(room) {
        if (!room) return;
        const visual = new RoomVisual(room.name);

        // 1. 获取基础数据
        const energy = room.energyAvailable;
        const capacity = room.energyCapacityAvailable;
        const rcl = room.controller ? room.controller.level : 0;
        const spawnStatus = room.memory.spawnStatus || "IDLE";
        const storage = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0;

        // 2. 绘制面板背景
        visual.rect(0, 0, 10, 5, { fill: '#000000', opacity: 0.5, stroke: '#fff' });

        // 3. 绘制文字信息
        visual.text(`ROOM: ${room.name}`, 0.5, 0.8, { align: 'left', color: '#fff', font: 0.5 });
        visual.text(`RCL: ${rcl}`, 0.5, 1.4, { align: 'left', color: '#ffd652', font: 0.5 });

        // 能源条
        let energyPercent = energy / capacity;
        visual.text(`Energy: ${energy}/${capacity}`, 0.5, 2.0, { align: 'left', color: energyPercent > 0.5 ? '#66ff66' : '#ff6666', font: 0.5 });
        visual.rect(0.5, 2.2, 8 * energyPercent, 0.2, { fill: energyPercent > 0.5 ? '#66ff66' : '#ff6666' });

        // 状态显示
        visual.text(`Status: ${spawnStatus}`, 0.5, 2.8, { align: 'left', color: '#aaa', font: 0.4 });

        // 仓库储备
        visual.text(`Storage: ${Math.floor(storage/1000)}k`, 0.5, 3.4, { align: 'left', color: '#aaa', font: 0.5 });
    }
};

