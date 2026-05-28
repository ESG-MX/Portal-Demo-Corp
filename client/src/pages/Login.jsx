import React from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../config/authConfig";

const Login = () => {
    const { instance } = useMsal();
    const handleLogin = () => { instance.loginRedirect(loginRequest); };

    return (
        <div className="min-h-screen bg-azul-primary flex justify-center items-center font-sans">
            <div className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-[420px] w-full mx-4 border border-white/20">
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 bg-azul-primary rounded-2xl flex items-center justify-center border-2 border-naranja-primary/30 shadow-xl">
                        <span className="text-5xl font-black text-naranja-primary leading-none">P</span>
                    </div>
                </div>
                <h2 className="text-2xl font-black mb-10 tracking-tighter uppercase">
                    <span className="text-azul-primary">PORTAL</span>{' '}
                    <span className="text-naranja-primary">DEMO CORP</span>
                </h2>
                <button
                    onClick={handleLogin}
                    className="flex items-center justify-center w-full bg-[#2F2F2F] hover:bg-black text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg"
                >
                    <img
                        className="w-6 h-6 mr-3"
                        src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                        alt="Microsoft"
                    />
                    Entrar con Microsoft
                </button>
                <div className="mt-12 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">
                    &copy; 2026 DEMO CORP
                </div>
            </div>
        </div>
    );
};

export default Login;
