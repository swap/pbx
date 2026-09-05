function normalizePath(path) {
    const withoutQuery = path.split("?")[0] ?? path;
    if (!withoutQuery.startsWith("/")) {
        return `/${withoutQuery}`;
    }
    return withoutQuery.replace(/\/+$/, "") || "/";
}
function matchPattern(pattern, path) {
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
export function isPublicRoute(path, routes) {
    return (routes.public ?? []).some((pattern) => matchPattern(pattern, path));
}
export function isProtectedRoute(path, routes, protectedMode) {
    if (isPublicRoute(path, routes)) {
        return false;
    }
    if ((routes.protected ?? []).length > 0) {
        return (routes.protected ?? []).some((pattern) => matchPattern(pattern, path));
    }
    return protectedMode;
}
