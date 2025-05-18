import Head from 'next/head';
import SatelliteMenu from '@/components/SatelliteMenu';
import Globe from '@/components/Globe';
import SidePanel from '@/components/SidePanel';

export default function Home() {

  return (
    <div className="container">
      <Head>
        <title>Interactive Earth Globe</title>
        <meta name="description" content="Interactive 3D Earth Globe with coordinates" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex h-screen w-screen">
        <SatelliteMenu />
        <Globe />
        <SidePanel />
      </main>
    </div>
  );
}
