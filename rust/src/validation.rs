use crate::config::RouteConfig;

fn normalize(path: &str) -> String {
    let path = path.split('?').next().unwrap_or(path);
    let path = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    };
    path.trim_end_matches('/').to_string()
}

fn match_pattern(pattern: &str, path: &str) -> bool {
    let pattern = normalize(pattern);
    let path = normalize(path);
    let path = if path.is_empty() { "/".into() } else { path };
    if let Some(prefix) = pattern.strip_suffix("/*") {
        return path == prefix || path.starts_with(&format!("{prefix}/"));
    }
    pattern == path
}

pub fn is_public_route(path: &str, routes: &RouteConfig) -> bool {
    routes.public.iter().any(|p| match_pattern(p, path))
}

pub fn is_protected_route(path: &str, routes: &RouteConfig, protected_mode: bool) -> bool {
    if is_public_route(path, routes) {
        return false;
    }
    if !routes.protected.is_empty() {
        return routes.protected.iter().any(|p| match_pattern(p, path));
    }
    protected_mode
}
