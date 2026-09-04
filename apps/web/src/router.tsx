import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './app-shell/MainLayout';
import { LoginPage } from './pages/login';
import { AssetsPage } from './pages/assets';
import { TopologyPage } from './pages/topology';
import { MonitorPage } from './pages/monitor';
import { ConfigPage } from './pages/config';
import { AuditPage } from './pages/audit';
import { DataPage } from './pages/data';

/** 路由（React Router 7）：/login + 受保护主框架（五大模块子路由）。 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/assets" replace /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'topology', element: <TopologyPage /> },
      { path: 'monitor', element: <MonitorPage /> },
      { path: 'config', element: <ConfigPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'data', element: <DataPage /> },
    ],
  },
]);
