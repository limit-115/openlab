import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ExperimentsPanel } from "#src/experiments/experiments-panel";

const settled: Experiment = {
    id: "experiment-settled",
    task_id: "task-1",
    branch_id: "branch-1",
    hypothesis: "Warming the cache removes the spread between runs",
    evaluator: "Benchmark ratio",
    command: "pnpm bench --warmup 2",
    cwd: "/tmp/lab",
    status: ExperimentStatus.SUCCEEDED,
    exit_code: 0,
    started_at: "2026-08-02T10:00:00.000Z",
    finished_at: "2026-08-02T10:01:00.000Z"
};

const stuck: Experiment = {
    id: "experiment-stuck",
    task_id: "task-2",
    branch_id: "branch-1",
    hypothesis: "A flat token buffer beats transferring the tree",
    evaluator: "Worker pool benchmark",
    command: "node bench/workers.ts --threads 10",
    cwd: "/tmp/lab",
    status: ExperimentStatus.FAILED,
    exit_code: 1,
    started_at: "2026-08-02T09:00:00.000Z",
    finished_at: "2026-08-02T09:00:12.000Z"
};

describe("ExperimentsPanel", () => {
    it("holds back a run that already settled and keeps the one that did not", () => {
        render(<ExperimentsPanel experiments={[settled, stuck]} />);

        expect(screen.getByText(stuck.hypothesis)).toBeInTheDocument();
        expect(screen.queryByText(settled.hypothesis)).not.toBeInTheDocument();
    });

    it("shows every run once the operator asks for all of them", async () => {
        const user = userEvent.setup();
        render(<ExperimentsPanel experiments={[settled, stuck]} />);

        await user.click(screen.getByRole("radio", { name: "All runs" }));

        expect(screen.getByText(settled.hypothesis)).toBeInTheDocument();
        expect(screen.getByText(stuck.hypothesis)).toBeInTheDocument();
    });

    it("says where the successful runs went when nothing needs attention", () => {
        render(<ExperimentsPanel experiments={[settled]} />);

        expect(screen.getByText("Every run has settled")).toBeInTheDocument();
    });
});
