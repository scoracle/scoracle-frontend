import HttpStatusCode from "./components/HttpStatusCode";
import { Title, Meta } from "@solidjs/meta";
import PageSkeleton from "./components/PageSkeleton";
import { createRouter, revalidate, useLocation } from "@solidjs/router";
import { Errored, Loading } from "solid-js";
import Profile, { preload } from "./routes/profile/[sport]/[type]/[id]";
import AppTray from "./components/solid/AppTray";
import Footer from "./components/solid/Footer";
import Home, { preload as preloadHome } from "./routes/index";
import ProfileDirectory from "./routes/profile/index";
import Leaderboard, { preload as preloadLeaderboard } from "./routes/leaderboard";
import Stories from "./routes/stories";
import Story, { preload as preloadStory } from "./routes/story/[sport]/[id]";
import About from "./routes/about";
import Contact from "./routes/contact";
import Privacy from "./routes/privacy";
import Terms from "./routes/terms";
import NotFound from "./routes/[...404]";
import { getRequestEvent, isServer, type JSX } from "@solidjs/web";
import "./global.css";
const Router = createRouter({ routes: [
        { path: "/", component: Home, preload: preloadHome },
        { path: "/profile", component: ProfileDirectory },
        { path: "/profile/:sport/:type/:id", component: Profile, preload },
        { path: "/leaderboard", component: Leaderboard, preload: preloadLeaderboard },
        { path: "/stories", component: Stories },
        { path: "/story/:sport/:id", component: Story, preload: preloadStory },
        { path: "/about", component: About },
        { path: "/contact", component: Contact },
        { path: "/privacy", component: Privacy },
        { path: "/terms", component: Terms },
        { path: "*", component: NotFound },
    ] });
function PageFrame(props: {
    children: JSX.Element;
}) {
    const location = useLocation();
    return <>
        <Title>Scoracle</Title>
        <Meta name="description" content="Sports intelligence for NBA, NFL, and Football — stats, news, social sentiment, and AI-powered insights on every player and team."/>
        <Meta property="og:image" content="https://scoracle.com/images/brand-unfurl.png"/>
        <Meta name="twitter:image" content="https://scoracle.com/images/brand-unfurl.png"/>
        <AppTray />
        <Errored fallback={(err, reset) => <main role="alert"><HttpStatusCode code={Math.max(500, getRequestEvent()?.response.status ?? 500)} /><h1>Unable to load this page</h1><p>{String(err())}</p><button onClick={() => { revalidate(); reset(); }}>Try again</button></main>}>
            <Loading on={location.pathname} fallback={<PageSkeleton />}>
                {props.children}
            </Loading>
        </Errored>
        <Footer />
    </>;
}
export default function App() {
    return <Router url={isServer ? getRequestEvent()?.request.url : undefined}>
        {props => <PageFrame>{props.children}</PageFrame>}
    </Router>;
}
