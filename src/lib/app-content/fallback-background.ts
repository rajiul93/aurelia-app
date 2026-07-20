/**
 * The bundled background shown before — or instead of — the CMS photo.
 *
 * The background URL lives in the app-content payload, so on a fresh install
 * there is no URL to render at all until the first fetch lands, and the app
 * painted an empty screen the moment the splash lifted. This asset ships in the
 * binary, so there is always something to show.
 *
 * Exported from one module so the bootstrap preloader and PageBackground can
 * never end up warming one asset and rendering another.
 *
 * Note it is a *light* image, unlike the dark CMS photos — anything that styles
 * foreground text against the background must keep keying off the remote URL,
 * not off "a background exists".
 */
export const FALLBACK_BACKGROUND = require("../../../assets/images/backpu-time.png");
