#!/bin/sh
# NightLab installer for macOS and Linux.
#
#   curl -fsSL https://get.nightlab.dev/install.sh | sh
#
# This script does four things and then gets out of the way: work out the platform, read the
# release manifest, verify what it downloaded against the digest the manifest states, and hand over
# to the lab's own `install`. Everything about where a version goes and what ends up on PATH is
# decided by the lab itself, which is code that can be tested, rather than by this file.
#
# Everything is wrapped in a function invoked on the last line, so a download cut off partway
# through defines some functions and runs none of them.

set -eu

OPENLAB_BASE_URL="${OPENLAB_BASE_URL:-https://get.nightlab.dev}"

main() {
    version="${OPENLAB_VERSION:-}"
    modify_path=1

    while [ $# -gt 0 ]; do
        case "$1" in
            --version) version="${2:-}"; shift 2 ;;
            --no-modify-path) modify_path=0; shift ;;
            -h|--help) usage; exit 0 ;;
            *) fail "Unknown option: $1. Run with --help to see what this accepts." ;;
        esac
    done

    need curl tar mkdir mktemp uname
    platform="$(detect_platform)"

    if [ -z "$version" ]; then
        version="$(fetch "$OPENLAB_BASE_URL/latest" | tr -d '[:space:]')"
        [ -n "$version" ] || fail "Could not read the current version from $OPENLAB_BASE_URL/latest"
    fi

    say "NightLab $version for $platform"

    manifest="$(fetch "$OPENLAB_BASE_URL/$version/manifest.json")"
    archive_name="$(manifest_field "$manifest" "$platform" file)"
    expected="$(manifest_field "$manifest" "$platform" sha256)"

    [ -n "$archive_name" ] || fail "This release has no build for $platform."
    case "$expected" in
        [0-9a-f]*) [ ${#expected} -eq 64 ] || fail "The manifest states a malformed digest for $platform." ;;
        *) fail "The manifest states no digest for $platform, and nothing unverified is installed." ;;
    esac

    workspace="$(mktemp -d)"
    trap 'rm -rf "$workspace"' EXIT INT TERM

    archive="$workspace/$archive_name"
    say "downloading $archive_name"
    download "$OPENLAB_BASE_URL/$version/$archive_name" "$archive"

    actual="$(digest_of "$archive")"
    [ "$actual" = "$expected" ] || fail "Checksum mismatch for $archive_name.
  expected  $expected
  actual    $actual
Nothing was installed. This is worth reporting rather than retrying."

    unpacked="$workspace/release"
    mkdir -p "$unpacked"
    tar -xzf "$archive" -C "$unpacked"

    executable="$unpacked/openlab"
    [ -f "$executable" ] || fail "The archive holds no openlab executable."
    chmod +x "$executable"

    if [ "$modify_path" -eq 1 ]; then
        "$executable" install
    else
        "$executable" install --no-modify-path
    fi
}

usage() {
    cat <<'USAGE'
Install NightLab, a local autonomous research lab.

    curl -fsSL https://get.nightlab.dev/install.sh | sh

Options:
    --version <version>   install a named version instead of the current one
    --no-modify-path      leave your shell startup files alone
    -h, --help            show this

Environment:
    OPENLAB_VERSION      same as --version
    OPENLAB_INSTALL_DIR  where the launcher goes; defaults to ~/.local/bin
    OPENLAB_BASE_URL     where releases are fetched from
USAGE
}

# The platform names here are the ones the release is built and named for.
detect_platform() {
    os="$(uname -s)"
    arch="$(uname -m)"

    case "$os" in
        Darwin) os="darwin" ;;
        Linux) os="linux" ;;
        *) fail "NightLab has no build for $os. It runs on macOS and Linux; on Windows use install.ps1." ;;
    esac

    case "$arch" in
        x86_64|amd64) arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *) fail "NightLab has no build for $arch." ;;
    esac

    # An Intel binary running under Rosetta reports x86_64 on a machine that would rather have the
    # native build, and asking the kernel is the only way to tell the two apart.
    if [ "$os" = "darwin" ] && [ "$arch" = "x64" ] &&
        [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then
        arch="arm64"
    fi

    printf '%s-%s' "$os" "$arch"
}

# The manifest is small and fixed in shape, so it is read with the tools every machine already has
# rather than by requiring one this script would then have to install first.
manifest_field() {
    printf '%s' "$1" | tr -d '\n' |
        sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*{[^}]*\"$3\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"
}

fetch() {
    curl -fsSL --proto '=https' --tlsv1.2 --retry 3 --retry-connrefused "$1" ||
        fail "Could not reach $1"
}

download() {
    curl -fsSL --proto '=https' --tlsv1.2 --retry 3 --retry-connrefused -o "$2" "$1" ||
        fail "Could not download $1"
}

digest_of() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | cut -d' ' -f1
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$1" | cut -d' ' -f1
    else
        fail "Neither sha256sum nor shasum is available, so nothing can be verified."
    fi
}

need() {
    for command in "$@"; do
        command -v "$command" >/dev/null 2>&1 || fail "This installer needs $command and cannot find it."
    done
}

say() {
    printf '%s\n' "$1" >&2
}

fail() {
    printf '\nerror: %s\n' "$1" >&2
    exit 1
}

main "$@"
