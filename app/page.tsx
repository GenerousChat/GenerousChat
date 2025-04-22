import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from 'next/link';
import { Github, ArrowRight, Users, Cpu, MessageSquare, PanelRight, Zap, Lock, Mic, Volume2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: "Generous | Build Together",
  description: "Build applications visually with your team and AI assistance in real-time. Get started with Generous today.",
};

const features = [
  {
    title: "Real-time Collaboration",
    description: "Chat rooms with shared canvas for seamless teamwork. Multiple users can interact with the same canvas simultaneously.",
    icon: <Users className="h-10 w-10 mb-4 text-white" />
  },
  {
    title: "AI Assistance",
    description: "Powered by multiple AI models: OpenAI (GPT models), Google Gemini, and XAI (Grok) for sophisticated responses and code suggestions.",
    icon: <Cpu className="h-10 w-10 mb-4 text-white" />
  },
  {
    title: "Visual Canvas",
    description: "Interactive visualization components for prototyping and ideation. Design flows, interfaces, and concepts visually.",
    icon: <PanelRight className="h-10 w-10 mb-4 text-white" />
  },
  {
    title: "Real-time Chat",
    description: "Communicate with team members and AI assistants in real-time with Pusher Channels integration for reliable messaging.",
    icon: <MessageSquare className="h-10 w-10 mb-4 text-white" />
  },
  {
    title: "User Authentication",
    description: "Secure sign-up, sign-in, and password management powered by Supabase Auth.",
    icon: <Lock className="h-10 w-10 mb-4 text-white" />
  },
  {
    title: "Audio Communication",
    description: "Integration with Dyte SDK for real-time audio/video conversations between team members.",
    icon: <Mic className="h-10 w-10 mb-4 text-white" />
  },
  {
    title: "Text-to-Speech",
    description: "Audio playback for messages and AI responses, making collaboration more accessible.",
    icon: <Volume2 className="h-10 w-10 mb-4 text-white" />
  },
  {
    title: "Responsive Design",
    description: "Fully responsive UI with light and dark theme support for working from any device.",
    icon: <Smartphone className="h-10 w-10 mb-4 text-white" />
  },
];

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/chat");
  }

  return (
    <div className="relative flex-1 w-full min-h-[calc(100vh-4rem)]">
      {/* Wrapper to ensure content stretches full page height */}
      <div className="min-h-[calc(100vh-4rem)] relative z-0 overflow-hidden">
      {/* Background image - fixed position for better scrolling experience */}
      <div className="fixed inset-0 w-full h-full z-0">
        <Image 
          src="/Images/Robohand.png"
          alt="Background"
          fill
          priority
          className="object-cover object-center scale-110"
          sizes="100vw"
          quality={100}
        />
      </div>
      
      {/* Solid overlay for readability - fixed position to match the background */}
      <div className="fixed inset-0 bg-black z-1 opacity-70"></div>
      
      {/* Main content container - relative position with higher z-index */}
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 max-w-7xl">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center pt-8 md:pt-16 pb-12 md:pb-20">
          {/* Logo */}
          <div className="mb-6 md:mb-8">
            <Image
              src="/logo.svg"
              alt="Generous Logo"
              width={300} 
              height={96} 
              className="object-contain drop-shadow-lg brightness-0 invert"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4 md:mb-6">
            Build <span className="">Together</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white max-w-3xl mb-8 md:mb-10">
            Create applications visually with your team and AI assistance in real-time. 
            Collaborate, prototype, and innovate on a shared canvas.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
            <Button asChild size="lg" className="rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground/10 h-12 px-8">
              <Link href="/sign-up">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 h-12 px-8">
              <Link href="/sign-in">
                Sign In
              </Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Powerful Features</h2>
            <p className="text-lg text-white max-w-2xl mx-auto">Everything you need to build applications collaboratively with your team.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-primary/50 transition-all duration-300 hover:shadow-md hover:shadow-primary/20">
                {feature.icon}
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
        
        {/* Tech Stack Section */}
        <section className="py-12 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Built With Modern Tech</h2>
            <p className="text-lg text-white max-w-2xl mx-auto">Powered by industry-leading technologies for reliability and performance.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">Next.js</h3>
              <p className="text-white text-sm">React framework</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">React v19</h3>
              <p className="text-white text-sm">UI library</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">TypeScript</h3>
              <p className="text-white text-sm">Type-safe JavaScript</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">Tailwind CSS</h3>
              <p className="text-white text-sm">Utility-first CSS</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">Supabase</h3>
              <p className="text-white text-sm">Auth & Database</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">Pusher</h3>
              <p className="text-white text-sm">Real-time messaging</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">AI SDK</h3>
              <p className="text-white text-sm">Multiple AI models</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <h3 className="text-lg font-bold text-white">Dyte</h3>
              <p className="text-white text-sm">Audio/video calls</p>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="py-12 md:py-20 text-center">
          <div className="bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-800 max-w-4xl mx-auto shadow-lg">
            <Github className="h-16 w-16 mx-auto mb-6 text-white" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">100% Open Source</h2>
            <p className="text-lg text-white mb-8 max-w-2xl mx-auto">
              Generous is fully open source and available on GitHub. View the code, contribute, or fork the project to create your own version.
            </p>
            <Button asChild size="lg" className="rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-gray-800 text-white hover:bg-gray-700 border border-gray-700 h-12 px-8">
              <Link href="https://github.com/GenerousChat/GenerousChat" target="_blank" rel="noopener noreferrer">
                View on GitHub <Github className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-12 md:py-20 text-center">
          <div className="bg-primary rounded-2xl p-8 md:p-12 border border-primary max-w-4xl mx-auto shadow-lg">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-white mb-8 max-w-2xl mx-auto">
              Join Generous today and transform the way you build applications with your team.
            </p>
            <Button asChild size="lg" className="rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground/10 h-12 px-8">
              <Link href="/sign-up">
                Create an Account <Zap className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </div>

      {/* Bottom-right GitHub icon link */}
      <Link 
        href="https://github.com/GenerousChat/GenerousChat" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="View source code on GitHub"
        className="fixed bottom-8 right-8 z-20"
      >
        <Button variant="ghost" size="icon" className="w-10 h-10 bg-gray-900 text-white hover:text-white hover:bg-gray-800 transition-all duration-300 rounded-full shadow-md">
          <Github className="h-5 w-5" />
        </Button>
      </Link>
      </div>
    </div>
  );
}