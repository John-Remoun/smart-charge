import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Webcam from 'react-webcam';
import { FiUser, FiSun, FiMoon, FiGlobe, FiMenu, FiX } from 'react-icons/fi';
import { SiFacebook, SiInstagram, SiX } from 'react-icons/si';
import './App.css';

/** Production: set REACT_APP_API_ORIGIN in Vercel/Netlify to your API URL (https://your-api.onrender.com) — no trailing slash */
const API_ORIGIN = (process.env.REACT_APP_API_ORIGIN || 'http://localhost:5000').replace(/\/$/, '');

const fileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

// Contexts
const ThemeContext = React.createContext();
const LanguageContext = React.createContext();
const AuthContext = React.createContext();

// Hooks
const useTheme = () => React.useContext(ThemeContext);
const useLanguage = () => React.useContext(LanguageContext);
const useAuth = () => React.useContext(AuthContext);

// Translations
const translations = {
  en: {
    home: 'Home', services: 'Services', features: 'Features', status: 'Status', contact: 'Contact',
    leavePhone: 'Leave Your Phone', takePowerbank: 'Take a Powerbank', phoneCharging: 'Phone Charging',
    powerbankRental: 'Powerbank Rental', active: 'Active', inactive: 'Inactive', open: 'Open',
    closed: 'Closed', on: 'On', off: 'Off', minutes: 'min', totalSessions: 'Total Sessions',
    satisfaction: 'Satisfaction', ecoFriendly: 'Eco-Friendly', welcomeBack: 'Welcome back',
    guest: 'Guest', loading: 'Loading...', login: 'Login', register: 'Register', logout: 'Logout',
    profile: 'Profile', settings: 'Settings', darkMode: 'Dark Mode', lightMode: 'Light Mode',
    english: 'English', arabic: 'Arabic', name: 'Name', email: 'Email', password: 'Password',
    confirmPassword: 'Confirm Password', phone: 'Phone', address: 'Address', age: 'Age',
    save: 'Save', cancel: 'Cancel', uploadPhoto: 'Upload Photo', takePhoto: 'Take Photo',
    idFront: 'ID Front', idBack: 'ID Back', paymentMethods: 'Payment Methods', addCard: 'Add Card',
    cardNumber: 'Card Number', cardHolder: 'Card Holder', expiry: 'Expiry', default: 'Default',
    delete: 'Delete',     send: 'Send', message: 'Message', followUs: 'Follow Us',
    rights: 'All rights reserved.', heroSubtitle: 'Charge your phone or rent a powerbank securely.',
    language: 'Language', edit: 'Edit',
    chooseDuration: 'Choose charging duration', pricePerMin: '1 EGP per minute', pay: 'Pay',
    totalLabel: 'Total', selectCard: 'Select a card', noCards: 'No saved cards. Add one below.',
    paymentTitle: 'Payment', sessionTypePhone: 'Phone charging', sessionTypePowerbank: 'Powerbank',
    googleSignIn: 'Sign in with Google', addPaymentMethodTitle: 'Add payment method',
    expMonth: 'MM', expYear: 'YYYY', back: 'Back', capture: 'Capture', retake: 'Retake',
    messageSent: 'Message sent. Thank you!', contactEmailPh: 'Your email (optional)', sending: 'Sending…',
    online: 'Online', offline: 'Offline', openDoor: 'Open door', closeDoor: 'Close door',
    relayOnBtn: 'Relay on', relayOffBtn: 'Relay off', commandQueued: 'Command sent to device'
  },
  ar: {
    home: 'الرئيسية', services: 'الخدمات', features: 'المميزات', status: 'الحالة', contact: 'اتصل بنا',
    leavePhone: 'اترك هاتفك', takePowerbank: 'خذ باوربانك', phoneCharging: 'شحن الهاتف',
    powerbankRental: 'تأجير باوربانك', active: 'نشط', inactive: 'غير نشط', open: 'مفتوح',
    closed: 'مغلق', on: 'تشغيل', off: 'إيقاف', minutes: 'دقيقة', totalSessions: 'إجمالي الجلسات',
    satisfaction: 'الرضا', ecoFriendly: 'صديق للبيئة', welcomeBack: 'مرحباً بعودتك',
    guest: 'زائر', loading: 'جاري التحميل...', login: 'تسجيل دخول', register: 'تسجيل', logout: 'تسجيل خروج',
    profile: 'الملف الشخصي', settings: 'الإعدادات', darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح',
    english: 'الإنجليزية', arabic: 'العربية', name: 'الاسم', email: 'البريد الإلكتروني', password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور', phone: 'الهاتف', address: 'العنوان', age: 'العمر',
    save: 'حفظ', cancel: 'إلغاء', uploadPhoto: 'رفع صورة', takePhoto: 'التقاط صورة',
    idFront: 'الوجه الأمامي للبطاقة', idBack: 'الوجه الخلفي للبطاقة', paymentMethods: 'طرق الدفع',
    addCard: 'إضافة بطاقة', cardNumber: 'رقم البطاقة', cardHolder: 'اسم حامل البطاقة',
    expiry: 'تاريخ الانتهاء', default: 'افتراضي', delete: 'حذف',     send: 'إرسال', message: 'الرسالة',
    followUs: 'تابعنا',
    rights: 'جميع الحقوق محفوظة.', heroSubtitle: 'اشحن هاتفك أو استأجر باوربانك بأمان.',
    language: 'اللغة', edit: 'تعديل',
    chooseDuration: 'اختر مدة الشحن', pricePerMin: '١ جنيه للدقيقة', pay: 'ادفع',
    totalLabel: 'الإجمالي', selectCard: 'اختر بطاقة', noCards: 'لا توجد بطاقات. أضف بطاقة أدناه.',
    paymentTitle: 'الدفع', sessionTypePhone: 'شحن الهاتف', sessionTypePowerbank: 'باوربانك',
    googleSignIn: 'جوجل', addPaymentMethodTitle: 'إضافة وسيلة دفع',
    expMonth: 'شهر', expYear: 'سنة', back: 'رجوع', capture: 'التقط', retake: 'إعادة',
    messageSent: 'تم إرسال الرسالة. شكراً!', contactEmailPh: 'بريدك (اختياري)', sending: 'جاري الإرسال…',
    online: 'متصل', offline: 'غير متصل', openDoor: 'فتح الباب', closeDoor: 'إغلاق الباب',
    relayOnBtn: 'تشغيل المرحل', relayOffBtn: 'إيقاف المرحل', commandQueued: 'تم إرسال الأمر للجهاز'
  }
};

