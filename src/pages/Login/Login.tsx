import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import './Login.css';

const Login: React.FC = () => {
  const { loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (loading) {
    return (
      <div className="login-page">
        <div className="loading-spinner">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="language-toggle-container">
          <LanguageToggle />
        </div>

        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};

export default Login;
