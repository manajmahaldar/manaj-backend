const normalizeAndValidate = (phone) => {
    const digits = phone.replace(/\D/g, '');
    let normalized = digits;
    if (digits.length === 12 && digits.startsWith('91')) {
        normalized = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
        normalized = digits.slice(1);
    }
    
    const isValid = /^[6-9]\d{9}$/.test(normalized);
    return { phone, normalized, isValid };
};

const run = () => {
    const cases = [
        { input: "9876543210", expected: true },
        { input: "+91 9876543210", expected: true },
        { input: "08876543210", expected: true },
        { input: "91 7654321098", expected: true },
        { input: "1234567890", expected: false }, // Fake (doesn't start with 6-9)
        { input: "987654321", expected: false },  // Fake (too short)
        { input: "98765432100", expected: false }, // Fake (too long)
        { input: "abcdefghij", expected: false },  // Fake (letters)
    ];

    console.log("=== Testing Indian Phone Validation & Normalization ===\n");
    let allPassed = true;
    for (const c of cases) {
        const res = normalizeAndValidate(c.input);
        const passed = res.isValid === c.expected;
        console.log(`Input: "${c.input}" -> Normalized: "${res.normalized}" -> Valid: ${res.isValid} | Passed: ${passed ? "✅ YES" : "❌ NO"}`);
        if (!passed) allPassed = false;
    }

    if (allPassed) {
        console.log("\n✅ ALL VALIDATION CASES PASSED SUCCESSFULLY!");
    } else {
        console.log("\n❌ SOME VALIDATION CASES FAILED!");
        process.exit(1);
    }
};

run();
