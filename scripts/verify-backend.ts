import { userService } from '../api/services/userService';
import { db } from '../api/config/firebaseAdmin';
import dotenv from 'dotenv';

dotenv.config();

const TEST_UID = 'test_verifier_user_123';

async function runVerification() {
    console.log('🚀 Starting Backend Verification...');

    try {
        // 1. Setup Test User
        console.log('\n1️⃣  Setting up Test User...');
        const userRef = db.collection('users').doc(TEST_UID);

        // Reset user
        await userRef.set({
            uid: TEST_UID,
            email: 'test@example.com',
            credits: 100,
            mode: 'internal',
            subscription: { plan: 'free', status: 'active' }
        });
        console.log('✅ Test User Reset (100 credits, Free Plan)');

        // 2. Verify Standard Deduction (Free Plan = No Discount)
        console.log('\n2️⃣  Verifying Standard Deduction (Free Plan)...');
        await userService.deductCredits(TEST_UID, 10);
        let user = (await userRef.get()).data();
        if (user?.credits === 90) {
            console.log('✅ Standard Deduction Correct (100 - 10 = 90)');
        } else {
            console.error('❌ Standard Deduction Failed! Expected 90, got', user?.credits);
        }

        // 3. Verify Lite Plan Discount (20% off)
        console.log('\n3️⃣  Verifying Lite Plan Discount (20% off)...');
        await userRef.update({ 'subscription.plan': 'lite', credits: 100 });
        // Deduct 10 -> Should deduct 10 * 0.8 = 8
        await userService.deductCredits(TEST_UID, 10);
        user = (await userRef.get()).data();
        if (user?.credits === 92) {
            console.log('✅ Lite Plan Discount Correct (100 - 8 = 92)');
        } else {
            console.error('❌ Lite Plan Discount Failed! Expected 92, got', user?.credits);
        }

        // 4. Verify Pro Plan Discount (40% off)
        console.log('\n4️⃣  Verifying Pro Plan Discount (40% off)...');
        await userRef.update({ 'subscription.plan': 'pro', credits: 100 });
        // Deduct 10 -> Should deduct 10 * 0.6 = 6
        await userService.deductCredits(TEST_UID, 10);
        user = (await userRef.get()).data();
        if (user?.credits === 94) {
            console.log('✅ Pro Plan Discount Correct (100 - 6 = 94)');
        } else {
            console.error('❌ Pro Plan Discount Failed! Expected 94, got', user?.credits);
        }

        // 5. Verify Ultra Plan Discount (60% off)
        console.log('\n5️⃣  Verifying Ultra Plan Discount (60% off)...');
        await userRef.update({ 'subscription.plan': 'ultra', credits: 100 });
        // Deduct 10 -> Should deduct 10 * 0.4 = 4
        await userService.deductCredits(TEST_UID, 10);
        user = (await userRef.get()).data();
        if (user?.credits === 96) {
            console.log('✅ Ultra Plan Discount Correct (100 - 4 = 96)');
        } else {
            console.error('❌ Ultra Plan Discount Failed! Expected 96, got', user?.credits);
        }

        // 6. Verify External Mode (No Deduction)
        console.log('\n6️⃣  Verifying External Mode (No Deduction)...');
        await userRef.update({ mode: 'external', credits: 100 });
        await userService.deductCredits(TEST_UID, 50);
        user = (await userRef.get()).data();
        if (user?.credits === 100) {
            console.log('✅ External Mode Correct (No deduction)');
        } else {
            console.error('❌ External Mode Failed! Expected 100, got', user?.credits);
        }

        // 7. Verify Insufficient Credits
        console.log('\n7️⃣  Verifying Insufficient Credits...');
        await userRef.update({ mode: 'internal', credits: 5 });
        const result = await userService.deductCredits(TEST_UID, 10); // Need 10, have 5
        if (result === false) {
            console.log('✅ Insufficient Credits Check Correct (Returned false)');
        } else {
            console.error('❌ Insufficient Credits Check Failed! Expected false, got true');
        }

        console.log('\n🎉 Verification Complete!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Verification Error:', error);
        process.exit(1);
    }
}

runVerification();
