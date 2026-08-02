import { domainValues } from "@lab/protocol/constants";
import { SchedulerLane, type SchedulerLane as SchedulerLaneValue } from "#src/constants";

const schedulerLaneValues = domainValues(SchedulerLane);

export interface SchedulableTask {
    readonly id: string;
    readonly lane: SchedulerLaneValue;
    readonly priority: number;
    readonly queuedAt: Date;
}

export type SchedulerWeights = Readonly<Record<SchedulerLaneValue, number>>;

export const defaultSchedulerWeights: SchedulerWeights = {
    [SchedulerLane.PROMISING]: 3,
    [SchedulerLane.EXPLORATION]: 1,
    [SchedulerLane.ADVERSARIAL]: 1,
    [SchedulerLane.REPRODUCTION]: 1
};

export class FairScheduler<Task extends SchedulableTask> {
    readonly #laneOrder: readonly SchedulerLaneValue[];
    readonly #queues: Record<SchedulerLaneValue, Task[]> = {
        [SchedulerLane.PROMISING]: [],
        [SchedulerLane.EXPLORATION]: [],
        [SchedulerLane.ADVERSARIAL]: [],
        [SchedulerLane.REPRODUCTION]: []
    };
    #cursor = 0;

    constructor(weights: SchedulerWeights = defaultSchedulerWeights) {
        const laneOrder: SchedulerLaneValue[] = [];
        for (const lane of schedulerLaneValues) {
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

    size(lane?: SchedulerLaneValue): number {
        if (lane !== undefined) {
            return this.#queues[lane].length;
        }
        return schedulerLaneValues.reduce(
            (total, current) => total + this.#queues[current].length,
            0
        );
    }
}

function compareTasks(left: SchedulableTask, right: SchedulableTask): number {
    return right.priority - left.priority || left.queuedAt.getTime() - right.queuedAt.getTime();
}
