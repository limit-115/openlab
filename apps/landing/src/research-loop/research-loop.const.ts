/**
 * One turn of the research loop, in the order the daemon actually runs it. These are not a diagram
 * drawn to look busy: the director plans, a researcher is spent on each lead it named, and a
 * verifier is only ever reached when a researcher came back claiming something. Change the loop and
 * change this, because a page describing a cycle the lab no longer runs is worse than no page.
 */
export const RESEARCH_STAGE = [
    {
        index: "01",
        name: "Director",
        line: "Reads the goal and every lead already spent on it, then names the ones still worth opening."
    },
    {
        index: "02",
        name: "Researchers",
        line: "One per lead, all at once, each free to get at its lead however it sees fit."
    },
    {
        index: "03",
        name: "Verifier",
        line: "Reached only when a researcher comes back claiming something, because otherwise there is nothing to verify."
    },
    {
        index: "04",
        name: "Breakthrough",
        line: "A finding that survived verification, and one of the five moments the lab will reach you about."
    }
] as const;

/**
 * The two ways a cycle ends without a breakthrough. Both are stated on the page because both look
 * identical from outside — an investigation that has gone quiet — and only one of them is asking
 * the operator for anything.
 */
export const RESEARCH_PAUSE = [
    {
        title: "Nowhere left to look",
        line: "The director could not name another lead. The investigation stops rather than inventing work."
    },
    {
        title: "Held at the caps",
        line: "Every subscription it may use has reached the cap you set. It sleeps on the first window due back and takes itself up then."
    }
] as const;
