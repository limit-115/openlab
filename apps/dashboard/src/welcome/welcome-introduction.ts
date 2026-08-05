import { WELCOME_SEEN, WELCOME_STORAGE_KEY } from "#src/welcome/welcome.const";

/** Whether this browser has already been shown what the lab is and how it works. */
export function hasBeenIntroduced(): boolean {
    return localStorage.getItem(WELCOME_STORAGE_KEY) !== null;
}

/** Remembered for the next visit, so the introduction happens once rather than every morning. */
export function rememberIntroduction(): void {
    localStorage.setItem(WELCOME_STORAGE_KEY, WELCOME_SEEN);
}

/** How an operator asks to be walked through the lab again. */
export function forgetIntroduction(): void {
    localStorage.removeItem(WELCOME_STORAGE_KEY);
}
