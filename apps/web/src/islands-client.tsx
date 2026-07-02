import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { createElement } from "react";
import { islandRegistry } from "./islands/registry";

/**
 * Island runtime. Loaded only on static pages that contain islands. It scans
 * for `[data-island]` markers, imports the matching chunk on demand, and
 * hydrates each island independently. The rest of the page stays static HTML.
 */
async function hydrateIslands() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-island]"));

  await Promise.all(
    nodes.map(async (node) => {
      const name = node.dataset.island;
      if (!name) {
        return;
      }

      const loader = islandRegistry[name];
      if (!loader) {
        console.warn(`[islands] no registry entry for "${name}"`);
        return;
      }

      let props: Record<string, unknown> = {};
      try {
        props = node.dataset.props ? JSON.parse(node.dataset.props) : {};
      } catch (error) {
        console.warn(`[islands] failed to parse props for "${name}"`, error);
      }

      const { default: Component } = await loader();
      hydrateRoot(node, createElement(StrictMode, null, createElement(Component, props)));
    })
  );
}

void hydrateIslands();
