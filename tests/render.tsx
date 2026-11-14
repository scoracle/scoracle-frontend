import { render as mount } from "solid-js/web";
import type { JSX } from "solid-js";
import { getQueriesForElement } from "@testing-library/dom";
export { screen, waitFor, fireEvent } from "@testing-library/dom";
const mounted = new Set<() => void>();
export function render(code: () => JSX.Element) {
  const container = document.createElement("div"); document.body.append(container);
  const dispose = mount(code, container);
  const unmount = () => { dispose(); container.remove(); mounted.delete(unmount); };
  mounted.add(unmount);
  return { container, unmount, ...getQueriesForElement(container) };
}
export function cleanup() { for (const dispose of mounted) dispose(); }
