import '../styles/globals.css';
import { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';

// Create a client
const queryClient = new QueryClient();

function ApiWarmup() {
  useQuery({ queryKey: ['hello'], queryFn: apiClient.hello });
  return null;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiWarmup />
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}

export default MyApp;
