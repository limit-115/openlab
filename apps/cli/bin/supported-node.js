/**
 * The one thing the lab says before it can say anything else.
 *
 * A lab runs its own TypeScript through Node's type stripping, so the Node that reaches this file
 * is whichever one the operator already had, and an older one cannot so much as parse the sources
 * this file stands in front of. That is why this module and the executable beside it are plain
 * JavaScript: they have to run everywhere in order to explain why nothing else will.
 */
export const REQUIRED_NODE_VERSION = "24.18.1";

/** What to tell an operator whose Node cannot run the lab, or nothing at all if it can. */
export function unsupportedNodeMessage(version) {
    if (isSupported(version)) {
        return undefined;
    }

    return [
        `The lab needs Node ${REQUIRED_NODE_VERSION} or newer, and this is Node ${version}.`,
        "",
        "Install it with fnm, nvm or from nodejs.org, then run the command again."
    ].join("\n");
}

function isSupported(version) {
    const found = releaseNumbers(version);
    const required = releaseNumbers(REQUIRED_NODE_VERSION);

    for (let position = 0; position < required.length; position += 1) {
        const left = found[position] ?? 0;
        const right = required[position] ?? 0;
        if (left !== right) {
            return left > right;
        }
    }

    return true;
}

/** A prerelease reads as the release it is working towards, which is the one it is not yet. */
function releaseNumbers(version) {
    return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}
