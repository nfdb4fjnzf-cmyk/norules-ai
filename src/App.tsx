import React from 'react';
import './i18n/config';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Analyzer from './pages/Analyzer';
import History from './pages/History/Index';
import Billing from './pages/Billing';
import ResultView from './pages/ResultView';
import SubscriptionOverview from './pages/Subscription/Overview';
import Plans from './pages/Subscription/Plans';
import TopUp from './pages/Subscription/TopUpV2';
import Success from './pages/Subscription/Success';
import PaymentPage from './pages/Payment/PaymentPage';
import ApiKeys from './pages/Settings/ApiKeys';
import ExternalKey from './pages/Settings/ExternalKey';
import LLMPlayground from './pages/LLM/Playground';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import Landing from './pages/Landing';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import LandingPageList from './pages/LandingPage/List';
import LandingPageEditor from './pages/LandingPage/Editor';

import { ToastProvider } from './components/Toast';
import { ModalProvider } from './contexts/ModalContext';
import GlobalModalManager from './components/GlobalModalManager';

function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <Router>
          <GlobalModalManager />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Protected Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analyze" element={<Analyzer />} />
              <Route path="/analyze/result" element={<ResultView />} />
              <Route path="/history" element={<History />} />
              <Route path="/llm" element={<LLMPlayground />} />

              {/* Subscription Routes */}
              <Route path="/billing" element={<Billing />} />
              <Route path="/subscription" element={<SubscriptionOverview />} />
              <Route path="/subscription/overview" element={<SubscriptionOverview />} />
              <Route path="/subscription/plans" element={<Plans />} />
              <Route path="/subscription/buy-points" element={<TopUp />} />
              <Route path="/subscription/success" element={<Success />} />

              {/* Payment Route */}
              <Route path="/payment" element={<PaymentPage />} />

              <Route path="/settings/apikeys" element={<ApiKeys />} />
              <Route path="/settings/external-key" element={<ExternalKey />} />

              {/* Landing Page Generator Routes */}
              <Route path="/landing-pages" element={<LandingPageList />} />
              <Route path="/landing-pages/new" element={<LandingPageEditor />} />
              <Route path="/landing-pages/:id" element={<LandingPageEditor />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/credits" element={<div className="p-10 text-center text-gray-500">Credits Management Coming Soon</div>} />
              <Route path="/admin/subscriptions" element={<div className="p-10 text-center text-gray-500">Subscription Management Coming Soon</div>} />
              <Route path="/admin/moderation" element={<div className="p-10 text-center text-gray-500">Moderation Coming Soon</div>} />
            </Route>
          </Routes>
        </Router>
      </ModalProvider>
    </ToastProvider>
  );
}

export default App;

