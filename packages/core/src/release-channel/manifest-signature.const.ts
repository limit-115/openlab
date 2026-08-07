/**
 * The keys a release manifest may be signed with.
 *
 * A digest in the manifest proves that an archive is the one the manifest described. It proves
 * nothing about the manifest, because whoever can put a manifest in front of a lab can put their
 * own digest in it and their own archive behind it. This is what closes that: the manifest is
 * signed, the key that signed it is compiled into the lab, and a manifest signed by anything else
 * is not a release this lab will install from.
 *
 * There is more than one because rotation has to overlap. A new key is added here and released
 * first, so that labs already installed trust it before anything is signed with it alone; the old
 * one is removed a release later, once nothing an operator might still be running needs it.
 */
export const TRUSTED_RELEASE_KEYS: readonly string[] = [
    "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAgscyMHFWvVzqsIZ+u8Yr2URn2I9quLEMdHh+8PzhbWg=\n-----END PUBLIC KEY-----\n"
];

/** What the signature of a file is published as, beside the file it signs. */
export const SIGNATURE_SUFFIX = ".sig";

/**
 * How an operator running their own release channel names the key it signs with.
 *
 * A mirror is only useful if a lab will install from it, and it will not install from anything it
 * cannot check. The key named here is trusted in addition to the ones above and never instead of
 * them, so naming one opens a mirror rather than closing the door on the published releases.
 */
export const RELEASES_KEY_VARIABLE = "OPENLAB_RELEASES_KEY";
