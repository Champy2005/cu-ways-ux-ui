import { useId } from "react";
import logoLight from "../assets/logo-light.svg?raw";
import logoDark from "../assets/logo-dark.svg?raw";
import birdsLight from "../assets/birds-light.svg?raw";
import birdsDark from "../assets/birds-dark.svg?raw";
/** Trusted, bundled source artwork rendered as vectors, as in the original.
 * Prefix local fragment IDs so multiple previews do not share SVG masks. */
export function Artwork({
  kind,
  theme,
}: {
  kind: "logo" | "birds";
  theme: "light" | "dark";
}) {
  const prefix = useId().replaceAll(":", "") + "-";
  const source = (
    kind === "logo"
      ? theme === "dark"
        ? logoDark
        : logoLight
      : theme === "dark"
        ? birdsDark
        : birdsLight
  )
    .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
    .replace("<svg ", `<svg aria-hidden="true" focusable="false" `);
  return (
    <span data-artwork={kind} dangerouslySetInnerHTML={{ __html: source }} />
  );
}
