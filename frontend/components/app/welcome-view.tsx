import { Button } from '@/components/ui/button';
import MeshText from '@/components/ui/mesh-text';
import WebThreads from '@/components/ui/web-threads';

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="relative w-full h-full min-h-screen bg-background">
      {/* Background WebThreads - absolute positioned behind everything */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <WebThreads
          color1="#ff6800"
          color2="#00ffab"
          color3="#FFFFFF"
          speed={0.5}
          threadCount={5}
          frequency={3.5}
          spread={0.13}
          taper={1.0}
          position={0.33}
          fanMode="center"
          glow={0.02}
          falloff={0.6}
          thickness={1.8}
          brightness={0.6}
          opacity={0.72}
          mirror={true}
          shimmer={false}
          grain={true}
          grainIntensity={0.12}
          mouseInteraction={true}
          mouseStrength={0.14}
        />
      </div>

      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
        
        {/* MeshText Heading */}
        <div className="w-[800px] max-w-full h-[240px] mb-8">
          <MeshText 
            text="Lexi" 
            colorSplit={true} 
            customColors={["#00E5FF", "#00FF88"]} 
          />
        </div>

        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-6 w-80 h-14 rounded-full font-mono text-base font-bold tracking-wider uppercase bg-white/40 backdrop-blur-md border border-white/40 text-black hover:bg-white/60 shadow-[0_0_15px_rgba(255,104,0,0.3)] hover:shadow-[0_0_25px_rgba(0,255,171,0.5)] transition-all duration-300 z-50 pointer-events-auto cursor-pointer"
        >
          {startButtonText}
        </Button>
      </section>
    </div>
  );
};