// API Service
const api = {
  baseURL: `${API_ORIGIN}/api`,
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    let res;
    try {
      res = await fetch(this.baseURL + endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers
        }
      });
    } catch {
      throw new Error('Network error');
    }
    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new Error(text.slice(0, 120) || 'Request failed');
        return {};
      }
    }
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },
  register: (data) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => api.request('/auth/me'),
  updateProfile: (data) => api.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getStatus: () => api.request('/esp/status'),
  createSession: (data) => api.request('/esp/session', { method: 'POST', body: JSON.stringify(data) }),
  getPaymentMethods: () => api.request('/user/payment-methods'),
  addPaymentMethod: (data) => api.request('/user/payment-methods', { method: 'POST', body: JSON.stringify(data) }),
  checkout: (data) => api.request('/payment/checkout', { method: 'POST', body: JSON.stringify(data) }),
  processPayment: (data) => api.request('/payment/process', { method: 'POST', body: JSON.stringify(data) }),
  async uploadPhoto(subPath, file) {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('photo', file);
    let res;
    try {
      res = await fetch(`${API_ORIGIN}/api/auth/upload/${subPath}`, {
        method: 'POST',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: fd
      });
    } catch {
      throw new Error('Network error');
    }
    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new Error(text.slice(0, 120) || 'Upload failed');
        return {};
      }
    }
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
  sendContact: (data) => api.request('/contact', { method: 'POST', body: JSON.stringify(data) }),
  espControl: (slug, action, payload) =>
    api.request(`/esp/control/${slug}`, { method: 'POST', body: JSON.stringify({ action, payload: payload || {} }) })
};

// Context Providers
const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }, [darkMode]);
  return <ThemeContext.Provider value={{ darkMode, toggleTheme: () => setDarkMode(!darkMode) }}>{children}</ThemeContext.Provider>;
};

