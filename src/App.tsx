import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import Home from "./pages/Home.tsx"
import Stats from "./pages/Stats.tsx"
import Recommendations from "./pages/Recommendations.tsx"
import Profile from "./pages/Profile.tsx"
import "./styles/glass.css"


export default function App() {
return (
<BrowserRouter>
<div className="app-bg">
<nav className="glass-nav">
<h1 className="logo">MuziMind</h1>
<div className="nav-links">
<NavLink to="/">Начало</NavLink>
<NavLink to="/stats">Статистики</NavLink>
<NavLink to="/recommendations">Препоръки</NavLink>
<NavLink to="/profile">Профил</NavLink>
</div>
</nav>


<main className="page-container">
<Routes>
<Route path="/" element={<Home />} />
<Route path="/stats" element={<Stats />} />
<Route path="/recommendations" element={<Recommendations />} />
<Route path="/profile" element={<Profile />} />
</Routes>
</main>
</div>
</BrowserRouter>
)
}