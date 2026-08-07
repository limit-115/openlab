/**
 * What the lab does about the four things that go wrong when software is left running unattended:
 * it spends more than you meant, it goes quiet, it updates itself into something else, and you
 * cannot tell what it is doing. Each entry is a promise the runtime keeps, so each one is worded as
 * behaviour rather than intent.
 */
export const GUARDRAIL = [
    {
        title: "It stops before your plan does",
        line: "A subscription window can be capped short of the vendor's own ceiling — 80% of the five-hour window, 60% of the weekly one. A capped subscription is passed over exactly as a spent one is, and a run already under way finishes rather than being killed mid-thought."
    },
    {
        title: "It reports five moments",
        line: "A finding survived verification. It needs something only you can give it. An investigation failed, or went to sleep, or a harness is not ready to dispatch to. Nothing else, so a message is never a stream to tune out."
    },
    {
        title: "It will not update itself",
        line: "Starting a lab asks the release channel at most once a day and says one line if there is something newer. Taking it is yours to decide, and the manifest has to be signed by a key compiled into the lab or nothing is installed."
    },
    {
        title: "You can see what it is doing",
        line: "The dashboard reads the lab live: every investigation, what each one is doing, its team, its event stream and what it ended up as. It is served by the daemon on your own machine, so there is nothing to log in to."
    }
] as const;
