import { Route, Switch } from "wouter";
import Index from "./pages/index";
import Login from "./pages/login";
import DataRoom from "./pages/data-room";
import Pillar from "./pages/pillar";
import SspFramework from "./pages/ssp-framework";
import Infrastructure from "./pages/infrastructure";
import Enterprise from "./pages/enterprise";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/login" component={Login} />
        <Route path="/pillar/:slug" component={Pillar} />
        <Route path="/ssp-framework" component={SspFramework} />
        <Route path="/infrastructure" component={Infrastructure} />
        <Route path="/enterprise" component={Enterprise} />
        <Route path="/data-room" component={DataRoom} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