const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  const t = (key) => translations[language][key] || translations.en[key] || key;
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.getMe().then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  const login = async (email, password) => {
    try {
      const data = await api.login({ email, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      toast.success('Logged in');
      return true;
    } catch (err) { toast.error(err.message); return false; }
  };
  const register = async (userData) => {
    try {
      const data = await api.register(userData);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      toast.success('Registered');
      return true;
    } catch (err) { toast.error(err.message); return false; }
  };
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out');
  };
  const updateProfile = async (data) => {
    const updated = await api.updateProfile(data);
    setUser((prev) => (prev ? { ...prev, ...updated, id: updated._id || updated.id || prev.id } : prev));
    return updated;
  };
  const mergeServerUser = (doc) => {
    if (!doc) return;
    setUser((prev) => {
      const u = JSON.parse(JSON.stringify(doc));
      const id = u.id || u._id;
      return { ...(prev || {}), ...u, id: id || (prev && prev.id) };
    });
  };
  return <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, mergeServerUser }}>{children}</AuthContext.Provider>;
};

// Components
const Navbar = () => {
  const { darkMode, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = ['services', 'features', 'status', 'contact'];
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo"><Link to="/">⚡ Smart Charge</Link></div>
        <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          {sections.map((s) => (
            <button key={s} type="button" onClick={() => scrollTo(s)} className="nav-link">{t(s)}</button>
          ))}
        </div>
        <div className="nav-actions">
          <button type="button" onClick={toggleTheme} className="icon-btn">{darkMode ? <FiSun /> : <FiMoon />}</button>
          <button type="button" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="icon-btn icon-btn--wide"><FiGlobe /> {language === 'en' ? 'AR' : 'EN'}</button>
          {user ? (
            <Link to="/profile" className="profile-icon">
              {user.profilePhoto ? <img src={fileUrl(user.profilePhoto)} alt="profile" /> : <FiUser />}
            </Link>
          ) : (
            <Link to="/login" className="icon-btn"><FiUser /></Link>
          )}
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-label="Menu">{mobileOpen ? <FiX /> : <FiMenu />}</button>
        </div>
      </div>
    </nav>
  );
};

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.283 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.262 0-9.8-3.134-11.9-7.618l-6.52 5.026C9.503 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.834-6.238 8.333-11.303 8.333-1.978 0-3.807-.496-5.4-1.353l-6.52 5.026C11.554 39.556 17.224 44 24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.863 11.863 0 0 1 36 23.999c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-follow">{t('followUs')}</p>
        <div className="social-links social-links--icons">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-circle" aria-label="Facebook"><SiFacebook /></a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-circle" aria-label="Instagram"><SiInstagram /></a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-circle" aria-label="X"><SiX /></a>
        </div>
        <p>&copy; 2024 Smart Charge. {t('rights')}</p>
      </div>
    </footer>
  );
};

