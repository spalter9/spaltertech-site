import { Route, Switch } from "wouter";
import Index from "./pages/index";
import Login from "./pages/login";
import DataRoom from "./pages/data-room";
import Pillar from "./pages/pillar";
import SspFramework from "./pages/ssp-framework";
import Infrastructure from "./pages/infrastructure";
import Enterprise from "./pages/enterprise";
import Engine from "./pages/engine";
import SurrealStudio from "./pages/surreal-studio";
import SovereignProtocol from "./pages/sovereign-protocol";
import Glossary from "./pages/glossary";
import { Provider } from "./components/provider";
import { RootPasscodeLock } from "./components/root-passcode-lock";
import { AgentFeedback } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      {/* Stage 1: fullscreen passcode only — no site routes until unlock */}
      <RootPasscodeLock>
        <Switch>
          <Route path="/" component={Index} />
          <Route path="/login" component={Login} />
          <Route path="/pillar/:slug" component={Pillar} />
          <Route path="/ssp-framework" component={SspFramework} />
          <Route path="/engine" component={Engine} />
          <Route path="/surreal-studio" component={SurrealStudio} />
          <Route path="/sovereign-protocol" component={SovereignProtocol} />
          <Route path="/glossary" component={Glossary} />
          <Route path="/glossary/:slug" component={Glossary} />
          <Route path="/infrastructure" component={Infrastructure} />
          <Route path="/enterprise" component={Enterprise} />
          <Route path="/data-room" component={DataRoom} />
        </Switch>
      </RootPasscodeLock>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
