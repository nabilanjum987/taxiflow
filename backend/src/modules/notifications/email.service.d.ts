export interface SendEmailInput {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, string | number | boolean>;
    tenantId?: string;
}
export declare function sendEmail(input: SendEmailInput): Promise<void>;
//# sourceMappingURL=email.service.d.ts.map