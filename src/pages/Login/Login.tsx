import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import './Login.css';

const Login: React.FC = () => {
  const { loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  // Only block rendering during the *initial* session check, not during
  // login/register actions — otherwise LoginForm unmounts and clears its state.
  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (!loading) initialCheckDone.current = true;
  }, [loading]);

  if (!initialCheckDone.current && loading) {
    return (
      <div className="login-page">
        <div className="loading-spinner">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
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
