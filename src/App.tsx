import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home/Home.tsx"
import Stats from "./pages/Stats/Stats.tsx"
import Recommendations from "./pages/Recommendations/Recommendations.tsx"
import Profile from "./pages/Profile/Profile.tsx"
import Login from "./pages/Login/Login.tsx"
import { StatsPage } from "./pages/StatsExpanded/StatsExpanded.tsx"
import { RecommendationsExpanded } from "./pages/RecommendationsExpanded/RecommendationsExpanded.tsx"
import { AboutPage } from "./pages/About/About.tsx"
import Admin from "./pages/Admin/Admin.tsx"
import Moderator from "./pages/Moderator/Moderator.tsx"
import VerifyEmail from "./pages/VerifyEmail/VerifyEmail.tsx"
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword.tsx"
import ResetPassword from "./pages/ResetPassword/ResetPassword.tsx"
import { Navigation } from "./components/ui/Navigation/Navigation.tsx"
import StarField from "./components/ui/StarField/StarField.tsx"
import "./styles/glass.css"


export default function App() {
  useEffect(() => {
    const updateCards = (x: number, y: number) => {
      const cards = document.querySelectorAll<HTMLElement>('.glass-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${x - rect.left}px`);
        card.style.setProperty('--mouse-y', `${y - rect.top}px`);
      });
    };

    const handleMouseMove = (e: MouseEvent) => updateCards(e.clientX, e.clientY);

    // Touch support — follow finger slide
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateCards(touch.clientX, touch.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="app-bg">
        <StarField />
        <Navigation />

        <main className="page-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/stats-expanded" element={<StatsPage />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/recommendations-expanded" element={<RecommendationsExpanded />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/moderator" element={<Moderator />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}