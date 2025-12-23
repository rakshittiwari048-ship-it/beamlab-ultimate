import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// import { ClerkProvider } from '@clerk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    {/* TODO: Enable ClerkProvider once dependency issues are resolved */}
    {/* <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}> */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    {/* </ClerkProvider> */}
  </StrictMode>
);
