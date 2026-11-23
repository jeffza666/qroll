/**
 * Keep post-login navigation inside this app.
 * Accepts a relative path, or an absolute URL when `currentOrigin` matches.
 */
export function getSafeRedirect(input?: string | null, currentOrigin?: string) {
  if (!input) return "/";

  const value = input.trim();
  if (!value) return "/";

  let path = value;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
    try {
      const url = new URL(value);
      if (!currentOrigin || url.origin !== currentOrigin) return "/";
      path = `${url.pathname}${url.search}`;
    } catch {
      return "/";
    }
  }

  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return "/";
  }
  if (path.includes("\\") || path.includes("://") || /[\u0000-\u001F]/.test(path)) {
    return "/";
  }
  if (path.startsWith("/login") || path.startsWith("/api/auth")) return "/";

  return path;
}
