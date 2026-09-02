import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  userId: string;
  userName: string;
  userMobile: string;
  setUserProfile: (mobile: string, name: string) => void;
  adminToken: string | null;
  adminEmail: string | null;
  isAdminLoggedIn: boolean;
  loginAdmin: (token: string, email: string) => void;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Viewer identity
  const [userId, setUserId] = useState<string>(() => {
    const saved = localStorage.getItem('shortvideo_user_id');
    if (saved) return saved;
    const generated = 'user_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('shortvideo_user_id', generated);
    return generated;
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('shortvideo_user_name') || '';
  });

  const [userMobile, setUserMobile] = useState<string>(() => {
    return localStorage.getItem('shortvideo_user_mobile') || '';
  });

  // Admin auth
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('shortvideo_admin_token');
  });

  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    return localStorage.getItem('shortvideo_admin_email');
  });

  const setUserProfile = (mobile: string, name: string) => {
    setUserMobile(mobile);
    setUserName(name);
    localStorage.setItem('shortvideo_user_mobile', mobile);
    localStorage.setItem('shortvideo_user_name', name);
  };

  const loginAdmin = (token: string, email: string) => {
    setAdminToken(token);
    setAdminEmail(email);
    localStorage.setItem('shortvideo_admin_token', token);
    localStorage.setItem('shortvideo_admin_email', email);
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminEmail(null);
    localStorage.removeItem('shortvideo_admin_token');
    localStorage.removeItem('shortvideo_admin_email');
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        userName,
        userMobile,
        setUserProfile,
        adminToken,
        adminEmail,
        isAdminLoggedIn: !!adminToken,
        loginAdmin,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
