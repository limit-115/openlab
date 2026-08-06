#!/usr/bin/env node

/**
 * What the name answers with until the lab itself is published under it.
 *
 * This package holds `openlab` in the registry and nothing else. A release is one executable with
 * its runtime inside it, and it is installed from openlab.bot rather than from here, so the one
 * useful thing this command can do is say that and say how.
 */
const message = [
    "OpenLab is not on npm yet — this package only holds the name.",
    "",
    "macOS and Linux:",
    "    curl -fsSL https://openlab.bot/install.sh | sh",
    "",
    "Windows PowerShell:",
    "    irm https://openlab.bot/install.ps1 | iex",
    "",
    "Nothing else is needed: a release carries its own runtime."
].join("\n");

process.stdout.write(`${message}\n`);
