import { z } from "zod";
import { CapabilityResourceScheme } from "#src/capabilities/capability-resource-reference.const";

const CapabilityResourceReferenceLimit = {
    MAXIMUM_LENGTH: 2_048,
    LONG_OPAQUE_SEGMENT_LENGTH: 80
} as const;

const CapabilityFileReference = {
    LOCAL_HOST: "localhost",
    ROOT_PATH: "/"
} as const;

const CapabilityResourceSecretPattern = {
    OPENAI_KEY: /(?:^|[^\p{L}\p{N}])sk-[a-z\d_-]{12,}(?:$|[^\p{L}\p{N}])/iu,
    BEARER_TOKEN: /(?:^|[^\p{L}\p{N}])bearer(?:%20|\s)+[a-z\d._~+/=-]{8,}/iu,
    CREDENTIAL_ASSIGNMENT:
        /(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)(?:%20|\s)*(?:=|:)(?:%20|\s)*[^/?#&\s]{4,}/iu,
    JSON_WEB_TOKEN: /(?:^|[^a-z\d_-])eyj[a-z\d_-]{8,}\.[a-z\d_-]{8,}\.[a-z\d_-]{8,}/iu,
    AWS_ACCESS_KEY: /(?:^|[^A-Z\d])AKIA[A-Z\d]{16}(?:$|[^A-Z\d])/u,
    LONG_OPAQUE_SEGMENT: new RegExp(
        `(?:^|[/:])[a-z\\d+_=-]{${CapabilityResourceReferenceLimit.LONG_OPAQUE_SEGMENT_LENGTH},}(?=$|[/?#])`,
        "iu"
    )
} as const;

const CapabilityResourceReferenceError = {
    EMPTY: "Capability resource reference must not be empty",
    TOO_LONG: "Capability resource reference is too long",
    UNSAFE: "Capability resource must be an opaque dataset, toolchain, keychain, or file reference",
    SECRET: "Capability resource reference must never contain a credential payload"
} as const;

const capabilityResourceSchemes: ReadonlySet<string> = new Set(
    Object.values(CapabilityResourceScheme)
);

export const CapabilityResourceReferenceSchema = z
    .string()
    .trim()
    .min(1, CapabilityResourceReferenceError.EMPTY)
    .max(CapabilityResourceReferenceLimit.MAXIMUM_LENGTH, CapabilityResourceReferenceError.TOO_LONG)
    .superRefine((value, context) => {
        if (Object.values(CapabilityResourceSecretPattern).some((pattern) => pattern.test(value))) {
            context.addIssue({
                code: "custom",
                message: CapabilityResourceReferenceError.SECRET
            });
            return;
        }

        let reference: URL;
        try {
            reference = new URL(value);
        } catch {
            context.addIssue({
                code: "custom",
                message: CapabilityResourceReferenceError.UNSAFE
            });
            return;
        }

        const hasSafeScheme =
            capabilityResourceSchemes.has(reference.protocol) &&
            value.startsWith(`${reference.protocol}//`);
        const hasCredentialMaterial =
            reference.username.length > 0 ||
            reference.password.length > 0 ||
            reference.search.length > 0 ||
            reference.hash.length > 0;
        const hasSafeLocation =
            reference.protocol === CapabilityResourceScheme.FILE
                ? (reference.hostname.length === 0 ||
                      reference.hostname === CapabilityFileReference.LOCAL_HOST) &&
                  reference.pathname !== CapabilityFileReference.ROOT_PATH
                : reference.hostname.length > 0;

        if (!hasSafeScheme || hasCredentialMaterial || !hasSafeLocation) {
            context.addIssue({
                code: "custom",
                message: hasCredentialMaterial
                    ? CapabilityResourceReferenceError.SECRET
                    : CapabilityResourceReferenceError.UNSAFE
            });
        }
    });
