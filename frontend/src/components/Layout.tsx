import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Mail,
  Users,
  FileText,
  BarChart3,
  FlaskConical,
  Plug,
  UsersRound,
  Sparkles,
  Settings,
  LogOut,
  Zap,
  GitBranch,
  Calendar,
  CheckSquare,
  FileBarChart,
  Bell
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { path: '/campaigns', label: 'Campaigns', icon: Mail, section: 'main' },
    { path: '/sequences', label: 'Sequences', icon: GitBranch, section: 'main' },
    { path: '/contacts', label: 'Contacts', icon: Users, section: 'main' },
    { path: '/templates', label: 'Templates', icon: FileText, section: 'main' },
    { path: '/meetings', label: 'Meetings', icon: Calendar, section: 'activity' },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare, section: 'activity' },
    { path: '/notifications', label: 'Notifications', icon: Bell, section: 'activity' },
    { path: '/analytics', label: 'Analytics', icon: BarChart3, section: 'insights' },
    { path: '/ab-tests', label: 'A/B Tests', icon: FlaskConical, section: 'insights' },
    { path: '/reports', label: 'Reports', icon: FileBarChart, section: 'insights' },
    { path: '/ai-assistant', label: 'AI Assistant', icon: Sparkles, section: 'tools' },
    { path: '/integrations', label: 'Integrations', icon: Plug, section: 'tools' },
    { path: '/team', label: 'Team', icon: UsersRound, section: 'settings' },
    { path: '/settings', label: 'Settings', icon: Settings, section: 'settings' },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sections = [
    { key: 'main', label: 'Main' },
    { key: 'activity', label: 'Activity' },
    { key: 'insights', label: 'Insights' },
    { key: 'tools', label: 'Tools' },
    { key: 'settings', label: 'Account' },
  ];

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Zap size={28} />
            <span>SalesAI</span>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.key} className="nav-section">
            <div className="nav-section-title">{section.label}</div>
            {navItems
              .filter((item) => item.section === section.key)
              .map((item) => (
                <div
                  key={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.path)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </div>
              ))}
          </div>
        ))}

        <div className="nav-section" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <div className="nav-item" style={{ marginBottom: '8px' }}>
            <div className="avatar sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <span>{user?.firstName} {user?.lastName}</span>
          </div>
          <div className="nav-item" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
