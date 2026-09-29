/**
 * Dismissal — close a pop-out on an outside press or Escape.
 *
 * One behavior, one place. Disclosure (Select, CompareControl) and the AppTray's
 * settings menu each implemented it separately: the same pointerdown
 * containment test, the same Escape-returns-focus-to-trigger, the same
 * register-only-while-open effect, and the same teardown. They differed only in
 * what "inside" meant — Disclosure wraps trigger and panel in one container,
 * while the tray holds two sibling refs.
 *
 * Deliberately NOT a component. The tray cannot adopt <Disclosure> without
 * restructuring its DOM (a shared pillar's triggerClass cannot express the
 * tray's state-dependent row class, and the tray's settings menu has no browser
 * test coverage to catch a regression), so sharing the behavior is what
 * actually removes the duplication.
 *
 * Returns a teardown. Callers invoke it from an effect keyed on the open state,
 * so nothing sits on `window` while the pop-out is closed.
 */
export function registerDismissal(options: {
    /** Is this event target inside the pop-out? Trigger and panel both count. */
    contains: (target: Node) => boolean;
    /** Close the pop-out. */
    close: () => void;
    /** Where focus returns on Escape — normally the trigger. */
    focusTrigger?: () => void;
}): () => void {
    const onDown = (event: PointerEvent) => {
        // pointerdown rather than click: it fires for mouse, pen and touch, and
        // an option's commit must not race the trigger's blur.
        if (!options.contains(event.target as Node))
            options.close();
    };
    const onKey = (event: KeyboardEvent) => {
        if (event.key !== "Escape")
            return;
        event.preventDefault();
        options.close();
        options.focusTrigger?.();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("keydown", onKey);
    };
}
