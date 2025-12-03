import { db } from '../_config/firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';

export interface Coupon {
    code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    validFrom: Timestamp;
    validUntil: Timestamp;
    maxUses: number;
    currentUses: number;
    applicablePlans?: string[]; // If empty, applicable to all
    isActive: boolean;
}

class CouponService {
    private get collection() {
        return db.collection('coupons');
    }

    async validateCoupon(code: string, planId: string): Promise<Coupon> {
        const snapshot = await this.collection.where('code', '==', code).limit(1).get();

        if (snapshot.empty) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Invalid coupon code', 404);
        }

        const coupon = snapshot.docs[0].data() as Coupon;
        const now = Timestamp.now();

        if (!coupon.isActive) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Coupon is inactive', 400);
        }

        if (now < coupon.validFrom || now > coupon.validUntil) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Coupon is expired', 400);
        }

        if (coupon.currentUses >= coupon.maxUses) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Coupon usage limit reached', 400);
        }

        if (coupon.applicablePlans && coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planId)) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Coupon not applicable to this plan', 400);
        }

        return coupon;
    }

    async redeemCoupon(code: string): Promise<void> {
        const snapshot = await this.collection.where('code', '==', code).limit(1).get();
        if (snapshot.empty) return;

        const docRef = snapshot.docs[0].ref;
        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            const data = doc.data() as Coupon;

            if (data.currentUses >= data.maxUses) {
                throw new AppError(ErrorCodes.BAD_REQUEST, 'Coupon usage limit reached', 400);
            }

            t.update(docRef, {
                currentUses: data.currentUses + 1
            });
        });
    }

    calculateDiscount(price: number, coupon: Coupon): number {
        if (coupon.discountType === 'percent') {
            return price * (1 - coupon.discountValue / 100);
        } else {
            return Math.max(0, price - coupon.discountValue);
        }
    }
}

export const couponService = new CouponService();
