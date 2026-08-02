const EvaluatorLexicalState = {
    CODE: "code",
    SINGLE_QUOTED: "single_quoted",
    DOUBLE_QUOTED: "double_quoted",
    TEMPLATE_QUOTED: "template_quoted",
    LINE_COMMENT: "line_comment",
    BLOCK_COMMENT: "block_comment"
} as const;
type EvaluatorLexicalState = (typeof EvaluatorLexicalState)[keyof typeof EvaluatorLexicalState];

export function normalizeEvaluatorSource(source: string): string {
    const normalized = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    let index = 0;
    let state: EvaluatorLexicalState = EvaluatorLexicalState.CODE;
    let result = "";

    if (normalized.startsWith("#!")) {
        const newline = normalized.indexOf("\n");
        const shebang = newline < 0 ? normalized : normalized.slice(0, newline);
        result = shebang.trim();
        index = newline < 0 ? normalized.length : newline + 1;
    }

    while (index < normalized.length) {
        const character = normalized[index] ?? "";
        const next = normalized[index + 1] ?? "";

        if (state === EvaluatorLexicalState.LINE_COMMENT) {
            if (character === "\n") {
                state = EvaluatorLexicalState.CODE;
            }
            index += 1;
            continue;
        }
        if (state === EvaluatorLexicalState.BLOCK_COMMENT) {
            if (character === "*" && next === "/") {
                state = EvaluatorLexicalState.CODE;
                index += 2;
            } else {
                index += 1;
            }
            continue;
        }
        if (state !== EvaluatorLexicalState.CODE) {
            result += character;
            if (character === "\\") {
                result += next;
                index += 2;
                continue;
            }
            const closes =
                (state === EvaluatorLexicalState.SINGLE_QUOTED && character === "'") ||
                (state === EvaluatorLexicalState.DOUBLE_QUOTED && character === '"') ||
                (state === EvaluatorLexicalState.TEMPLATE_QUOTED && character === "`");
            if (closes) {
                state = EvaluatorLexicalState.CODE;
            }
            index += 1;
            continue;
        }

        if (character === "/" && next === "/") {
            state = EvaluatorLexicalState.LINE_COMMENT;
            index += 2;
            continue;
        }
        if (character === "/" && next === "*") {
            state = EvaluatorLexicalState.BLOCK_COMMENT;
            index += 2;
            continue;
        }
        const previous = normalized[index - 1];
        if (character === "#" && (previous === undefined || /\s/u.test(previous))) {
            state = EvaluatorLexicalState.LINE_COMMENT;
            index += 1;
            continue;
        }
        if (/\s/u.test(character)) {
            index += 1;
            continue;
        }
        if (character === "'") {
            state = EvaluatorLexicalState.SINGLE_QUOTED;
        } else if (character === '"') {
            state = EvaluatorLexicalState.DOUBLE_QUOTED;
        } else if (character === "`") {
            state = EvaluatorLexicalState.TEMPLATE_QUOTED;
        }
        result += character;
        index += 1;
    }

    return result;
}
