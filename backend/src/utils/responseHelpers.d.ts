import { Response } from 'express';
import type { PaginationMeta } from '@taxiflow/shared-utils';
export declare function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number): void;
export declare function sendCreated<T>(res: Response, data: T, message?: string): void;
export declare function sendNoContent(res: Response): void;
export declare function sendPaginated<T>(res: Response, data: T[], pagination: PaginationMeta): void;
//# sourceMappingURL=responseHelpers.d.ts.map