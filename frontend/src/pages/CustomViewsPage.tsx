import React from 'react';
import OutreachFunnelChart from '../components/OutreachFunnelChart';
import ReplyRateHeatmap from '../components/ReplyRateHeatmap';
import CadencePlaybookPdf from '../components/CadencePlaybookPdf';
import OutreachRulesEditor from '../components/OutreachRulesEditor';

const CustomViewsPage: React.FC = () => {
  return (
    <div data-testid="custom-views-page" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0 }}>Outreach Views</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Funnel + reply heatmap, cadence playbook PDF, and outreach rules editor.
        </p>
      </header>
      <OutreachFunnelChart />
      <ReplyRateHeatmap />
      <CadencePlaybookPdf />
      <OutreachRulesEditor />
    </div>
  );
};

export default CustomViewsPage;
