import { render as mount, type JSX } from "@solidjs/web";
import { flush } from "solid-js";
import { getQueriesForElement, fireEvent as dispatch } from "@testing-library/dom";
export { screen, waitFor } from "@testing-library/dom";
const mounted = new Set<() => void>();
export function render(code: () => JSX.Element) {
  const container = document.createElement("div"); document.body.append(container);
  const dispose = mount(code, container); flush();
  const unmount = () => { dispose(); container.remove(); mounted.delete(unmount); };
  mounted.add(unmount);
  return { container, unmount, ...getQueriesForElement(container) };
}
export function cleanup() { for (const dispose of mounted) dispose(); }
export const fireEvent = new Proxy(dispatch, {
  get(target, key) { const fn = Reflect.get(target, key); return typeof fn === "function" ? (...args: unknown[]) => { const value = fn(...args); flush(); return value; } : fn; },
  apply(target, self, args) { const value = Reflect.apply(target, self, args); flush(); return value; },
});
