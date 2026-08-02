export const schedulerLanes = ["promising", "exploration", "adversarial", "reproduction"] as const;

export type SchedulerLane = (typeof schedulerLanes)[number];

export interface SchedulableTask {
    readonly id: string;
    readonly lane: SchedulerLane;
    readonly priority: number;
    readonly queuedAt: Date;
}

export type SchedulerWeights = Readonly<Record<SchedulerLane, number>>;

export const defaultSchedulerWeights: SchedulerWeights = {
    promising: 3,
    exploration: 1,
    adversarial: 1,
    reproduction: 1
};

export class FairScheduler<Task extends SchedulableTask> {
    readonly #laneOrder: readonly SchedulerLane[];
    readonly #queues: Record<SchedulerLane, Task[]> = {
        promising: [],
        exploration: [],
        adversarial: [],
        reproduction: []
    };
    #cursor = 0;

    constructor(weights: SchedulerWeights = defaultSchedulerWeights) {
        const laneOrder: SchedulerLane[] = [];
        for (const lane of schedulerLanes) {
            const weight = weights[lane];
            if (!Number.isSafeInteger(weight) || weight < 1) {
                throw new RangeError(`Weight for ${lane} must be a positive safe integer`);
            }
            for (let index = 0; index < weight; index += 1) {
                laneOrder.push(lane);
            }
        }
        this.#laneOrder = laneOrder;
    }

    enqueue(task: Task): void {
        const queue = this.#queues[task.lane];
        if (queue.some(({ id }) => id === task.id)) {
            throw new Error(`Task ${task.id} is already queued in lane ${task.lane}`);
        }

        queue.push(task);
        queue.sort(compareTasks);
    }

    next(): Task | undefined {
        for (let offset = 0; offset < this.#laneOrder.length; offset += 1) {
            const index = (this.#cursor + offset) % this.#laneOrder.length;
            const lane = this.#laneOrder[index];
            if (lane === undefined) {
                throw new Error("Scheduler lane order is unexpectedly empty");
            }
            const task = this.#queues[lane].shift();
            if (task !== undefined) {
                this.#cursor = (index + 1) % this.#laneOrder.length;
                return task;
            }
        }

        return undefined;
    }

    size(lane?: SchedulerLane): number {
        if (lane !== undefined) {
            return this.#queues[lane].length;
        }
        return schedulerLanes.reduce((total, current) => total + this.#queues[current].length, 0);
    }
}

function compareTasks(left: SchedulableTask, right: SchedulableTask): number {
    return right.priority - left.priority || left.queuedAt.getTime() - right.queuedAt.getTime();
}
