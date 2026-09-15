import { createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { httpHeader, httpStatus } from "@solidjs/web";
/** Declarative SSR redirect, with the same destination on client navigation. */
export default function RouteRedirect(props: {
    href: string;
}) {
    const navigate = useNavigate();
    httpStatus(301);
    httpHeader("Location", props.href);
    createEffect(() => props.href, href => navigate(href, { replace: true }));
    return null;
}
