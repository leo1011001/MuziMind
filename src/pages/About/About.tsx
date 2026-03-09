import React from 'react';
import { FaInfoCircle, FaArrowLeft, FaMusic, FaHeart, FaCode } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './About.css';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container about-page">
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
            MuziMind е уеб-приложение, което разглежда твоята музикална история 
            от Last.fm и предоставя персонализирани прозрения и прогнози.
          </p>
          <p>
            Събира данни за твоите слушания, анализира твоите предпочитания 
            и генерира уникални препоръки и статистика.
          </p>
        </div>

        <div className="about-section">
          <h2><FaHeart /> Как работи?</h2>
          <ul className="features-list">
            <li>Свързва се с твоя Last.fm профил</li>
            <li>Синхронизира твоята история на слушане</li>
            <li>Анализира твоите предпочитания в реално време</li>
            <li>Генерира персонализирани прогнози</li>
            <li>Визуализира твоята музикална статистика</li>
          </ul>
        </div>

        <div className="about-section">
          <h2><FaCode /> Технологии</h2>
          <p>Изграден с React, TypeScript, MongoDB и Last.fm API</p>
        </div>

        <div className="about-section">
          <h2><FaHeart /> Подкрепи ни</h2>
          <p>Ако харесваш MuziMind, следи за нови функции и по-нататън развой!</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
