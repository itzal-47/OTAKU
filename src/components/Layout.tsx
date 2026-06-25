import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatSidebar from './ChatSidebar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
        <ChatSidebar />
      </div>
      <Footer />
    </div>
  );
}
