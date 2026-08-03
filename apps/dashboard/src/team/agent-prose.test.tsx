import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentProse } from "#src/team/agent-prose";

const COMMAND = "pnpm vitest run evaluators/body_harness_validity.py";

describe("AgentProse", () => {
    it("reads a list the agent wrote as a list rather than the characters that spell one", () => {
        render(<AgentProse sealed={true} text={"Two things:\n\n- the **sample** is empty\n"} />);

        expect(screen.getByRole("listitem").textContent).toBe("the sample is empty");
    });

    it("closes an emphasis the agent has not finished writing", () => {
        const { container } = render(
            <AgentProse sealed={false} text="The evaluator is **still writing this" />
        );

        expect(container.textContent).toContain("still writing this");
        expect(container.textContent).not.toContain("**");
    });

    it("opens a code fence the agent has not closed, keeping the command whole", () => {
        const { container } = render(
            <AgentProse sealed={false} text={`Running it now:\n\n\`\`\`bash\n${COMMAND}`} />
        );

        expect(container.textContent).toContain(COMMAND);
        expect(container.textContent).not.toContain("```");
    });
});
