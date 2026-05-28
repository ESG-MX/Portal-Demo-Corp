import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

async function startApp() {
    const root = ReactDOM.createRoot(document.getElementById('root'));

    if (DEMO_MODE) {
        // Skip MSAL entirely in demo/portfolio mode.
        root.render(
            <React.StrictMode>
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
            </React.StrictMode>
        );
        return;
    }

    // Production: initialize MSAL before rendering.
    const { PublicClientApplication } = await import('@azure/msal-browser');
    const { MsalProvider } = await import('@azure/msal-react');
    const { msalConfig } = await import('./config/authConfig');

    const msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
    }

    root.render(
        <React.StrictMode>
            <MsalProvider instance={msalInstance}>
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
            </MsalProvider>
        </React.StrictMode>
    );
}

startApp().catch(err => {
    console.error('Error al iniciar la aplicación:', err);
});
