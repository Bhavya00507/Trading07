import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getApiUrl } from '../services/config';
import './Auth.css';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loginAction = useAppStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const api = getApiUrl();
      if (isLogin) {
        let res;
        try {
            res = await fetch(`${api}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password }),
            });
        } catch (err) {
            console.error("Login fetch failed", err);
            throw err;
        }

        console.log("STATUS:", res.status);
        console.log("OK:", res.ok);
        try {
            console.log("BODY:", await res.clone().text());
        } catch (err) {
            console.error("Clone login body read failed", err);
        }

        if (!res.ok) {
          let errText = "Login failed";
          try {
              const detail = await res.json();
              errText = detail.detail || 'Login failed';
          } catch (err) {
              console.error("Failed to parse login error json", err);
          }
          throw new Error(errText);
        }

        let data;
        try {
            data = await res.json();
            console.log("Login data parsed:", data);
        } catch (err) {
            console.error("JSON parse failed", err);
            throw err;
        }

        try {
            loginAction(data.access_token, data.user);
        } catch (err) {
            console.error("Login failed", err);
            throw err;
        }
      } else {
        const apiUrl = api;
        let response;
        try {
            response = await fetch(`${apiUrl}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });
        } catch (err) {
            console.error("Register fetch failed", err);
            throw err;
        }

        console.log("STATUS:", response.status);
        console.log("OK:", response.ok);
        try {
            console.log("BODY:", await response.clone().text());
        } catch (err) {
            console.error("Clone register body read failed", err);
        }

        if (!response.ok) {
            let errText = "Registration failed";
            try {
                const rawBody = await response.text();
                const body = JSON.parse(rawBody);
                errText = body.detail || body.error || "Registration failed";
            } catch (err) {
                console.error("Failed to parse register error json", err);
            }
            throw new Error(errText);
        }

        alert("REGISTER SUCCESS");

        try {
            setSuccess("Registration successful.");
        } catch (err) {
            console.error("SetSuccess failed", err);
        }

        try {
            setIsLogin(true);
        } catch (err) {
            console.error("Navigate failed", err);
        }

        return;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{isLogin ? 'Login to Platform' : 'Create Account'}</h2>
        {error && (
          <div className="auth-alert error">
            {error}
          </div>
        )}
        {success && (
          <div className="auth-alert success">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter username"
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter email"
              />
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <div className="auth-footer">
          <span>
            {isLogin ? "Don't have an account? " : 'Already registered? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
              disabled={loading}
              className="link-btn"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
