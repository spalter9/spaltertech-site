import { Route, Switch } from "wouter";
import Index from "./pages/index";
import Login from "./pages/login";
import DataRoom from "./pages/data-room";
import Pillar from "./pages/pillar";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/login" component={Login} />
        <Route path="/pillar/:slug" component={Pillar} />
        <Route path="/data-room" component={DataRoom} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
