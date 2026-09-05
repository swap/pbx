import type { RouteConfig } from "../protocol/types.js";
export declare function isPublicRoute(path: string, routes: RouteConfig): boolean;
export declare function isProtectedRoute(path: string, routes: RouteConfig, protectedMode: boolean): boolean;
