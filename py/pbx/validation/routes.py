from pbx.config import RouteConfig


def _normalize(path: str) -> str:
    path = path.split("?", 1)[0]
    if not path.startswith("/"):
        path = "/" + path
    return path.rstrip("/") or "/"


def _match(pattern: str, path: str) -> bool:
    pattern = _normalize(pattern)
    path = _normalize(path)
    if pattern.endswith("/*"):
        prefix = pattern[:-2]
        return path == prefix or path.startswith(prefix + "/")
    return pattern == path


def is_public_route(path: str, routes: RouteConfig) -> bool:
    return any(_match(p, path) for p in routes.public)


def is_protected_route(path: str, routes: RouteConfig, protected_mode: bool) -> bool:
    if is_public_route(path, routes):
        return False
    if routes.protected:
        return any(_match(p, path) for p in routes.protected)
    return protected_mode
