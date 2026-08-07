#!/bin/sh
# Drives a built release the way an operator does: unpack it, install it, update it, ask it what it
# is. It is run on every platform a release is built for, because a compiled lab can break while the
# sources still pass — the runtime a release carries is not the one the tests ran on.
#
#   release/verify-release.sh <target> [dist directory]
#
# The channel it updates from is served off the disk beside it, so this needs no network and no
# published release. The release is republished there one version on, which is what gives the update
# something to install. The executable inside that later version is the same build, so what is
# checked afterwards is where the launcher points and not what the binary answers.

set -eu

TARGET="${1:?Usage: verify-release.sh <target> [dist directory]}"
DIST="${2:-release/dist}"
NEXT_VERSION="9.9.9"
PORT="8799"

main() {
    need jq tar openssl curl
    python_command >/dev/null

    version="$(jq -r .version "$DIST/manifest.json")"
    archive="$(jq -r --arg t "$TARGET" '.artifacts[$t].file' "$DIST/manifest.json")"
    [ "$archive" != "null" ] || fail "The manifest has no build for $TARGET."

    case "$TARGET" in
        windows-*) launcher="openlab.cmd"; executable="openlab.exe" ;;
        *) launcher="openlab"; executable="openlab" ;;
    esac

    workspace="$(mktemp -d)"
    trap clean_up EXIT INT TERM

    # A lab installs only from a channel signed by a key it trusts, and this channel is invented
    # here, so it is signed here. The key lasts as long as the check does and is named to the lab
    # the way an operator names the key of a mirror of their own.
    openssl genpkey -algorithm ed25519 -out "$workspace/channel-key.pem" 2>/dev/null ||
        fail "This needs an OpenSSL that can make an ed25519 key."
    OPENLAB_RELEASES_KEY="$(openssl pkey -in "$workspace/channel-key.pem" -pubout)"
    export OPENLAB_RELEASES_KEY

    publish "$workspace/channel" "$version" "$archive"
    (cd "$workspace/channel" && exec "$(python_command)" -m http.server -b 127.0.0.1 "$PORT" \
        >"$workspace/server.log" 2>&1) &
    server=$!
    await_channel

    OPENLAB_RELEASES_URL="http://127.0.0.1:$PORT"
    export OPENLAB_RELEASES_URL
    # Nothing this machine happens to be running is to answer a question asked about this lab.
    OPENLAB_API_URL="http://127.0.0.1:9"
    export OPENLAB_API_URL

    say "unpacking $archive"
    mkdir -p "$workspace/unpacked"
    unpack "$DIST/$archive" "$workspace/unpacked"
    [ -f "$workspace/unpacked/$executable" ] || fail "The archive holds no $executable."

    say "install"
    "$workspace/unpacked/$executable" install --no-modify-path
    installed="$(installed_launcher "$launcher")"
    check "the installed lab answers" "$version" "$("$installed" --version)"

    say "update --check"
    "$installed" update --check

    say "update"
    "$installed" update
    [ -d "$HOME/.openlab/versions/$NEXT_VERSION" ] ||
        fail "The update installed no $NEXT_VERSION directory."
    [ -d "$HOME/.openlab/versions/$NEXT_VERSION/dashboard" ] ||
        fail "The updated version carries no dashboard."
    [ -d "$HOME/.openlab/versions/$NEXT_VERSION/migrations" ] ||
        fail "The updated version carries no migrations."
    check "the version the receipt names" "$NEXT_VERSION" \
        "$(jq -r .version "$HOME/.openlab/install-receipt.json")"

    say "the updated lab runs"
    "$installed" --help >/dev/null

    # The version an update replaced is what makes a rollback need no download, so it has to be
    # there afterwards. Which of the two answers is not the question here: this build is in both.
    [ -d "$HOME/.openlab/versions/$version" ] ||
        fail "The update took away the $version it replaced, leaving nothing to roll back to."

    say "doctor"
    "$installed" doctor

    # The digests in a manifest only prove an archive is the one described. A channel able to put a
    # manifest in front of a lab writes its own digests and puts its own archives behind them, so a
    # manifest nobody trustworthy signed has to stop the update rather than be read.
    say "a manifest nobody trustworthy signed"
    rm -f "$workspace/channel/latest/download/manifest.json.sig"
    if "$installed" update >"$workspace/unsigned" 2>&1; then
        cat "$workspace/unsigned"
        fail "A manifest with no signature was installed from."
    fi
    grep -q "not signed by a key this lab trusts" "$workspace/unsigned" ||
        fail "An unsigned manifest was refused for some reason other than being unsigned."
    printf '  ok    refused, and said why\n'

    # An update is the one command that reaches a network, so a channel it cannot reach has to end
    # in a sentence and a failed exit rather than in a stack trace.
    say "an unreachable channel"
    kill "$server" 2>/dev/null || true
    server=""
    sleep 1
    if "$installed" update >"$workspace/unreachable" 2>&1; then
        cat "$workspace/unreachable"
        fail "An unreachable channel exited zero."
    fi
    grep -q "Could not reach" "$workspace/unreachable" ||
        fail "An unreachable channel said something other than that it could not be reached."
    check "the version still answering" "$version" "$("$installed" --version)"

    say "PASSED on $TARGET"
}

