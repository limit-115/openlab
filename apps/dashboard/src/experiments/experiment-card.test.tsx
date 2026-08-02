import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExperimentCard } from "#src/experiments/experiment-card";

const REASON = "Source fetch returned HTTP 404";

const OUTPUT_PATH = "/runs/lab/source-fetches/fetch-1785cbef/manifest.json";

const FAILED_EXPERIMENT: Experiment = {
    id: "experiment-1785cbef",
    task_id: "task-forgery",
    branch_id: "branch-signatures",
    hypothesis: "Fetch supplemental citation: Ed25519 signature malleability",
    evaluator: "Daemon-owned source fetcher",
    command: "GET daemon-validated source URL",
    cwd: "/tmp/lab",
    status: ExperimentStatus.FAILED,
    error: REASON,
    output_path: OUTPUT_PATH,
    started_at: "2026-08-03T13:50:00.000Z",
    finished_at: "2026-08-03T13:50:00.000Z"
};

describe("ExperimentCard", () => {
    it("shows why a failed experiment failed and where its output landed", () => {
        render(<ExperimentCard experiment={FAILED_EXPERIMENT} />);

        expect(screen.getByText(REASON)).toBeVisible();
        expect(screen.getByText(OUTPUT_PATH)).toBeVisible();
    });

    it("carries no failure reason on a run that recorded none", () => {
        const succeeded: Experiment = {
            ...FAILED_EXPERIMENT,
            status: ExperimentStatus.SUCCEEDED,
            error: undefined
        };

        render(<ExperimentCard experiment={succeeded} />);

        expect(screen.queryByText(REASON)).toBeNull();
        expect(screen.getByText(OUTPUT_PATH)).toBeVisible();
    });
});
