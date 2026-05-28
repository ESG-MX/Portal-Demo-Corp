// Provides the same AuthContext interface as AuthContext.jsx but without Azure AD/MSAL.
// Used when VITE_DEMO_MODE=true so the app runs fully offline.

import React from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";

const DEMO_TOKEN = "demo-token";

const demoAuthFetch = axios.create({
    baseURL: "/",
    headers: { Authorization: `Bearer ${DEMO_TOKEN}` },
});

// Mirror the error interceptor from AuthContext so toast messages still work
import { toast } from "sonner";
demoAuthFetch.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error.response?.status ?? null;
        const message = error.response?.data?.message || error.message;
        if (status >= 500)      toast.error(`Falla en el servidor: ${message}`);
        else if (status === 401 || status === 403) toast.error("Sesión caducada o sin permisos.");
        else if (!status)       toast.error("Error de red. Verifica tu conexión.");
        else                    toast.error(`Error ${status}: ${message}`);
        return Promise.reject(error);
    }
);

const demoUser = {
    name:     "Admin Demo",
    username: "admin@democorp.com",
    email:    "admin@democorp.com",
    role:     "admin",
    office:   "Corporativo",
    photo:    null,
    permissions: {
        effectiveRole: "admin",
        level:         5,
        isAdmin:       true,
        isPowerUser:   true,
        isMP:          true,
    },
};

export const DemoAuthProvider = ({ children }) => {
    const value = {
        isAuthenticated: true,
        userProfile:     demoUser,
        accessToken:     DEMO_TOKEN,
        authFetch:       demoAuthFetch,
        isLoading:       false,
        logout:          () => {},
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
