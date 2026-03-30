import { BrowserRouter, Routes, Route } from "react-router-dom"
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}