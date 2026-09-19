import { icons, type IconName } from "../../lib/icons.generated";

/** Decorative shared artwork. Put the accessible label on its button/link.
 * Geometry is generated from trusted scoracle-tokens assets, never user input. */
export default function Icon(props: { name: IconName; class?: string; size?: number }) {
    return <svg class={props.class} viewBox={icons[props.name].viewBox}
        width={props.size ?? 24} height={props.size ?? 24}
        fill="currentColor" stroke="none" aria-hidden="true"
        innerHTML={icons[props.name].body}/>;
}

export function BrandMark(props: { class?: string; size?: number }) {
    return <Icon name="brand" class={props.class ?? "app-tray-logo"} size={props.size ?? 40}/>;
}