const CameraModal = ({ open, title, uploadSubPath, onClose, onUploaded, labels }) => {
  const webcamRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) setPreview(img);
  }, []);
  const close = () => { setPreview(null); onClose(); };
  const submit = async () => {
    if (!preview) return;
    try {
      const blob = await (await fetch(preview)).blob();
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const user = await api.uploadPhoto(uploadSubPath, file);
      onUploaded(user);
      toast.success('Photo saved');
      close();
    } catch (e) {
      toast.error(e.message);
    }
  };
  if (!open) return null;
  return (
    <div className="camera-modal" role="dialog" aria-modal="true">
      <div className="camera-content">
        <h3>{title}</h3>
        {!preview ? (
          <>
            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" className="webcam-video" videoConstraints={{ facingMode: 'user' }} />
            <div className="camera-actions">
              <button type="button" className="btn" onClick={close}>{labels.cancel}</button>
              <button type="button" className="btn btn-primary" onClick={capture}>{labels.capture}</button>
            </div>
          </>
        ) : (
          <>
            <img src={preview} alt="Preview" className="id-preview-large" />
            <div className="camera-actions">
              <button type="button" className="btn" onClick={() => setPreview(null)}>{labels.retake}</button>
              <button type="button" className="btn btn-primary" onClick={submit}>{labels.save}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Pages
const Home = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    phoneActive: false,
    phoneTimeLeft: 0,
    powerbankActive: false,
    powerbankTimeLeft: 0,
    phoneDoorOpen: false,
    powerbankDoorOpen: false,
    relayActive: false,
    phoneOnline: false,
    powerbankOnline: false
  });
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  useEffect(() => {
    const tick = () => api.getStatus().then(setStatus).catch(console.error);
    tick();
    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, []);
  const handleAction = (type) => {
    if (!user) { toast.error('Please login first'); return; }
    navigate('/timing', { state: { type } });
  };
  const sendContact = async (e) => {
    e.preventDefault();
    const msg = contactMessage.trim();
    if (msg.length < 3) { toast.error('Please enter a message'); return; }
    setContactSending(true);
    try {
      await api.sendContact({
        message: msg,
        email: contactEmail.trim(),
        name: user?.name || ''
      });
      toast.success(t('messageSent'));
      setContactMessage('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setContactSending(false);
    }
  };
  const queueControl = async (action, payload) => {
    if (!user) { toast.error('Please login first'); return; }
    try {
      await api.espControl('station', action, payload);
      toast.success(t('commandQueued'));
      api.getStatus().then(setStatus).catch(console.error);
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <div className="home">
      <section id="services" className="hero">
        <div className="hero-content"><h1>⚡ Smart Charge</h1><p>{t('welcomeBack')}, {user?.name || t('guest')}! {t('heroSubtitle')}</p><div className="hero-buttons"><button type="button" className="btn btn-primary" onClick={() => handleAction('phone')}>{t('leavePhone')}</button><button type="button" className="btn btn-secondary" onClick={() => handleAction('powerbank')}>{t('takePowerbank')}</button></div></div>
      </section>
      <section id="features" className="features"><h2>{t('features')}</h2><div className="features-grid"><div className="card"><h3>🔒 Secure</h3><p>Your devices are safe with us</p></div><div className="card"><h3>⚡ Fast</h3><p>Quick charging technology</p></div><div className="card"><h3>🌍 Eco-friendly</h3><p>Green energy solutions</p></div></div></section>
      <section id="status" className="status">
        <h2>{t('status')}</h2>
        <div className="status-grid">
          <div className="card">
            <h3>{t('phoneCharging')}</h3>
            <p className="status-line">
              <span className={`status-pill ${status.phoneOnline ? 'on' : 'off'}`}>{status.phoneOnline ? t('online') : t('offline')}</span>
              {' '}{status.phoneActive ? t('active') : t('inactive')} | {t('open')}: {status.phoneDoorOpen ? t('open') : t('closed')} | {t('on')}: {status.relayActive ? t('on') : t('off')}
            </p>
            {user && (
              <div className="device-controls">
                <button type="button" className="btn-small" onClick={() => queueControl('door_open', { target: 'phone' })}>{t('openDoor')}</button>
                <button type="button" className="btn-small" onClick={() => queueControl('door_close', { target: 'phone' })}>{t('closeDoor')}</button>
                <button type="button" className="btn-small" onClick={() => queueControl('relay_on')}>{t('relayOnBtn')}</button>
                <button type="button" className="btn-small" onClick={() => queueControl('relay_off')}>{t('relayOffBtn')}</button>
              </div>
            )}
          </div>
          <div className="card">
            <h3>{t('powerbankRental')}</h3>
            <p className="status-line">
              <span className={`status-pill ${status.powerbankOnline ? 'on' : 'off'}`}>{status.powerbankOnline ? t('online') : t('offline')}</span>
              {' '}{status.powerbankActive ? t('active') : t('inactive')} | {t('open')}: {status.powerbankDoorOpen ? t('open') : t('closed')}
            </p>
            {user && (
              <div className="device-controls">
                <button type="button" className="btn-small" onClick={() => queueControl('door_open', { target: 'powerbank' })}>{t('openDoor')}</button>
                <button type="button" className="btn-small" onClick={() => queueControl('door_close', { target: 'powerbank' })}>{t('closeDoor')}</button>
                <button type="button" className="btn-small" onClick={() => queueControl('relay_on')}>{t('relayOnBtn')}</button>
                <button type="button" className="btn-small" onClick={() => queueControl('relay_off')}>{t('relayOffBtn')}</button>
              </div>
            )}
          </div>
        </div>
      </section>
      <section id="contact" className="contact">
        <h2>{t('contact')}</h2>
        <div className="contact-grid">
          <div className="contact-info">
            <p>📞 +20 123 456 7890</p>
            <p>✉️ info@smartcharge.com</p>
            <p>📍 Cairo, Egypt</p>
          </div>
          <form className="contact-form" onSubmit={sendContact}>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={t('contactEmailPh')} />
            <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder={t('message')} rows="4" required />
            <button type="submit" className="btn btn-primary" disabled={contactSending}>{contactSending ? t('sending') : t('send')}</button>
          </form>
        </div>
      </section>
    </div>
  );
};

const Login = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = async (e) => { e.preventDefault(); if (await login(email, password)) navigate('/'); };
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>{t('login')}</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn btn-primary">{t('login')}</button>
        </form>
        <p><Link to="/register">{t('register')}</Link></p>
        <div className="auth-google-row">
          <button type="button" className="btn-google-circle" onClick={() => toast('Google sign-in coming soon')} aria-label={t('googleSignIn')} title={t('googleSignIn')}><GoogleMark /></button>
        </div>
      </div>
    </div>
  );
};

const Register = () => {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const handleSubmit = async (e) => { e.preventDefault(); if (password !== confirm) { toast.error('Passwords do not match'); return; } if (await register({ name, email, password })) navigate('/'); };
  return (
    <div className="auth-page"><div className="auth-card"><h2>{t('register')}</h2><form onSubmit={handleSubmit}><input type="text" placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} required /><input type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} required /><input type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} required /><input type="password" placeholder={t('confirmPassword')} value={confirm} onChange={e => setConfirm(e.target.value)} required /><button type="submit" className="btn btn-primary">{t('register')}</button></form><p><Link to="/login">{t('login')}</Link></p></div></div>
  );
};

