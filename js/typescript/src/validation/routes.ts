import type { RouteConfig } from "../protocol/types.js";

function normalizePath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? path;
  if (!withoutQuery.startsWith("/")) {
    return `/${withoutQuery}`;
  }
  return withoutQuery.replace(/\/+$/, "") || "/";
}

function matchPattern(pattern: string, path: string): boolean {
  const normalizedPattern = normalizePath(pattern);
  const normalizedPath = normalizePath(path);

  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -2);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }

  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }

  return normalizedPattern === normalizedPath;
}

export function isPublicRoute(path: string, routes: RouteConfig): boolean {
  return (routes.public ?? []).some((pattern) => matchPattern(pattern, path));
}

export function isProtectedRoute(path: string, routes: RouteConfig, protectedMode: boolean): boolean {
  if (isPublicRoute(path, routes)) {
    return false;
  }
  if ((routes.protected ?? []).length > 0) {
    return (routes.protected ?? []).some((pattern) => matchPattern(pattern, path));
  }
  return protectedMode;
}
