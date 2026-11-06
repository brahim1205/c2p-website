import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SETTINGS_TAB_PARAM, settingsTabsFor, type SettingsTab } from './parametresModel';

/** Settings tab driven by `?onglet=` (links can open a tab directly) and limited to the role's tabs. */
export function useSettingsTab(role: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabs = useMemo(() => settingsTabsFor(role), [role]);
  const requestedTab = SETTINGS_TAB_PARAM[searchParams.get('onglet') ?? ''];
  const [selectedTab, setSelectedTab] = useState<SettingsTab>(requestedTab ?? 'account');
  useEffect(() => {
    if (requestedTab) setSelectedTab(requestedTab);
  }, [requestedTab]);
  const activeTab: SettingsTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : 'account';
  const setActiveTab = (tab: SettingsTab) => {
    setSelectedTab(tab);
    const param = Object.entries(SETTINGS_TAB_PARAM).find(([, value]) => value === tab)?.[0];
    setSearchParams(param ? { onglet: param } : {}, { replace: true });
  };
  return { tabs, activeTab, setActiveTab };
}
