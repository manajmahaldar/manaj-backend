const bcrypt = require('bcryptjs');

async function test() {
    let password = "Password@123";
    let hashedPassword = await bcrypt.hash(password, 12);
    console.log("First hash:", hashedPassword);
    
    // Simulate second save with isModified logic
    // In real Mongoose, isModified('password') should be false.
    // But let's see what happens if we hash the hash.
    let doubleHashed = await bcrypt.hash(hashedPassword, 12);
    console.log("Double hash:", doubleHashed);
    
    let match = await bcrypt.compare(password, doubleHashed);
    console.log("Match with double hash:", match);
}

test();
