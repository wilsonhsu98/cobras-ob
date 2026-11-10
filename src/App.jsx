import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TeamDataProvider, useTeamData } from './hooks/useTeamData';
import { ToastProvider } from './hooks/useToast';
import Header from './components/Header';
import TabBar from './components/TabBar';
import Splash from './components/Splash';
import SchedulePage from './pages/SchedulePage';
import RosterPage from './pages/RosterPage';
import GearPage from './pages/GearPage';
import AdminPage from './pages/AdminPage';
import BindPage from './pages/BindPage';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}

function Gate() {
  const { status, error } = useAuth();
  if (status === 'loading') return <Splash text="登入中…" />;
  if (status === 'error') {
    return (
      <Splash text={error}>
        <button className="btn" style={{ maxWidth: 240 }} onClick={() => location.reload()}>重新整理</button>
      </Splash>
    );
  }
  if (status !== 'ready') return <BindPage />;
  return (
    <TeamDataProvider>
      <Shell />
    </TeamDataProvider>
  );
}

function Shell() {
  const { loading, error } = useTeamData();
  if (loading) return <Splash text="載入資料中…" />;
  return (
    <>
      <Header />
      <main>
        {error && <div className="notice" style={{ marginBottom: 12 }}>部分資料讀取失敗：{error.code || error.message}</div>}
        <Routes>
          <Route path="/" element={<SchedulePage />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/gear" element={<GearPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </>
  );
}
