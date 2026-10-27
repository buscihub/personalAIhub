'use client';

import { useState } from 'react';
import TopBar from './TopBar';
import Grid from './Grid';
import CaptureBar from './CaptureBar';
import { NavContext } from './NavContext';
import HomeScreen from './screens/HomeScreen';
import CrmScreen from './screens/CrmScreen';
import FinanzeScreen from './screens/FinanzeScreen';
import ReviewScreen from './screens/ReviewScreen';

const SCREENS = [
  { id: 'home', label: 'Home', Component: HomeScreen },
  { id: 'crm', label: 'CRM', Component: CrmScreen },
  { id: 'finanze', label: 'Finanze', Component: FinanzeScreen },
  { id: 'review', label: 'Review', Component: ReviewScreen },
];

export default function Dashboard() {
  const [active, setActive] = useState('home');
  const [openTaskId, setOpenTaskId] = useState(null);

  const nav = {
    openTaskId,
    clearOpenTask: () => setOpenTaskId(null),
    goto: (screen, opts = {}) => {
      setOpenTaskId(opts.taskId ?? null);
      setActive(screen);
      window.scrollTo({ top: 0 });
    },
  };

  return (
    <NavContext.Provider value={nav}>
      <TopBar screens={SCREENS} active={active} onSelect={setActive} />
      <Grid>
        {SCREENS.map(({ id, Component }) => (
          <div key={id} className={`screen${active === id ? ' on' : ''}`} id={`screen-${id}`}>
            <Component />
          </div>
        ))}
      </Grid>
      <CaptureBar />
    </NavContext.Provider>
  );
}