const Profile = () => {
  const { t } = useLanguage();
  const { user, loading, logout, updateProfile, mergeServerUser } = useAuth();
  const navigate = useNavigate();
  const galleryProfileRef = useRef(null);
  const galleryFrontRef = useRef(null);
  const galleryBackRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [cam, setCam] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', age: '' });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const loadCards = () => api.getPaymentMethods().then(setPaymentMethods).catch(console.error);
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      age: user.age != null ? String(user.age) : ''
    });
  }, [user]);
  useEffect(() => { loadCards(); }, []);
  const handleSave = async () => {
    try {
      const ageNum = form.age === '' ? undefined : Number(form.age);
      await updateProfile({ ...form, age: Number.isFinite(ageNum) ? ageNum : undefined });
      setEditMode(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };
  const uploadFile = async (subPath, file) => {
    if (!file) return;
    try {
      const doc = await api.uploadPhoto(subPath, file);
      mergeServerUser(doc);
      toast.success('Photo saved');
    } catch (e) {
      toast.error(e.message);
    }
  };
  const camLabels = { cancel: t('cancel'), capture: t('capture'), retake: t('retake'), save: t('save') };
  if (loading) return <div className="auth-page"><div className="auth-card"><p>{t('loading')}</p></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="profile-page">
      <CameraModal open={cam === 'profile'} title={t('uploadPhoto')} uploadSubPath="profile" onClose={() => setCam(null)} onUploaded={mergeServerUser} labels={camLabels} />
      <CameraModal open={cam === 'idFront'} title={t('idFront')} uploadSubPath="id-front" onClose={() => setCam(null)} onUploaded={mergeServerUser} labels={camLabels} />
      <CameraModal open={cam === 'idBack'} title={t('idBack')} uploadSubPath="id-back" onClose={() => setCam(null)} onUploaded={mergeServerUser} labels={camLabels} />
      <input type="file" accept="image/jpeg,image/png,image/webp" ref={galleryProfileRef} className="visually-hidden" onChange={(e) => { uploadFile('profile', e.target.files?.[0]); e.target.value = ''; }} />
      <input type="file" accept="image/jpeg,image/png,image/webp" ref={galleryFrontRef} className="visually-hidden" onChange={(e) => { uploadFile('id-front', e.target.files?.[0]); e.target.value = ''; }} />
      <input type="file" accept="image/jpeg,image/png,image/webp" ref={galleryBackRef} className="visually-hidden" onChange={(e) => { uploadFile('id-back', e.target.files?.[0]); e.target.value = ''; }} />

      <div className="profile-header">
        <div className="profile-photo">
          {user.profilePhoto ? <img src={fileUrl(user.profilePhoto)} alt="profile" /> : <FiUser size={60} />}
          <div className="photo-actions">
            <button type="button" className="btn-small" onClick={() => setCam('profile')}>📷 {t('takePhoto')}</button>
            <button type="button" className="btn-small" onClick={() => galleryProfileRef.current?.click()}>📁 {t('uploadPhoto')}</button>
          </div>
        </div>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <button type="button" className="btn-logout" onClick={logout}>{t('logout')}</button>
      </div>
      <div className="profile-info">
        <h3>{t('profile')}</h3>
        {editMode ? (
          <>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('name')} />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('phone')} />
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('address')} />
            <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder={t('age')} />
            <button type="button" className="btn btn-primary" onClick={handleSave}>{t('save')}</button>
            <button type="button" className="btn" onClick={() => setEditMode(false)}>{t('cancel')}</button>
          </>
        ) : (
          <>
            <p>{t('name')}: {user.name}</p>
            <p>{t('phone')}: {user.phone || '—'}</p>
            <p>{t('address')}: {user.address || '—'}</p>
            <p>{t('age')}: {user.age || '—'}</p>
            <button type="button" className="btn" onClick={() => setEditMode(true)}>{t('edit')}</button>
          </>
        )}
      </div>
      <div className="id-cards">
        <h3>🪪 ID Verification</h3>
        <div className="id-grid">
          <div className="card id-card-cell">
            {user.idFrontPhoto && <img src={fileUrl(user.idFrontPhoto)} alt="" className="id-thumb" />}
            <div className="id-btns">
              <button type="button" className="btn" onClick={() => setCam('idFront')}>📸 {t('takePhoto')}</button>
              <button type="button" className="btn btn-secondary" onClick={() => galleryFrontRef.current?.click()}>📁 {t('idFront')}</button>
            </div>
          </div>
          <div className="card id-card-cell">
            {user.idBackPhoto && <img src={fileUrl(user.idBackPhoto)} alt="" className="id-thumb" />}
            <div className="id-btns">
              <button type="button" className="btn" onClick={() => setCam('idBack')}>📸 {t('takePhoto')}</button>
              <button type="button" className="btn btn-secondary" onClick={() => galleryBackRef.current?.click()}>📁 {t('idBack')}</button>
            </div>
          </div>
        </div>
      </div>
      <div className="payment-methods">
        <h3>💳 {t('paymentMethods')}</h3>
        {(Array.isArray(paymentMethods) ? paymentMethods : []).map((m) => (
          <div key={m._id || m.id} className="payment-method-row">
            <span>•••• {String(m.cardNumber).replace(/\s/g, '').slice(-4)}</span>
            <button type="button" className="btn-small" aria-label={t('delete')}>🗑️</button>
          </div>
        ))}
        <button type="button" className="btn btn-primary" onClick={() => navigate('/add-card', { state: { from: '/profile' } })}>+ {t('addCard')}</button>
      </div>
    </div>
  );
};