# A channel serving what was just built, and the same release published one version on.
publish() {
    channel="$1"
    version="$2"
    archive="$3"
    next_archive="$(printf '%s' "$archive" | sed "s/$version/$NEXT_VERSION/")"

    mkdir -p "$channel/download/v$version" "$channel/download/v$NEXT_VERSION" \
        "$channel/latest/download"
    cp "$DIST/$archive" "$channel/download/v$version/$archive"
    cp "$DIST/$archive" "$channel/download/v$NEXT_VERSION/$next_archive"
    cp "$DIST/manifest.json" "$channel/download/v$version/manifest.json"

    jq --arg v "$NEXT_VERSION" --arg t "$TARGET" --arg f "$next_archive" \
        --arg s "$(digest_of "$DIST/$archive")" \
        --argjson z "$(wc -c <"$DIST/$archive" | tr -d ' ')" \
        '.version = $v | .artifacts = {($t): {file: $f, sha256: $s, size: $z}}' \
        "$DIST/manifest.json" >"$channel/download/v$NEXT_VERSION/manifest.json"
    cp "$channel/download/v$NEXT_VERSION/manifest.json" "$channel/latest/download/manifest.json"

    for manifest in "$channel/download/v$version/manifest.json" \
        "$channel/download/v$NEXT_VERSION/manifest.json" \
        "$channel/latest/download/manifest.json"; do
        sign "$manifest"
    done
}

# Waits until the channel answers, because the lab is asked to reach it next. A server that died
# instead of listening gets its last words printed, so a red run names its cause.
await_channel() {
    tries=0
    while [ "$tries" -lt 30 ]; do
        if curl -sf -o /dev/null "http://127.0.0.1:$PORT/latest/download/manifest.json"; then
            return 0
        fi
        kill -0 "$server" 2>/dev/null || break
        tries=$((tries + 1))
        sleep 0.5
    done
    cat "$workspace/server.log" >&2
    fail "The channel never answered on port $PORT."
}

# The detached signature a lab checks before it reads a manifest at all.
sign() {
    openssl pkeyutl -sign -inkey "$workspace/channel-key.pem" -rawin -in "$1" |
        openssl base64 -A >"$1.sig"
    printf '\n' >>"$1.sig"
}

# Takes down what this left running and keeps the status that got it here, so a failure stays one.
clean_up() {
    status=$?
    if [ -n "${server:-}" ]; then
        kill "$server" 2>/dev/null || true
    fi
    rm -rf "${workspace:-}"
    exit "$status"
}

# Where the install put the launcher, which is the directory the lab itself decided on.
installed_launcher() {
    for directory in "${OPENLAB_INSTALL_DIR:-$HOME/.local/bin}" "$HOME/.local/bin"; do
        if [ -f "$directory/$1" ]; then
            printf '%s' "$directory/$1"
            return 0
        fi
    done
    fail "The install left no $1 anywhere this knows to look."
}

# Gets the first archive out, which is the one nobody has installed a lab with yet. A zip is left to
# Python rather than to `tar`, because this runs on Windows through Git Bash, whose `tar` is GNU tar
# and reads no zip. What the lab itself unpacks with is the lab's own business and is what `update`
# below goes on to exercise.
unpack() {
    case "$1" in
        *.zip) "$(python_command)" -m zipfile -e "$1" "$2" ;;
        *) tar -xf "$1" -C "$2" ;;
    esac
}

# Windows names it `python`; everything else that has it at all names it `python3`.
python_command() {
    if command -v python3 >/dev/null 2>&1; then
        printf 'python3'
    elif command -v python >/dev/null 2>&1; then
        printf 'python'
    else
        fail "This needs Python and cannot find it."
    fi
}

digest_of() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | cut -d' ' -f1
    else
        shasum -a 256 "$1" | cut -d' ' -f1
    fi
}

check() {
    if [ "$2" = "$3" ]; then
        printf '  ok    %s = %s\n' "$1" "$3"
    else
        fail "$1: expected $2, got $3"
    fi
}

need() {
    for command in "$@"; do
        command -v "$command" >/dev/null 2>&1 || fail "This needs $command and cannot find it."
    done
}

say() {
    printf '\n=== %s ===\n' "$1"
}

fail() {
    printf '\nerror: %s\n' "$1" >&2
    exit 1
}

main
