import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamically import the Globe component with no SSR to avoid server-side rendering issues
const Globe = dynamic(() => import('../components/Globe'), { ssr: false });

export default function Home() {

  return (
    <div className="container">
      <Head>
        <title>Interactive Earth Globe</title>
        <meta name="description" content="Interactive 3D Earth Globe with coordinates" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {/* Globe takes full height and width */}
        <Globe />        
      </main>

      <style jsx>{`
        .container {
          width: 100%;
          height: 100%;
        }
        
        main {
          width: 100%;
          height: 100%;
          position: relative;
        }
      `}</style>
    </div>
  );
} 