const Settings = () => {
  const { darkMode, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="settings-page">
      <h2>{t('settings')}</h2>
      <div className="settings-card">
        <div className="setting-item">
          <span>{t('darkMode')}</span>
          <button type="button" onClick={toggleTheme} className="toggle-btn">{darkMode ? '🌙' : '☀️'}</button>
        </div>
        <div className="setting-item">
          <span>{t('language')}</span>
          <div>
            <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>🇬🇧 EN</button>
            <button type="button" onClick={() => setLanguage('ar')} className={language === 'ar' ? 'active' : ''}>🇸🇦 AR</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Timing = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const type = state?.type === 'powerbank' ? 'powerbank' : 'phone';
  const options = [1, 15, 30, 60];
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="timing-page">
      <div className="timing-card">
        <h2>{t('chooseDuration')}</h2>
        <p className="timing-sub">{type === 'phone' ? t('sessionTypePhone') : t('sessionTypePowerbank')}</p>
        <p className="timing-rate">{t('pricePerMin')}</p>
        <div className="time-options">
          {options.map((min) => (
            <button
              type="button"
              key={min}
              className="time-option"
              onClick={() => navigate('/payment', { state: { type, minutes: min, amount: min } })}
            >
              <span className="time-option__min">{min} {t('minutes')}</span>
              <span className="time-option__price">{min} EGP</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => navigate(-1)}>{t('back')}</button>
      </div>
    </div>
  );
};

const Payment = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const minutes = state?.minutes;
  const type = state?.type;
  const amount = state?.amount != null ? state.amount : minutes;
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    api.getPaymentMethods().then((list) => {
      setMethods(Array.isArray(list) ? list : []);
      if (list?.[0]?._id) setSelected(String(list[0]._id));
    }).catch(console.error);
  }, []);

  if (!user) return <Navigate to="/login" replace />;
  if (minutes == null || minutes < 1 || !['phone', 'powerbank'].includes(type)) {
    return <Navigate to="/timing" replace state={{ type: 'phone' }} />;
  }

  const pay = async () => {
    if (!selected) { toast.error(t('selectCard')); return; }
    try {
      await api.checkout({ minutes, type, paymentMethodId: selected });
      toast.success('Payment successful');
      navigate('/', { replace: true });
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-card payment-card--flow">
        <h2>{t('paymentTitle')}</h2>
        <div className="payment-summary">
          <p><strong>{type === 'phone' ? t('sessionTypePhone') : t('sessionTypePowerbank')}</strong></p>
          <p>{minutes} {t('minutes')}</p>
          <p className="payment-total">{t('totalLabel')}: <strong>{amount} EGP</strong></p>
        </div>
        <h4 className="pay-methods-title">{t('selectCard')}</h4>
        {!methods.length ? <p className="pay-empty">{t('noCards')}</p> : (
          <ul className="pay-method-list">
            {methods.map((m) => (
              <li key={m._id}>
                <label className="pay-method-option">
                  <input type="radio" name="pm" value={String(m._id)} checked={selected === String(m._id)} onChange={() => setSelected(String(m._id))} />
                  <span>{m.cardHolder} · •••• {String(m.cardNumber).replace(/\s/g, '').slice(-4)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="payment-actions">
          <Link className="btn btn-secondary" to="/add-card" state={{ from: '/payment', returnState: { minutes, type, amount } }}>+ {t('addCard')}</Link>
          <button type="button" className="btn btn-primary pay-btn" onClick={pay} disabled={!methods.length}>{t('pay')} {amount} EGP</button>
        </div>
        <button type="button" className="btn linkish" onClick={() => navigate(-1)}>{t('back')}</button>
      </div>
    </div>
  );
};

const AddCard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { state } = useLocation();
  const from = state?.from || '/profile';
  const returnState = state?.returnState;
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.addPaymentMethod({ cardNumber, cardHolder, expiryMonth, expiryYear });
      toast.success('Card added');
      navigate(from, { replace: true, state: returnState });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="add-card-page">
      <div className="add-card-card">
        <h2>{t('addPaymentMethodTitle')}</h2>
        <form onSubmit={submit} className="add-card-form">
          <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder={t('cardNumber')} required />
          <input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder={t('cardHolder')} required />
          <div className="expiry-row">
            <input value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)} placeholder={t('expMonth')} maxLength={2} required />
            <input value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)} placeholder={t('expYear')} maxLength={4} required />
          </div>
          <button type="submit" className="btn btn-primary">{t('save')}</button>
          <button type="button" className="btn" onClick={() => navigate(-1)}>{t('cancel')}</button>
        </form>
      </div>
    </div>
  );
};

// App Router
const AppRouter = () => {
  return (
    <Router>
      <Navbar />
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/timing" element={<Timing />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/add-card" element={<AddCard />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
    </Router>
  );
};

const App = () => (
  <ThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
