import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

/**
 * useAuth Hook
 * Consumes the global AuthContext to provide session data and profile information.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe usarse dentro de un AuthProvider");
    }
    return context;
};