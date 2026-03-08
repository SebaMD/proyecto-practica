export function normalizeEmail(email = "") {
    return String(email).trim().toLowerCase();
}

export function normalizeUsername(username = "") {
    return String(username).trim().replace(/\s+/g, " ");
}

export function normalizeRut(rut = "") {
    return String(rut).trim().toUpperCase();
}

export function isValidRut(rut = "") {
    const normalizedRut = normalizeRut(rut);
    const match = normalizedRut.match(/^(\d{7,8})-([\dK])$/);
    if (!match) return false;

    const body = match[1];
    const verifierDigit = match[2];

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i -= 1) {
        sum += Number(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = 11 - (sum % 11);
    const expectedDigit =
        remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

    return verifierDigit === expectedDigit;
}
