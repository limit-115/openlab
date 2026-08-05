#!/usr/bin/env node
import { unsupportedNodeMessage } from "#bin/supported-node.js";

/**
 * Everything the lab is written in lives behind this check, loaded only once the Node running it is
 * known to be able to read it.
 */
const refusal = unsupportedNodeMessage(process.versions.node);
if (refusal !== undefined) {
    process.stderr.write(`${refusal}\n`);
    process.exit(1);
}

await import("#src/main");
