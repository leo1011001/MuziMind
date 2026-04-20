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
import { Navigation } from "./components/ui/Navigation/Navigation.tsx"
import StarField from "./components/ui/StarField/StarField.tsx"
import "./styles/glass.css"


export default function App() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll<HTMLElement>('.glass-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}