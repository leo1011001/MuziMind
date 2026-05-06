import React from 'react';
import { FaInfoCircle, FaArrowLeft, FaMusic, FaHeart, FaCode, FaBrain, FaChartBar, FaHatWizard, FaShieldAlt, FaServer } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './About.css';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Назад
        </button>
        <h1><FaInfoCircle /> За MuziMind</h1>
      </div>

      <div className="about-content">
        <div className="about-section">
          <h2><FaMusic /> Какво е MuziMind?</h2>
          <p>
            MuziMind е персонализирана музикална платформа, която чете твоята история на слушане
            от Last.fm и я превръща в живи прозрения, прогнози и истории.
          </p>
          <p>
            Нещо повече от статистика — платформата разбира кога, какво и защо слушаш,
            и всеки ден ти предлага уникален музикален прочит, съставен специално за теб.
          </p>
        </div>

        <div className="about-section">
          <h2><FaHeart /> Какво предлага?</h2>
          <ul className="features-list">
            <li>Синхронизация с Last.fm и анализ на историята на слушане</li>
            <li>Дневен прочит — AI-генериран текст за твоето музикално настроение</li>
            <li>Дневна прогноза — препоръчани артисти, пиков час и слушателски модели</li>
            <li>Артистски истории — визуален карусел с биографии и факти за любимите ти изпълнители</li>
            <li>Статистика — топ артисти, песни и жанрове с визуални класации</li>
            <li>Музикална личност — AI-профил, изведен от твоите слушания</li>
            <li>Поддръжка на светла и тъмна тема, оптимизирана за мобилни устройства</li>
          </ul>
        </div>

        <div className="about-section">
          <h2><FaBrain /> Изкуствен интелект</h2>
          <p>
            MuziMind използва <strong>Groq</strong> с модел <strong>Llama 3.3 70B</strong> за генериране
            на дневния прочит, музикалната личност и мъдростта на деня — всичко на български,
            персонализирано спрямо твоите реални данни от Last.fm.
          </p>
        </div>

        <div className="about-section">
          <h2><FaChartBar /> Как работи?</h2>
          <ul className="features-list">
            <li>Свързваш своя Last.fm профил от настройките</li>
            <li>Платформата изтегля и съхранява твоите скробли в реално време</li>
            <li>Алгоритъмът анализира времеви модели, жанрове и артисти</li>
            <li>AI изгражда твоя дневен прочит и прогноза на базата на реални данни</li>
            <li>Всеки ден получаваш ново съдържание, уникално за теб</li>
          </ul>
        </div>

        <div className="about-section">
          <h2><FaCode /> Технологии</h2>
          <ul className="features-list">
            <li><strong>Frontend:</strong> React 18, TypeScript, Vite — хостван на Vercel</li>
            <li><strong>Backend:</strong> Node.js, Express, TypeScript — хостван на Railway</li>
            <li><strong>База данни:</strong> MongoDB Atlas</li>
            <li><strong>AI:</strong> Groq API (Llama 3.3 70B)</li>
            <li><strong>Музикални данни:</strong> Last.fm API</li>
            <li><strong>Имейл:</strong> Resend API</li>
          </ul>
        </div>

        <div className="about-section">
          <h2><FaShieldAlt /> Сигурност и поверителност</h2>
          <p>
            Акаунтите се защитават с хеширани пароли, верификация по имейл и сесийна автентикация
            с JWT резервен механизъм за пълна поддръжка на Safari и мобилни браузъри.
            Данните ти се пазят единствено за нуждите на платформата.
          </p>
        </div>

        <div className="about-section">
          <h2><FaServer /> Статус</h2>
          <p>
            MuziMind е активно разработван проект. Следи за нови функционалности и развития в платформата!
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
