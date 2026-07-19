import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getApiUrl } from '../services/config';
import './Auth.css';

const getErrorMessage = (err: any): string => {
  if (!err) return 'An unknown error occurred.';
  if (typeof err === 'string') return err;
  
  let msg = '';
  
  // 1. If it has a detail property (common in FastAPI validation or exceptions)
  if (err.detail) {
    if (typeof err.detail === 'string') return err.detail;
    if (Array.isArray(err.detail)) {
      return err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (typeof err.detail === 'object') {
      return getErrorMessage(err.detail);
    }
  }

  // 2. Standard message property
  if (err.message && typeof err.message === 'string') {
    msg = err.message;
  } else if (err.message && typeof err.message === 'object') {
    msg = getErrorMessage(err.message);
  } else if (err.error && typeof err.error === 'string') {
    msg = err.error;
  }
  
  if (msg && msg !== '[object Object]') {
    return msg;
  }
  
  // 3. Try to stringify
  try {
    const stringified = JSON.stringify(err);
    if (stringified && stringified !== '{}') return stringified;
  } catch (e) {
    // Ignore stringify error
  }
  
  // 4. Fallback to String conversion
  const str = String(err);
  if (str && str !== '[object Object]') return str;
  
  return 'An error occurred. Please try again.';
};

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
        const requestHeaders = { 'Content-Type': 'application/json' };
        console.log("LOGIN REQUEST:", {
          method: 'POST',
          url: `${api}/auth/login`,
          headers: requestHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ username, password }),
          cookies: document.cookie,
          authorization: 'none',
          origin: window.location.origin,
          referer: document.referrer,
          userAgent: navigator.userAgent
        });
        console.log("LOGIN PAYLOAD", { username, password });

        try {
            res = await fetch(`${api}/auth/login`, {
              method: 'POST',
              headers: requestHeaders,
              body: JSON.stringify({ username, password }),
            });
        } catch (err) {
            console.error("Login fetch failed", err);
            throw err;
        }

        console.log("STATUS:", res.status);
        console.log("STATUSTEXT:", res.statusText);
        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((val, key) => {
          responseHeaders[key] = val;
        });
        console.log("RESPONSE HEADERS:", JSON.stringify(responseHeaders));

        let text = "";
        try {
            text = await res.text();
            console.log("RAW RESPONSE:", text);
        } catch (err) {
            console.error("Failed to read raw response text:", err);
            throw err;
        }

        let data: any = {};
        try {
            data = JSON.parse(text);
            console.log("Login data parsed:", data);
        } catch (err) {
            console.error("JSON parse failed for response:", text, err);
            throw err;
        }

        if (!res.ok) {
          let errText = "Login failed";
          if (data && data.detail) {
            if (typeof data.detail === 'string') {
              errText = data.detail;
            } else if (Array.isArray(data.detail)) {
              errText = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
            } else if (typeof data.detail === 'object') {
              errText = data.detail.message || JSON.stringify(data.detail);
            }
          } else if (data && data.error) {
            errText = data.error;
          }
          throw new Error(errText);
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
                if (body.detail) {
                  if (typeof body.detail === 'string') {
                    errText = body.detail;
                  } else if (Array.isArray(body.detail)) {
                    errText = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
                  } else if (typeof body.detail === 'object') {
                    errText = body.detail.message || JSON.stringify(body.detail);
                  }
                } else {
                  errText = body.error || "Registration failed";
                }
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
      console.error("OUTER CATCH HANDLES ERROR:", err);
      const msg = getErrorMessage(err);
      setError(msg);
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
