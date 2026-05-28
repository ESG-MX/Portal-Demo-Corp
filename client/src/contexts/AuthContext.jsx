import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useMsal } from "@azure/msal-react";
import axios from "axios";
import { toast } from "sonner";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { instance, accounts } = useMsal();
    const [accessToken, setAccessToken] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const getSession = async () => {
        if (accounts.length > 0) {
            try {
                const response = await instance.acquireTokenSilent({
                    scopes: ["api://00000000-0000-0000-0000-000000000001/access_as_user"],
                    account: accounts[0],
                });
                const token = response.accessToken;
                setAccessToken(token);

                const backendRes = await axios.get('/api/user/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                let photoUrl = null;
                try {
                    const graphResponse = await instance.acquireTokenSilent({
                        scopes: ["User.Read"],
                        account: accounts[0]
                    });
                    const photoRes = await axios.get("https://graph.microsoft.com/v1.0/me/photo/$value", {
                        headers: { Authorization: `Bearer ${graphResponse.accessToken}` },
                        responseType: 'blob',
                        validateStatus: (status) => status < 500
                    });

                    if (photoRes.status === 200) {
                        const blob = photoRes.data;
                        photoUrl = URL.createObjectURL(blob);
                    }
                } catch (photoErr) {}

                const finalEmail = accounts[0].username.toLowerCase();
                const finalOffice = backendRes.data.office || backendRes.data.verifiedOffice || backendRes.data.officeLocation || 'Sin Oficina';
                const rawRole = (backendRes.data.role || 'usuario').toLowerCase().trim();
                const effectiveRole = finalEmail === (import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@democorp.com') ? 'admin' : rawRole;
                const ROLE_LEVELS = { 'admin': 5, 'manager': 2, 'mc': 4, 'mp': 3, 'comp': 2, 'usuario': 1, 'user': 1 };

                setUserProfile({
                    name: accounts[0].name,
                    username: finalEmail,
                    email: finalEmail,
                    role: effectiveRole,
                    office: finalOffice,
                    photo: photoUrl,
                    permissions: {
                        effectiveRole,
                        level: ROLE_LEVELS[effectiveRole] || 1,
                        isAdmin: effectiveRole === 'admin',
                        isPowerUser: ['admin', 'manager', 'mc', 'mp', 'comp'].includes(effectiveRole) || String(finalOffice).toLowerCase() === 'corporativo',
                        isMP: ['mp', 'admin'].includes(effectiveRole)
                    }
                });
            } catch (error) {
                console.error("Error cargando sesión global:", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        getSession();
        // Refrescar token cada 30 minutos para evitar "jwt expired"
        const interval = setInterval(async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        scopes: ["api://00000000-0000-0000-0000-000000000001/access_as_user"],
                        account: accounts[0],
                    });
                    setAccessToken(response.accessToken);
                } catch (e) {
                    console.error("Falló autorefresco de token:", e);
                }
            }
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [accounts, instance]);

    const authFetch = useMemo(() => {
        if (!accessToken) return null;
        const api = axios.create({
            baseURL: '/',
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        api.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error.response ? error.response.status : null;
                const message = error.response?.data?.message || error.message;
                if (status >= 500) {
                    toast.error(`Falla en el servidor: ${message}`);
                } else if (status === 401 || status === 403) {
                    toast.error("Sesión caducada o sin permisos.");
                } else if (!status) {
                    toast.error("Error de red. Verifica tu conexión.");
                } else {
                    toast.error(`Error ${status}: ${message}`);
                }
                return Promise.reject(error);
            }
        );
        return api;
    }, [accessToken]);

    const logout = () => instance.logoutRedirect();

    const value = {
        isAuthenticated: accounts.length > 0,
        userProfile,
        accessToken,
        authFetch,
        isLoading,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
    }
    return context;
};
