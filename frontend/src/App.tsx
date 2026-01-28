import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Templates from './pages/Templates';
import TemplateDetail from './pages/TemplateDetail';
import Analytics from './pages/Analytics';
import ABTests from './pages/ABTests';
import ABTestDetail from './pages/ABTestDetail';
import Integrations from './pages/Integrations';
import IntegrationDetail from './pages/IntegrationDetail';
import Team from './pages/Team';
import TeamMemberDetail from './pages/TeamMemberDetail';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';
import Sequences from './pages/Sequences';
import SequenceDetail from './pages/SequenceDetail';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Notifications from './pages/Notifications';
import { AuthProvider, useAuth } from './hooks/useAuth';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/contacts/:id" element={<ContactDetail />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/templates/:id" element={<TemplateDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/ab-tests" element={<ABTests />} />
                <Route path="/ab-tests/:id" element={<ABTestDetail />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/integrations/:id" element={<IntegrationDetail />} />
                <Route path="/team" element={<Team />} />
                <Route path="/team/:id" element={<TeamMemberDetail />} />
                <Route path="/ai-assistant" element={<AIAssistant />} />
                <Route path="/sequences" element={<Sequences />} />
                <Route path="/sequences/:id" element={<SequenceDetail />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/meetings/:id" element={<MeetingDetail />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:id" element={<ReportDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
