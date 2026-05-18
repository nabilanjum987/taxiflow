import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        phone: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        firstName: z.ZodString;
        lastName: z.ZodString;
        password: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        phone: string;
        firstName: string;
        lastName: string;
        email?: string | undefined;
        password?: string | undefined;
    }, {
        phone: string;
        firstName: string;
        lastName: string;
        email?: string | undefined;
        password?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        phone: string;
        firstName: string;
        lastName: string;
        email?: string | undefined;
        password?: string | undefined;
    };
}, {
    body: {
        phone: string;
        firstName: string;
        lastName: string;
        email?: string | undefined;
        password?: string | undefined;
    };
}>;
export declare const loginPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
    };
}, {
    body: {
        email: string;
        password: string;
    };
}>;
export declare const sendOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        phone: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        phone: string;
    }, {
        phone: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        phone: string;
    };
}, {
    body: {
        phone: string;
    };
}>;
export declare const verifyOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        phone: z.ZodString;
        code: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        phone: string;
    }, {
        code: string;
        phone: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        code: string;
        phone: string;
    };
}, {
    body: {
        code: string;
        phone: string;
    };
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    body: z.ZodObject<{
        refreshToken: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        refreshToken?: string | undefined;
    }, {
        refreshToken?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        refreshToken?: string | undefined;
    };
}, {
    body: {
        refreshToken?: string | undefined;
    };
}>;
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginPasswordInput = z.infer<typeof loginPasswordSchema>['body'];
export type SendOtpInput = z.infer<typeof sendOtpSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
//# sourceMappingURL=auth.validation.d.ts.map