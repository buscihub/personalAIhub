'use client';

import { createContext, useContext } from 'react';

// goto('crm', { taskId }) cambia schermata e (opzionalmente) apre il pannello di un elemento.
export const NavContext = createContext({ goto: () => {}, openTaskId: null, clearOpenTask: () => {} });
export const useNav = () => useContext(NavContext);
