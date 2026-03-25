// Refactored: intermediate tick data is buffered in a global variable instead
// of Memory, which avoids serialising a growing array every single tick.
// Memory is only written when a 100-tick or 500-tick average is ready.

declare const global: any;

// In-process buffers — reset on code reload, which is fine for rolling averages.
if (!global._cpuBuf100)  global._cpuBuf100  = [] as string[];
if (!global._cpuBuf500)  global._cpuBuf500  = [] as string[];

function calcAverage(data: string[]): string {
    const total = data.reduce((sum, n) => sum + Number(n), 0);
    return (total / data.length).toFixed(2);
}

function CPUmanager(tickTotal: string | number): void {

    if (!Memory.CPU) Memory.CPU = {};

    // Buffer this tick in RAM only (not Memory)
    global._cpuBuf100.push(String(tickTotal));

    if (Game.time % 100 === 0) {
        const avg100 = calcAverage(global._cpuBuf100);
        Memory.CPU.hundredTickAvg = avg100;
        console.log("100-tick CPU avg:", avg100, "ms");
        global._cpuBuf100 = [];

        global._cpuBuf500.push(avg100);

        if (Game.time % 500 === 0) {
            const avg500 = calcAverage(global._cpuBuf500);
            Memory.CPU.fiveHundredTickAvg = avg500;
            console.log("500-tick CPU avg:", avg500, "ms");
            global._cpuBuf500 = [];
        }
    }

    if (Game.time % 5 === 0) {
        console.log("bucket:", Game.cpu.bucket);
    }
}

export default CPUmanager;
