import Head from 'next/head';
import SidePanel from '@/components/SidePanel';
import Globe from '@/components/Globe';

export default function Home() {

  return (
    <div className="container">
      <Head>
        <title>Interactive Earth Globe</title>
        <meta name="description" content="Interactive 3D Earth Globe with coordinates" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex h-screen w-screen">
        <Globe />
        <SidePanel />
      </main>
    </div>
  );
}
