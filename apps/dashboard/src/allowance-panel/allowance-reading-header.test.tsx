import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HARNESS_ALLOWANCE_EN } from "#src/allowance-panel/allowance-panel.i18n";
import { AllowanceReadingHeader } from "#src/allowance-panel/allowance-reading-header";

const READ_AT = "2026-08-04T12:48:00.000Z";

describe("AllowanceReadingHeader", () => {
    it("asks the vendors again when nothing is on its way", async () => {
        const refresh = vi.fn();
        const user = userEvent.setup();
        render(
            <AllowanceReadingHeader
                readAt={READ_AT}
                refresh={refresh}
                reading={false}
                failed={false}
            />
        );

        await user.click(screen.getByRole("button", { name: HARNESS_ALLOWANCE_EN.refresh }));

        expect(refresh).toHaveBeenCalledOnce();
    });

    it("takes no ask while the interval is already reading", async () => {
        const refresh = vi.fn();
        const user = userEvent.setup();
        render(
            <AllowanceReadingHeader
                readAt={READ_AT}
                refresh={refresh}
                reading={true}
                failed={false}
            />
        );

        await user.click(screen.getByRole("button", { name: HARNESS_ALLOWANCE_EN.refresh }));

        expect(refresh).not.toHaveBeenCalled();
    });
});
