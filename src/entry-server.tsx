import { renderToStream } from "@solidjs/web";
import manifest from "virtual:solid-manifest";
import App from "./app";
import Document from "./Document";
// Preserve the existing full-document contract for every request. Awaiting
// the stream returns settled HTML and lets failure status settle before flush.
export async function render() {
    return await renderToStream(() => <Document><App /></Document>, { manifest });
}
