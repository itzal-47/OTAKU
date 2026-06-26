import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ArenaPage from './pages/ArenaPage';
import RankingsPage from './pages/RankingsPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ChatPage from './pages/ChatPage';
import CreateCharacterPage from './pages/CreateCharacterPage';
import PrivacyPage from './pages/PrivacyPage';
import AboutPage from './pages/AboutPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';
import FeedPage from './pages/FeedPage';
import StoriesPage from './pages/StoriesPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';
import ClansPage from './pages/ClansPage';
import TournamentsPage from './pages/TournamentsPage';
import TermsPage from './pages/TermsPage';
import HelpPage from './pages/HelpPage';
import FeaturesPage from './pages/FeaturesPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import MessagesPage from './pages/MessagesPage';
import AdminInboxPage from './pages/AdminInboxPage';
import FeedbackPage from './pages/FeedbackPage';
import QuestsPage from './pages/QuestsPage';
import BadgesPage from './pages/BadgesPage';
import QuotesPage from './pages/QuotesPage';
import WatchlistPage from './pages/WatchlistPage';
import FanArtPage from './pages/FanArtPage';
import OSTPage from './pages/OSTPage';
import WikiPage from './pages/WikiPage';
import ShopPage from './pages/ShopPage';
import GuidePage from './pages/GuidePage';
import AchievementsPage from './pages/AchievementsPage';
import FounderPage from './pages/FounderPage';
import BazarPage from './pages/BazarPage';
import AnimeSchedulePage from './pages/AnimeSchedulePage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="stories" element={<StoriesPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="arena" element={<ArenaPage />} />
              <Route path="rankings" element={<RankingsPage />} />
              <Route path="clas" element={<ClansPage />} />
              <Route path="torneios" element={<TournamentsPage />} />
              <Route path="torneios/:id" element={<TournamentsPage />} />
              <Route path="eventos" element={<EventsPage />} />
              <Route path="eventos/:id" element={<EventDetailPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="groups/:id" element={<GroupDetailPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="inbox" element={<AdminInboxPage />} />
              <Route path="feedback" element={<FeedbackPage />} />
              <Route path="quests" element={<QuestsPage />} />
              <Route path="badges" element={<BadgesPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="watchlist" element={<WatchlistPage />} />
              <Route path="fanart" element={<FanArtPage />} />
              <Route path="ost" element={<OSTPage />} />
              <Route path="wiki" element={<WikiPage />} />
              <Route path="loja" element={<ShopPage />} />
              <Route path="guia" element={<GuidePage />} />
              <Route path="conquistas" element={<AchievementsPage />} />
              <Route path="fundador" element={<FounderPage />} />
              <Route path="bazar" element={<BazarPage />} />
              <Route path="calendario-anime" element={<AnimeSchedulePage />} />
              <Route path="criar-personagem" element={
                <ProtectedRoute>
                  <CreateCharacterPage />
                </ProtectedRoute>
              } />
              <Route path="privacidade" element={<PrivacyPage />} />
              <Route path="sobre" element={<AboutPage />} />
              <Route path="perfil/:username" element={<ProfilePage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="termos" element={<TermsPage />} />
              <Route path="ajuda" element={<HelpPage />} />
              <Route path="funcionalidades" element={<FeaturesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
