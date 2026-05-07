import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';

export const theme = createTheme({
  palette: {
    primary:   { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#fff' },
    secondary: { main: '#ec4899', light: '#f472b6', dark: '#db2777' },
    success:   { main: '#10b981' },
    warning:   { main: '#f59e0b' },
    error:     { main: '#ef4444' },
    background:{ default: '#f8fafc', paper: '#ffffff' },
    text:      { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, padding: '8px 20px', fontWeight: 600 },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(99,102,241,.35)' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid rgba(0,0,0,.06)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
    },
  },
});

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: 10, fontFamily: 'Inter' } }} />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
