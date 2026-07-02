import type { ComponentType } from "react";

type IslandProps<TProps extends Record<string, unknown>> = {
  /** Registry key (see `src/islands/registry.ts`); must match the client loader. */
  name: string;
  /** The component, imported directly so it server-renders into the HTML. */
  component: ComponentType<TProps>;
  /** JSON-serializable props, embedded for client hydration. */
  props?: TProps;
};

/**
 * Marks an interactive island. The component is server-rendered into the HTML
 * (so content is present with zero JS and is indexable), wrapped in a marker
 * the island runtime finds and hydrates on the client. Only pages containing
 * an `[data-island]` node load the island runtime + the matching chunk.
 */
export function Island<TProps extends Record<string, unknown>>({ name, component: Component, props }: IslandProps<TProps>) {
  const serialized = props ? JSON.stringify(props) : "{}";

  return (
    <div data-island={name} data-props={serialized} style={{ display: "contents" }}>
      <Component {...((props ?? {}) as TProps)} />
    </div>
  );
}
