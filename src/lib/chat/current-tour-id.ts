const TOUR_PATH = /^\/tour\/([^/]+)/u;

/**
 * The tour the user is currently looking at, from the router path.
 *
 * The chat head renders at the root of the tree, so `useLocalSearchParams` is
 * not an option — it returns the params of the screen a component is rendered
 * in, and this one is rendered above every screen. Parsing `usePathname()` is
 * the approach the maintenance and onboarding gates already use at this level.
 */
export function tourIdFromPathname(pathname: string): string | null {
  const match = TOUR_PATH.exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Routes where a floating bubble would cover something the user needs. */
export function shouldHideChatHead(pathname: string) {
  return pathname === "/welcome" || /^\/tour\/[^/]+\/nav$/u.test(pathname);
}
