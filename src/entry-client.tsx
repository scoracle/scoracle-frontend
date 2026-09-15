import { hydrate } from "@solidjs/web";
import App from "./app";
import Document from "./Document";
hydrate(() => <Document><App /></Document>, document);
