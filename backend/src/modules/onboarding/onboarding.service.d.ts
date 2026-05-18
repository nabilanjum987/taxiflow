export interface OnboardingInput {
    companyName: string;
    adminEmail: string;
    adminPhone: string;
    adminFirstName: string;
    adminLastName: string;
    country: string;
    currency: string;
    timezone: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    planSlug: string;
}
export interface OnboardingResult {
    tenantId: string;
    slug: string;
    adminEmail: string;
    temporaryPassword: string;
    adminPanelUrl: string;
}
/**
 * Full automated onboarding — called after Stripe payment confirmed
 * Creates tenant + admin user + settings + subscription in one transaction
 * Sends welcome email with credentials
 */
export declare function runOnboarding(input: OnboardingInput): Promise<OnboardingResult>;
export declare function sendSetupReminder(tenantId: string): Promise<void>;
export declare function sendChurnPreventionEmail(tenantId: string): Promise<void>;
//# sourceMappingURL=onboarding.service.d.ts.map