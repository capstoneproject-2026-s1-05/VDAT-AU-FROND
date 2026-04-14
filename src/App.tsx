import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch } from 'wouter';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import TrainingLoad from './pages/TrainingLoad';
import StrengthPower from './pages/StrengthPower';
import Recovery from './pages/Recovery';
import DataSources from './pages/DataSources';
import Comparison from './pages/Comparison';
import FivbLive from './pages/FivbLive';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/training-load" component={TrainingLoad} />
          <Route path="/strength-power" component={StrengthPower} />
          <Route path="/recovery" component={Recovery} />
          <Route path="/sources" component={DataSources} />
          <Route path="/compare" component={Comparison} />
          <Route path="/fivb-live" component={FivbLive} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </TooltipProvider>
  );
}
