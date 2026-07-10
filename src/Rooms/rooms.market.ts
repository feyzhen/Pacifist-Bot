import {
  CREDIT_REQUIREMENTS,
  getSellThreshold,
  getSpecialPrice,
  hasSpecialPrice,
  PURCHASE_CONFIG,
  RESOURCE_LISTS,
  SALES_CONFIG,
  STORAGE_THRESHOLDS
} from "../constants/constants.market";

import { getLabThreshold } from "../constants/constants.labs";

function market(room):any {
    // ========== ensureSingleSellOrder: 确保某个资源有且仅有一个卖单 ==========
    // 职责：扫描市场上所有本房间本资源的卖单 → 多余的取消 → 没有则创建 → 返回唯一有效 ID
    // 不依赖 memory 状态，每次调用都从市场真实扫描
    function ensureSingleSellOrder(resource: ResourceConstant, price: number, totalAmount: number): string | null {
        const myOrders: string[] = [];
        for (const orderID in Game.market.orders) {
            const order = Game.market.orders[orderID];
            if (order.roomName === room.name &&
                order.resourceType === resource &&
                order.type === ORDER_SELL) {
                myOrders.push(orderID);
            }
        }

        // 如果有多个（幽灵单/重复单），全部取消只剩最后一个
        if (myOrders.length > 1) {
            for (let i = 0; i < myOrders.length - 1; i++) {
                Game.market.cancelOrder(myOrders[i]);
            }
        }

        // 如果没有卖单，创建一个
        if (myOrders.length === 0) {
            const result = Game.market.createOrder({
                type: ORDER_SELL,
                resourceType: resource,
                price: price,
                totalAmount: totalAmount,
                roomName: room.name
            });
            if (result === 0) {
                // 创建成功后，再次扫描确认 ID
                for (const orderID in Game.market.orders) {
                    const order = Game.market.orders[orderID];
                    if (order.roomName === room.name &&
                        order.resourceType === resource &&
                        order.type === ORDER_SELL) {
                        return orderID;
                    }
                }
            }
            return null; // 创建失败或找不到
        }

        // ====== 有且仅有 1 个卖单：更新价格和数量 ======
        const existingID = myOrders[myOrders.length - 1];
        const existing = Game.market.orders[existingID];
        if (!existing) {
            // 卖单已被市场回收，清理后返回 null
            return null;
        }

        let updated = false;

        // 价格偏差超过 5% 时自动更新（避免频繁调价）
        if (Math.abs(existing.price - price) > price * 0.05) {
            Game.market.changeOrderPrice(existingID, price);
            updated = true;
        }

        // 剩余量不足时自动补充
        if (existing.remainingAmount < totalAmount) {
            const extendAmount = Math.min(totalAmount, 2000) - existing.remainingAmount;
            if (extendAmount > 0) {
                Game.market.extendOrder(existingID, extendAmount);
                updated = true;
            }
        }

        if (updated) {
            console.log(`[ensureSingleSellOrder] Updated ${resource} sell order: price=${price}, amount=${totalAmount}`);
        }

        return existingID;
    }

    if(room.terminal && room.terminal.cooldown == 0 && room.storage && room.memory.Structures.spawn && Game.getObjectById(room.memory.Structures.spawn) && Game.time % 10 == 0 && (Game.cpu.bucket > 1000 || Memory.pixelManager?.enabled)) {
        const BaseResources = RESOURCE_LISTS.BASE_RESOURCES;
        const Mineral:any = Game.getObjectById(room.memory.mineral) || room.findMineral();



        const resourceToSell = Mineral.mineralType;
        // if(room.terminal.store[RESOURCE_ENERGY] >= 1500 && room.terminal.store[RESOURCE_HYDROGEN] >= 20000) {
        //     resourceToSell = RESOURCE_HYDROGEN;
        // }
        // else if(room.terminal.store[RESOURCE_ENERGY] >= 1500 && room.terminal.store[RESOURCE_OXYGEN] >= 20000) {
        //     resourceToSell = RESOURCE_OXYGEN;
        // }
        // else if(room.terminal.store[RESOURCE_ENERGY] >= 1500 && room.terminal.store[RESOURCE_UTRIUM] >= 20000) {
        //     resourceToSell = RESOURCE_UTRIUM;
        // }
        // else if(room.terminal.store[RESOURCE_ENERGY] >= 1500 && room.terminal.store[RESOURCE_KEANIUM] >= 20000) {
        //     resourceToSell = RESOURCE_KEANIUM;
        // }
        // else if(room.terminal.store[RESOURCE_ENERGY] >= 1500 && room.terminal.store[RESOURCE_LEMERGIUM] >= 20000) {
        //     resourceToSell = RESOURCE_LEMERGIUM;
        // }
        // else if(room.terminal.store[RESOURCE_ENERGY] >= 1500 && room.terminal.store[RESOURCE_ZYNTHIUM] >= 20000) {
        //     resourceToSell = RESOURCE_ZYNTHIUM;
        // }
        // else if(room.terminal.store[RESOURCE_ENERGY] >= 1500 && room.terminal.store[RESOURCE_CATALYST] >= 20000) {
        //     resourceToSell = RESOURCE_CATALYST;
        // }
        // else {
        //     resourceToSell = false;
        // }

        if(room.terminal.store.getUsedCapacity() > STORAGE_THRESHOLDS.BASE_RESOURCES.TERMINAL_CAPACITY && room.terminal.store[resourceToSell] > STORAGE_THRESHOLDS.SELL_THRESHOLDS.ROOM_MINERAL_AMOUNT) {
            const orders = Game.market.getAllOrders(order => order.resourceType == resourceToSell &&
                order.type == ORDER_BUY);

            console.log(resourceToSell, "buy orders found:", orders.length);
            orders.sort(function(a,b){return b.price - a.price;});
            if(orders[0] != undefined) {
                const orderQuantity = 500;
                const result = Game.market.deal(orders[0].id, orderQuantity, room.name);
                if(result == 0) {
                    console.log("Successful sell on", resourceToSell, "at the price of", orders[0].price, "and quantity of", orderQuantity);
                    return;

                }
            }
        }

        if(room.terminal.store[resourceToSell] >= STORAGE_THRESHOLDS.SELL_THRESHOLDS.ROOM_MINERAL) {
            const orderID = ensureSingleSellOrder(
                resourceToSell,
                CalcPriceForOrder(resourceToSell, room.terminal.store[resourceToSell]),
                5000
            );

            if (orderID) {
                const order = Game.market.orders[orderID];
                if (order) {
                    // ensureSingleSellOrder 已处理价格和数量的更新
                    // 仅在特定条件下补充量（确保至少保持 5000）
                    if (order.remainingAmount < 2000) {
                        Game.market.extendOrder(orderID, 4000);
                    }
                }
            }
        }

        function CalcPriceForOrder(resourceToSell, resourceStored) {
            const resourceData = Game.market.getHistory(resourceToSell);
            let myTotalAverage = 0;
            let myTotalStDevAverage = 0;
            let weightNumber = 1;
            if(resourceData && resourceData.length > 0) {
                for(const day of resourceData) {

                    myTotalAverage += day.avgPrice * weightNumber;
                    myTotalStDevAverage += day.stddevPrice * weightNumber;
                    weightNumber ++;
                }
                const Average = myTotalAverage / 105;
                const AverageStDev = myTotalStDevAverage / 105;
                console.log(Average, "averageprice", AverageStDev, "average St Dev")

                if(resourceStored >= 100000) {
                    if(Average > 6) {
                        return Average - 6
                    }
                    return Average
                }
                else if(resourceStored >= 80000) {
                    if(Average > 4) {
                        return Average - 4
                    }
                    return Average
                }
                else if(resourceStored >= 60000) {
                    if(Average > 2) {
                        return Average - 2
                    }
                    return Average
                }
                else {
                    return Average + AverageStDev;
                }
            }
            else {
                return 0.009;
            }



        }

        function CalcPriceForSale(resource: ResourceConstant, resourceStored: number): number {
            const resourceData = Game.market.getHistory(resource);
            if (!resourceData || resourceData.length === 0) {
                return 2; // 默认最低价格
            }

            // 提取 stddevPrice，用 IQR 法过滤异常日
            const stdDevs = resourceData.map(d => d.stddevPrice).filter(v => v > 0);
            let filteredStdDevDays = resourceData;
            if (stdDevs.length > 0) {
                const sorted = [...stdDevs].sort((a, b) => a - b);
                const q1Idx = Math.floor(sorted.length * 0.25);
                const q3Idx = Math.floor(sorted.length * 0.75);
                const q1 = sorted[q1Idx];
                const q3 = sorted[q3Idx];
                const iqr = q3 - q1;
                const upperBound = q3 + 1.5 * iqr;
                filteredStdDevDays = resourceData.filter(d => d.stddevPrice <= upperBound);
                if (filteredStdDevDays.length === 0) {
                    // 全部被过滤，回退到原始数据
                    filteredStdDevDays = resourceData;
                }
            }

            // 计算加权平均价格（基于过滤后的数据）
            let totalAverage = 0;
            let totalStDev = 0;
            let weight = 1;
            const divisor = filteredStdDevDays.length * (filteredStdDevDays.length + 1) / 2;

            for (const day of filteredStdDevDays) {
                totalAverage += day.avgPrice * weight;
                totalStDev += day.stddevPrice * weight;
                weight++;
            }

            const average = totalAverage / divisor;
            const stDev = totalStDev / divisor;

            // 根据库存量调整价格策略
            if (resourceStored >= 5000) {
                // 高库存：积极销售，价格略低于市场均价
                return Math.max(2, average);
            } else if (resourceStored >= 2000) {
                // 中等库存：正常销售，按市场均价
                return Math.max(2, average + stDev);
            } else if (resourceStored >= 100) {
                // 低库存：保守销售，价格略高于市场均价
                return Math.max(2, average + stDev * 2, average * 1.2);
            } else {
                // 极低库存：保守销售，价格更高
                return Math.max(2, average + (stDev * 5));
            }
        }
//------------------------------------------------------------------------------------------------------------------------------------------------

        // buy section
        if(!Memory.my_goods) {
            Memory.my_goods = {
                "H":[],
                "O":[],
                "U":[],
                "K":[],
                "L":[],
                "Z":[],
                "X":[]
            }
        }
        if(Memory.my_goods[Mineral.mineralType].length == 0 || !Memory.my_goods[Mineral.mineralType].includes(room.name, 0)) {
            Memory.my_goods[Mineral.mineralType].push(room.name);
        }
        else if(Game.time % 10000 == 0) {
            Memory.my_goods = false;
        }

        if(room.terminal.store[RESOURCE_ENERGY] >= 2000) {

            if(room.memory.Structures.spawn && Game.getObjectById(room.memory.Structures.spawn) && room.storage) {
                for(const resource of BaseResources) {
                    if(room.terminal.store[resource] < 8000 && resource != Mineral.mineralType) {
                        if(Memory.my_goods[resource] && Memory.my_goods[resource].length > 0) {
                            for(const room_with_mineral of Memory.my_goods[resource]) {
                                if(!Game.rooms[room_with_mineral]) {
                                    Memory.my_goods[resource].filter(function(r) {return r !== room_with_mineral;});
                                    break;
                                }
                                if(Game.rooms[room_with_mineral].terminal && Game.rooms[room_with_mineral].terminal.store[resource] >= 1000) {
                                    Game.rooms[room_with_mineral].terminal.send(resource, 1000, room.name, "enjoy this " + resource + " other room!");
                                    console.log("sending", room.name, "1000", resource)
                                    break;
                                }
                            }
                        }
                    }
                }
            }





            // for(let resource of BaseResources) {
            //     if(room.terminal.store[resource] < 5000 && resource != Mineral.mineralType || room.terminal.store[resource] < 1000 && resource == Mineral.mineralType) {
            //         let result = buy_resource(resource, 5);
            //         if(result == 0) {
            //             return;
            //         }
            //     }
            // }

            if(room.controller.level >= 7 && Game.market.credits > CREDIT_REQUIREMENTS.BASE_RESOURCE_PURCHASE.SHARD3 && Game.shard.name == "shard3" || Game.shard.name !== "shard3" && Game.market.credits >= CREDIT_REQUIREMENTS.BASE_RESOURCE_PURCHASE.OTHER) {
                if(room.terminal.store.getFreeCapacity() > 1000) {
                    // 使用常量定义的分层购买策略
                    for(const tier of PURCHASE_CONFIG.BASE_RESOURCES.PRICE_TIERS) {
                        for(const resource of BaseResources) {
                            const threshold = tier.price === 2 ? STORAGE_THRESHOLDS.RESOURCE_STOCK.BASE_MAX :
                                             tier.price === 50 ? 7000 :
                                             tier.price === 100 ? 6000 : 5000;

                            if(room.terminal.store[resource] < threshold && resource != Mineral.mineralType ||
                               room.terminal.store[resource] < STORAGE_THRESHOLDS.RESOURCE_STOCK.LOCAL_MIN && resource == Mineral.mineralType) {
                                const result = buy_resource(resource, tier.price);
                                if(result == 0) {
                                    return;
                                }
                            }
                        }
                    }

                    if(room.controller.level >= 8 && Game.market.credits > CREDIT_REQUIREMENTS.POWER_PURCHASE) {
                        // check if terminal + storage have less than power threshold
                        // if so, buy power
                        if(room.terminal.store[RESOURCE_POWER] + room.storage.store[RESOURCE_POWER] < STORAGE_THRESHOLDS.RESOURCE_STOCK.POWER_TOTAL) {
                            const result = buy_resource(RESOURCE_POWER, PURCHASE_CONFIG.SPECIAL_RESOURCES.POWER.price, PURCHASE_CONFIG.SPECIAL_RESOURCES.POWER.amount);
                            if(result == 0) {
                                return;
                            }
                        }
                    }
                }
            }




            // for(let resource of BaseResources) {
            //     if(room.terminal.store[resource] < 1000 && resource != Mineral.mineralType || room.terminal.store[resource] < 800 && resource == Mineral.mineralType) {
            //         let result = buy_resource(resource, 60);
            //         if(result == 0) {
            //             return;
            //         }
            //     }
            // }


            const SellResources = RESOURCE_LISTS.SELL_RESOURCES;



            for(const resource of SellResources) {

                if(resource === RESOURCE_OPS && room.terminal.store[resource] < STORAGE_THRESHOLDS.RESOURCE_STOCK.OPS_MIN) {
                    continue;
                }

                // 使用常量定义的销售阈值，避免与生产阈值冲突
                const sellThreshold = getSellThreshold(resource);

                // 优雅的销售逻辑：只使用该资源的销售阈值
                if(room.terminal.store[resource] >= sellThreshold) {
                    const result = sell_resource(resource, null, 1000, sellThreshold);
                    if(result == 0) {
                        return;
                    }
                }

                // 小额清理销售（可选）
                // if(room.terminal.store[resource] >= 100 && Game.time % 100 === 0) {
                //     const result = sell_resource(resource, undefined, 100);
                //     if(result == 0) {
                //         return;
                //     }
                // }
            }


            // for(let resource of BaseResources) {
            //     if(room.terminal.store[resource] < 5000 && resource != Mineral.mineralType || room.terminal.store[resource] < 1000 && resource == Mineral.mineralType) {
            //         let result = buy_resource(resource, 15);
            //         if(result == 0) {
            //             return;
            //         }
            //     }
            // }

            // if(Game.time % 41 == 0) {
            //     for(let resource of BaseResources) {
            //         if(room.terminal.store[resource] < 5000 && resource != Mineral.mineralType || room.terminal.store[resource] < 1000 && resource == Mineral.mineralType) {
            //             let result = buy_resource(resource, 20);
            //             if(result == 0) {
            //                 return;
            //             }
            //         }
            //     }
            // }
        }

        function buy_resource(resource:ResourceConstant, OrderPrice:number=5, OrderAmount=1000):any | void {
            const OrderMaxEnergy = OrderAmount * PURCHASE_CONFIG.BASE_RESOURCES.ENERGY_COST_MULTIPLIER;
            let orders = Game.market.getAllOrders({type: ORDER_SELL, resourceType: resource});
            orders = _.filter(orders, (order) => Game.market.calcTransactionCost(OrderAmount, room.name, order.roomName) <= OrderMaxEnergy && order.price <= OrderPrice);
            if(orders.length > 0) {
                orders.sort((a,b) => a.price - b.price);
                const orderID = orders[0].id;
                const newOrderAmount = orders[0].amount;
                console.log(JSON.stringify(orders[0]))
                console.log(Game.market.calcTransactionCost(newOrderAmount, room.name, orders[0].roomName));

                const result = Game.market.deal(orderID, newOrderAmount, room.name);
                if(result == 0) {
                    console.log(
                        newOrderAmount,
                        resource,
                        "Bought at Price:",
                        orders[0].price,
                        "=",
                        newOrderAmount * orders[0].price
                    );
                    return result;
                }
                else {
                    console.log(result);
                }
            }
            else {
                // console.log("no order found below price of", OrderPrice, "for", resource, room.name)
            }
        }

        function sell_resource(resource:ResourceConstant, minPrice:number|null=5, OrderAmount=100, sellThreshold:number=1000):any | void {
            // 如果没有指定最低价格（null或undefined），使用动态价格计算
            // 注意：JS默认参数对 undefined 会用默认值，所以传 undefined 时 minPrice=5
            // 要用 null 来表示"不传最低价，使用动态定价"
            const terminalStore = room.terminal.store[resource];
            const dynamicPrice =
                minPrice !== null && minPrice !== undefined ? minPrice : CalcPriceForSale(resource, terminalStore);
            console.log("Dynamic Price:", dynamicPrice);

            // ====== Step 1: 先尝试 deal（直接卖给买单，最快成交） ======
            const OrderMaxEnergy = OrderAmount * SALES_CONFIG.BASE_SALES.ENERGY_COST_MULTIPLIER;
            let buyOrders = Game.market.getAllOrders({type: ORDER_BUY, resourceType: resource});

            buyOrders = _.filter(buyOrders, (order) => order.amount >= OrderAmount && Game.market.calcTransactionCost(OrderAmount, room.name, order.roomName) <= OrderMaxEnergy && order.price >= dynamicPrice);

            // Debug: notify when a deal is about to happen
            if (buyOrders.length > 0) {
                const history = Game.market.getHistory(resource) || [];
                const debugMsg = [
                    `[MarketDebug] DEAL`,
                    `room=${room.name}`,
                    `res=${resource}`,
                    `termStore=${terminalStore}`,
                    `dynPrice=${dynamicPrice.toFixed(2)}`,
                    `calDynPrice=${CalcPriceForSale(resource, terminalStore).toFixed(2)}`,
                    `amt=${OrderAmount}`,
                    `matched=${buyOrders.length}`,
                    `best={id:${buyOrders[0].id},price:${buyOrders[0].price},amt:${buyOrders[0].amount},from:${buyOrders[0].roomName}}`,
                    `histLen=${history.length}`
                ].join('|');
                // Game.notify(debugMsg);
                console.log(JSON.stringify(debugMsg))
            }

            if (buyOrders.length > 0) {
                // 有合适订单：deal 买单（优先，省挂单等待时间）
                buyOrders.sort((a,b) => b.price - a.price);
                const dealOrderID = buyOrders[0].id;
                console.log(JSON.stringify(buyOrders[0]));

                const result = Game.market.deal(dealOrderID, OrderAmount, room.name);
                if(result == 0) {
                    console.log(OrderAmount, resource, "Sold at Price:", buyOrders[0].price, "=", OrderAmount * buyOrders[0].price);
                    return result;
                }
                else {
                    console.log(result);
                }
                // deal 成功则直接 return，不再走卖单逻辑
                return;
            }

            // ====== Step 2: deal 失败（无合适买单）：维护卖单 ======
            // 确保有且仅有一个卖单（价格/数量会自动更新）
            const orderID = ensureSingleSellOrder(resource, dynamicPrice, OrderAmount);

            if (orderID) {
                const mySellOrder = Game.market.orders[orderID];
                if (!mySellOrder) {
                    // 卖单已被市场回收（过期/成交完），清理 memory
                    if (!room.memory.market) room.memory.market = {};
                    if (!room.memory.market.sellOrders) room.memory.market.sellOrders = {};
                    delete room.memory.market.sellOrders[resource];
                    return; // 没有卖单了
                }

                // 卖单存在：ensureSingleSellOrder 已处理价格和数量的更新
                // 这里只做兜底 extend（如果 ensureSingleSellOrder 没触发）
                if (mySellOrder.remainingAmount < OrderAmount) {
                    const needAmount = Math.min(terminalStore - sellThreshold, 2000) - mySellOrder.remainingAmount;
                    if (needAmount > 0) {
                        Game.market.extendOrder(mySellOrder.id, needAmount);
                    }
                }

                // 定期检查价格是否需要调整，防止市场价变动后卖单价格滞后
                if (Game.time % 400 === 0) {
                    const recPrice = CalcPriceForSale(resource, terminalStore);
                    if (Math.abs(mySellOrder.price - recPrice) > 2) {
                        Game.market.changeOrderPrice(mySellOrder.id, recPrice);
                        console.log(`[SellOrder] Periodic price adjust for ${resource}: ${mySellOrder.price.toFixed(2)} -> ${recPrice.toFixed(2)}`);
                    }
                }

                // 有卖单兜底，不需要 deal 了
                return;
            }

            // ====== Step 3: 卖单也创建失败：无计可施 ======
            console.log("[sell_resource] Failed to create sell order and no buy orders for", resource, room.name);
        }


        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        if(room.terminal.store[RESOURCE_ENERGY] > STORAGE_THRESHOLDS.BASE_RESOURCES.TERMINAL_ENERGY_MIN &&
           room.terminal.store[RESOURCE_ENERGY] < STORAGE_THRESHOLDS.BASE_RESOURCES.TERMINAL_ENERGY_MAX &&
           storage && storage.store[RESOURCE_ENERGY] < STORAGE_THRESHOLDS.BASE_RESOURCES.STORAGE_ENERGY_LOW) {

            const OrderPrice = PURCHASE_CONFIG.SPECIAL_RESOURCES.ENERGY.price;
            const OrderAmount = PURCHASE_CONFIG.SPECIAL_RESOURCES.ENERGY.amount;
            const OrderMaxEnergy = OrderAmount * PURCHASE_CONFIG.SPECIAL_RESOURCES.ENERGY.energyCostMultiplier;
            let orders = Game.market.getAllOrders({type: ORDER_SELL, resourceType: RESOURCE_ENERGY});
            orders = _.filter(orders, (order) => order.amount >= OrderAmount && Game.market.calcTransactionCost(OrderAmount, room.name, order.roomName) <= OrderMaxEnergy && order.price <= OrderPrice);
            if(orders.length > 0) {
                orders.sort((a,b) => a.price - b.price);
                const orderID = orders[0].id;

                console.log(JSON.stringify(orders[0]))
                console.log(Game.market.calcTransactionCost(OrderAmount, room.name, orders[0].roomName))

                const result = Game.market.deal(orderID, OrderAmount, room.name);
                if(result == 0) {
                    console.log(OrderAmount, RESOURCE_ENERGY, "Bought at Price:", orders[0].price, "=", OrderAmount * orders[0].price);
                    return;
                }
                else {
                    console.log(result);
                }
            }
            else {
                console.log("no order found below price of", OrderPrice, "for", RESOURCE_ENERGY)
            }

        }



        if(!Memory.resource_requests) {
            Memory.resource_requests = {
                "XLHO2":[],
                "XKHO2":[],
                "XUH2O":[],
                "XLH2O":[],
                "XGHO2":[],
                "XZHO2":[],
                "XZH2O":[],
                "XKH2O":[],
            };
        }
        const boostsToNeed = [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
                            RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
                            RESOURCE_CATALYZED_UTRIUM_ACID,
                            RESOURCE_CATALYZED_LEMERGIUM_ACID,
                            RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
                            RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                            RESOURCE_CATALYZED_ZYNTHIUM_ACID,
                            RESOURCE_CATALYZED_KEANIUM_ACID];

        for(const boost of boostsToNeed) {
            if(storage && storage.store[boost] < 10000 && room.terminal.store[boost] < 3000) {
                if(!Memory.resource_requests[boost].includes(room.name)) {
                    Memory.resource_requests[boost].push(room.name);
                }
            }
            else if(Memory.resource_requests[boost].length > 0) {
                Memory.resource_requests[boost] = Memory.resource_requests[boost].filter(function (roomName) {return roomName !== room.name;});
            }
        }


        for(const boost of boostsToNeed) {
            const threshold = getLabThreshold(boost)
            if(room.terminal && room.terminal.store[boost] > 500 && storage && storage.store[boost] > threshold.resume) {
                if(Memory.resource_requests[boost].length > 0) {
                    for(const roomName of Memory.resource_requests[boost]) {
                        if(roomName !== room.name && Game.rooms[roomName] &&
                            Game.rooms[roomName].memory.Structures.spawn &&
                            Game.getObjectById(Game.rooms[roomName].memory.Structures.spawn) &&
                            Game.rooms[roomName].storage) {
                            const roomObj = Game.rooms[roomName];
                            if(roomObj && roomObj.controller && roomObj.controller.level >= 6) {
                                const theirTerminal = roomObj.terminal;
                                const theirStorage:any = Game.getObjectById(roomObj.memory.Structures.storage);
                                if(theirTerminal && theirStorage &&
                                    theirTerminal.store.getFreeCapacity() > 10000 &&
                                    theirStorage.store.getFreeCapacity() > 10000) {
                                    room.terminal.send(boost, 500, roomName, "enjoy this " + boost + " other room!");
                                    console.log("sending", roomName, "500", boost)
                                    return;
                                }
                            }
                            else {
                                Memory.resource_requests[boost] = Memory.resource_requests[boost].filter(function (name) {return name !== roomName;});
                            }
                        }
                    }
                }
            }
        }




        // 使用常量定义的特殊资源销售逻辑
        const specialResources = [
            { resource: RESOURCE_CONDENSATE, threshold: 10, amount: 10 },
            { resource: RESOURCE_CONCENTRATE, threshold: 10, amount: 10 },
            { resource: RESOURCE_CONCENTRATE, threshold: 2, amount: 2 },
            { resource: RESOURCE_EXTRACT, threshold: 5, amount: 5 },
            { resource: RESOURCE_EXTRACT, threshold: 1, amount: 1 },
            { resource: RESOURCE_SPIRIT, threshold: 1, amount: 1 },
            { resource: RESOURCE_EMANATION, threshold: 1, amount: 1 },
            { resource: RESOURCE_ESSENCE, threshold: 1, amount: 1 },
            { resource: RESOURCE_WIRE, threshold: 10, amount: 10 },
            { resource: RESOURCE_SWITCH, threshold: 10, amount: 10 },
            { resource: RESOURCE_SWITCH, threshold: 2, amount: 2 },
            { resource: RESOURCE_TRANSISTOR, threshold: 5, amount: 5 },
            { resource: RESOURCE_TRANSISTOR, threshold: 1, amount: 1 },
            { resource: RESOURCE_MICROCHIP, threshold: 1, amount: 1 },
            { resource: RESOURCE_CIRCUIT, threshold: 1, amount: 1 },
            { resource: RESOURCE_DEVICE, threshold: 1, amount: 1 },
            { resource: RESOURCE_CELL, threshold: 10, amount: 10 },
            { resource: RESOURCE_PHLEGM, threshold: 10, amount: 10 },
            { resource: RESOURCE_PHLEGM, threshold: 2, amount: 2 },
            { resource: RESOURCE_TISSUE, threshold: 5, amount: 5 },
            { resource: RESOURCE_TISSUE, threshold: 1, amount: 1 },
            { resource: RESOURCE_MUSCLE, threshold: 1, amount: 1 },
            { resource: RESOURCE_ORGANOID, threshold: 1, amount: 1 },
            { resource: RESOURCE_ORGANISM, threshold: 1, amount: 1 },
            { resource: RESOURCE_ALLOY, threshold: 10, amount: 10 },
            { resource: RESOURCE_TUBE, threshold: 10, amount: 10 },
            { resource: RESOURCE_TUBE, threshold: 2, amount: 2 },
            { resource: RESOURCE_FIXTURES, threshold: 5, amount: 5 },
            { resource: RESOURCE_FIXTURES, threshold: 1, amount: 1 },
            { resource: RESOURCE_FRAME, threshold: 1, amount: 1 },
            { resource: RESOURCE_HYDRAULICS, threshold: 1, amount: 1 },
            { resource: RESOURCE_MACHINE, threshold: 1, amount: 1 }
        ];

        for(const item of specialResources) {
            if(room.terminal.store[item.resource] >= item.threshold) {
                const price = getSpecialPrice(item.resource);
                if(price) {
                    const result = sell_resource(item.resource, price, item.amount);
                    if(result == 0) {
                        return;
                    }
                }
            }
        }

        // 清空库存的特殊资源
        const clearResources = [RESOURCE_CONDENSATE, RESOURCE_CONCENTRATE, RESOURCE_WIRE, RESOURCE_SWITCH, RESOURCE_CELL, RESOURCE_PHLEGM, RESOURCE_ALLOY, RESOURCE_TUBE];
        for(const resource of clearResources) {
            if(room.terminal.store[resource] > 0) {
                const price = getSpecialPrice(resource);
                if(price) {
                    const result = sell_resource(resource, price, room.terminal.store[resource]);
                    if(result == 0) {
                        return;
                    }
                }
            }
        }


        // if(room.factory && room.terminal) {
        //     if(room.terminal.store[RESOURCE_ALLOY] >= 100) {
        //         let result = sell_resource(RESOURCE_ALLOY, 500);
        //         if(result == 0) {
        //             return;
        //         }
        //     }
        //     else if(room.terminal.store[RESOURCE_CELL] >= 100) {
        //         let result = sell_resource(RESOURCE_CELL, 500);
        //         if(result == 0) {
        //             return;
        //         }
        //     }
        //     else if(room.terminal.store[RESOURCE_WIRE] >= 100) {
        //         let result = sell_resource(RESOURCE_WIRE, 500);
        //         if(result == 0) {
        //             return;
        //         }
        //     }
        //     else if(room.terminal.store[RESOURCE_CONDENSATE] >= 100) {
        //         let result = sell_resource(RESOURCE_CONDENSATE, 500);
        //         if(result == 0) {
        //             return;
        //         }
        //     }
        // }


        // Pixel trading logic
        const pixelCfg = Memory.pixelManager || {};
        const keepAmount = pixelCfg.keepAmount ?? 500;
        const tradingEnabled = pixelCfg.tradingEnabled ?? true;

        if(tradingEnabled && Game.resources[PIXEL] > 0 && room.terminal && Game.time % 100 == 0) {
            const ownedPixels = Game.resources[PIXEL];
            const sellableAmount = ownedPixels - keepAmount;

            if(sellableAmount > 0) {
                // Try to sell to existing buy orders first
                const buyOrders = Game.market.getAllOrders({type: ORDER_BUY, resourceType: PIXEL});
                const filteredOrders = _.filter(buyOrders, (order) =>
                    order.amount >= 1 &&
                    Game.market.calcTransactionCost(1, room.name, order.roomName) <= 1000
                );

                if(filteredOrders.length > 0) {
                    filteredOrders.sort((a,b) => b.price - a.price);
                    const bestOrder = filteredOrders[0];
                    const sellAmount = Math.min(1, bestOrder.amount, sellableAmount);
                    const result = Game.market.deal(bestOrder.id, sellAmount, room.name);
                    if(result == 0) {
                        console.log(`[PixelTrading] Sold ${sellAmount} pixel at ${bestOrder.price} credits`);
                        return;
                    }
                }

                // If no good buy orders, create/update sell order
                if(Game.time % 500 == 0) {
                    const recPrice = calcPixelPrice();
                    const pixelOrderID = ensureSingleSellOrder(PIXEL as ResourceConstant, recPrice, sellableAmount);

                    if (pixelOrderID) {
                        const order = Game.market.orders[pixelOrderID];
                        if (order) {
                            console.log(`[PixelTrading] Sell order active: ${order.remainingAmount}/${sellableAmount} pixels @ ${order.price} credits`);
                        }
                    } else {
                        console.log(`[PixelTrading] Failed to create/update pixel sell order`);
                    }
                }
            }

            function calcPixelPrice(): number {
                const history = Game.market.getHistory(PIXEL);
                if(history && history.length > 0) {
                    let weightedSum = 0;
                    let weight = 1;
                    for(const day of history) {
                        weightedSum += day.avgPrice * weight;
                        weight++;
                    }
                    const avgPrice = weightedSum / ((history.length * (history.length + 1)) / 2);
                    // Slightly below average to sell faster
                    return Math.floor(avgPrice * 0.95);
                }
                return 8000; // Default fallback price
            }
        }
    }
    const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
    if(storage && storage.store[RESOURCE_ENERGY] > STORAGE_THRESHOLDS.BASE_RESOURCES.STORAGE_ENERGY_HIGH &&
       Game.time % 110 == 0 && (Game.cpu.bucket > CREDIT_REQUIREMENTS.MARKET_CRAWLER || Memory.pixelManager?.enabled) &&
       room.terminal.cooldown == 0 && room.terminal.store.getFreeCapacity() > 50000) {

        let crawler_list = RESOURCE_LISTS.CRAWLER_RESOURCES;

        if(PURCHASE_CONFIG.MARKET_CRAWLER.shuffleList) {
            crawler_list = crawler_list
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value);
        }

        if(room.terminal.store[RESOURCE_ENERGY] >= STORAGE_THRESHOLDS.BASE_RESOURCES.TERMINAL_ENERGY_MIN) {
            let count = 0;
            for(const resource of crawler_list) {
                const result = buy_resource_crawler(resource, PURCHASE_CONFIG.MARKET_CRAWLER.price);
                if(result == 0) {
                    return;
                }
                else if(!result) {
                    count += 1
                }
            }
            console.log(count, "items not found by the market crawler below price of", PURCHASE_CONFIG.MARKET_CRAWLER.price, room.name);
        }

        function buy_resource_crawler(resource:ResourceConstant, OrderPrice:number=5):any | void {
            const OrderAmount = PURCHASE_CONFIG.MARKET_CRAWLER.amount;
            const OrderMaxEnergy = OrderAmount * PURCHASE_CONFIG.MARKET_CRAWLER.energyCostMultiplier;
            let orders = Game.market.getAllOrders({type: ORDER_SELL, resourceType: resource});
            orders = _.filter(orders, (order) => order.amount >= OrderAmount && Game.market.calcTransactionCost(OrderAmount, room.name, order.roomName) <= OrderMaxEnergy && order.price <= OrderPrice);
            if(orders.length > 0) {
                orders.sort((a,b) => a.price - b.price);
                const orderID = orders[0].id;

                console.log(JSON.stringify(orders[0]))
                console.log(Game.market.calcTransactionCost(OrderAmount, room.name, orders[0].roomName))

                const result = Game.market.deal(orderID, OrderAmount, room.name);
                if(result == 0) {
                    console.log(OrderAmount, resource, "Bought at Price:", orders[0].price, "=", OrderAmount * orders[0].price);
                    return result;
                }
                else {
                    console.log(result);
                }
            }
            else {
                return false;
            }
        }
    }

    let targetRampRoom = Memory.targetRampRoom.room;
    if (
      targetRampRoom &&

      Game.time % 1000 === 0 &&
      Game.rooms[targetRampRoom] &&
      Game.rooms[targetRampRoom].controller?.level === 8 &&
      Game.rooms[targetRampRoom].storage?.store[RESOURCE_ENERGY] >= 400000
    ) {
      delete Memory.targetRampRoom;
      targetRampRoom = undefined;
    }
    if(targetRampRoom && Game.time % 20 == 0 && room.name != targetRampRoom && Game.rooms[targetRampRoom] && Game.rooms[targetRampRoom].controller && Game.rooms[targetRampRoom].controller.my && Game.rooms[targetRampRoom].controller.level >= 6 &&
        Game.rooms[targetRampRoom].terminal && Game.rooms[targetRampRoom].terminal.store[RESOURCE_ENERGY] < 80000 && Game.rooms[targetRampRoom].terminal.store.getFreeCapacity() > 50000 && Game.rooms[targetRampRoom].memory.Structures.spawn && Game.getObjectById(Game.rooms[targetRampRoom].memory.Structures.spawn) && Game.rooms[targetRampRoom].storage) {
            const theirRoom:any = Game.rooms[targetRampRoom];
            const theirStorage = Game.getObjectById(theirRoom.memory.Structures.storage) || theirRoom.findStorage();
            if(theirStorage && theirStorage.store[RESOURCE_ENERGY] < 455000 && room.terminal.store[RESOURCE_ENERGY] >= 40000 && storage && (storage.store[RESOURCE_ENERGY] > 200000 && Memory.CPU.reduce && theirStorage.store[RESOURCE_ENERGY] < 300000 || storage.store[RESOURCE_ENERGY] > 290000 && !Memory.CPU.reduce)) {
                room.terminal.send(RESOURCE_ENERGY, 10000, targetRampRoom, "enjoy this energy, other room!");
                console.log("sending room", targetRampRoom, "10000 energy")
            }
    }
    // Game.time % 10 == 0 && targetRampRoom && targetRampRoom == room.name && room.terminal.store[RESOURCE_ENERGY] < 150000 && Game.market.credits > 100000000 ||


    if(Game.time % 1000 === 0 && storage && storage.store[RESOURCE_ENERGY] > 430000 && room.terminal.store[RESOURCE_ENERGY] > 30000) {
        const orderID = ensureSingleSellOrder(RESOURCE_ENERGY, CalcPriceForOrder(RESOURCE_ENERGY), 20000);

        if (orderID) {
            const order = Game.market.orders[orderID];
            if (order && order.remainingAmount < 5000) {
                Game.market.extendOrder(orderID, 15000);
            }
            // 价格和数量已在 ensureSingleSellOrder 中自动更新
        }

        function CalcPriceForOrder(resourceToSell) {
            const resourceData = Game.market.getHistory(resourceToSell);
            let myTotalAverage = 0;
            let weightNumber = 1;

            if (resourceData && resourceData.length > 0) {
                for (const day of resourceData) {
                    myTotalAverage += day.avgPrice * weightNumber;
                    weightNumber++;
                }

                const Average = myTotalAverage / 105;
                console.log(Average, "average price");

                return Average + 1;
            } else {
                return 5.889;
            }
        }
    }

    if(Game.time % 50 == 0 && storage && storage.store[RESOURCE_ENERGY] < 100000 && room.terminal.store[RESOURCE_ENERGY] < 50000 && Game.market.credits > 1000000) {


        function CalcPriceForOrder(resourceToSell) {
            const resourceData = Game.market.getHistory(resourceToSell);
            let myTotalAverage = 0;
            let weightNumber = 1;

            if (resourceData && resourceData.length > 0) {
                for (const day of resourceData) {
                    myTotalAverage += day.avgPrice * weightNumber;
                    weightNumber++;
                }

                const Average = myTotalAverage / 105;
                console.log(Average, "average price");

                return Average + 1;
            } else {
                return 5.889;
            }
        }


        let foundInRoomEnergyOrder = false;

        const Orders = Game.market.orders;
        for(const orderID in Orders) {
            const order = Game.market.orders[orderID];


            if(order.resourceType == RESOURCE_ENERGY && order.type == ORDER_BUY && order.roomName == room.name) {
                foundInRoomEnergyOrder = true;
            }

            if(order.roomName == room.name && order.resourceType == RESOURCE_ENERGY && order.type == ORDER_BUY && order.amount <= 1000 && storage && storage.store[RESOURCE_ENERGY] < 100000) {
                Game.market.extendOrder(orderID, 20000);
            }
        }

        if(!foundInRoomEnergyOrder) {
            Game.market.createOrder({
                type: ORDER_BUY,
                resourceType: RESOURCE_ENERGY,
                price: CalcPriceForOrder(RESOURCE_ENERGY),
                totalAmount: 20000,
                roomName: room.name
            });
        }
    }
}
export default market;


function price_checker(price, resource): boolean {
    if(hasSpecialPrice(resource)) {
        const minPrice = getSpecialPrice(resource);
        return minPrice ? price >= minPrice : true;
    }
    return true;
}
