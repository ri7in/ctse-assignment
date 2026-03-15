import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { C, FONT, SHADOW, inputStyle, btnPrimary } from '../ds';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    ...inputStyle,
    borderColor: focused === key ? C.accent : C.borderMd,
    boxShadow: focused === key ? `0 0 0 3px ${C.accentLight}` : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff8f9 0%, #f5f5f7 50%, #f0f4ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, background: C.accent, borderRadius: 16,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 8px 24px rgba(255,56,92,0.25)',
          }}>
            <svg width="26" height="26" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white"/>
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity=".7"/>
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity=".7"/>
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity=".4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-.03em', margin: 0 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 15, color: C.sub, margin: '8px 0 0' }}>Join your team on Tasky.io</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, boxShadow: SHADOW.lg, border: '1px solid ' + C.border, padding: '36px 40px' }}>
          <form onSubmit={handleSubmit}>
            {[
              { key: 'name', label: 'Full name', type: 'text', placeholder: 'Jane Appleseed' },
              { key: 'email', label: 'Email address', type: 'email', placeholder: 'you@company.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'At least 8 characters' },
            ].map(({ key, label, type, placeholder }, i) => (
              <div key={key} style={{ marginBottom: i < 2 ? 18 : 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>{label}</label>
                <input
                  type={type} placeholder={placeholder} value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  onFocus={() => setFocused(key)} onBlur={() => setFocused('')}
                  required style={field(key)}
                />
              </div>
            ))}

            {error && (
              <div style={{ background: C.dangerBg, border: '1px solid #FFBBBB', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: C.danger, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', opacity: loading ? 0.7 : 1, padding: '15px', fontSize: 15, borderRadius: 12 }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: C.sub, marginTop: 24 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
