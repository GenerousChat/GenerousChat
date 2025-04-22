import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import React from 'react';
import Image from "next/image";
import Link from 'next/link';
import { Github, ArrowRight, Users, Cpu, MessageSquare, PanelRight, Zap, Lock, Mic, Volume2, Smartphone, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: "Generous | Build Together",
  description: "Build applications visually with your team and AI assistance in real-time. Get started with Generous today.",
};

const features = [
  {
    title: "Real-time Collaboration",
    description: "Work together seamlessly with multiple users on the same canvas in real-time.",
    icon: <Users className="h-8 w-8 text-primary" />
  },
  {
    title: "AI Assistance",
    description: "Get intelligent suggestions from OpenAI, Google Gemini, and XAI Grok models.",
    icon: <Cpu className="h-8 w-8 text-primary" />
  },
  {
    title: "Visual Canvas",
    description: "Design interfaces and workflows visually with interactive components.",
    icon: <PanelRight className="h-8 w-8 text-primary" />
  },
  {
    title: "Real-time Chat",
    description: "Communicate instantly with team members and AI assistants.",
    icon: <MessageSquare className="h-8 w-8 text-primary" />
  }
];

const additionalFeatures = [
  {
    title: "Secure Authentication",
    description: "Enterprise-grade security with Supabase Auth.",
    icon: <Lock className="h-8 w-8 text-primary" />
  },
  {
    title: "Audio Communication",
    description: "Crystal-clear audio/video calls with Dyte SDK integration.",
    icon: <Mic className="h-8 w-8 text-primary" />
  },
  {
    title: "Text-to-Speech",
    description: "Convert messages to audio for better accessibility.",
    icon: <Volume2 className="h-8 w-8 text-primary" />
  },
  {
    title: "Open Source",
    description: "100% open source and available on GitHub.",
    icon: <Code className="h-8 w-8 text-primary" />
  }
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
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section with clean white design */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Hero content */}
            <div className="md:w-1/2 text-center md:text-left">
              <Image
                src="/logo.svg"
                alt="Generous Logo"
                width={280} 
                height={90} 
                className="mx-auto md:mx-0 mb-8"
              />
              
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
                Build Applications <span className="text-primary">Together</span>
              </h1>
              
              <p className="text-xl text-gray-700 mb-10 max-w-xl leading-relaxed">
                Create, collaborate, and innovate with your team and AI assistance in real-time on a shared canvas.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button asChild size="lg" className="rounded-lg font-medium bg-primary text-white hover:bg-primary/90 h-12 px-6 shadow-md">
                  <Link href="/sign-up">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                
                <Button asChild variant="outline" size="lg" className="rounded-lg font-medium text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 h-12 px-6 shadow-md">
                  <Link href="/sign-in">
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Hero image */}
            <div className="md:w-1/2 mt-8 md:mt-0 relative">
              <div className="relative h-[300px] md:h-[400px] w-full rounded-xl overflow-hidden shadow-xl">
                <Image 
                  src="/Images/Robohand.png"
                  alt="Robot Hand"
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={100}
                />
              </div>
              {/* Second image overlapping */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden shadow-lg border-4 border-white">
                <Image 
                  src="/aifriends.png"
                  alt="AI Friends"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100px, 200px"
                  quality={100}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">Everything you need to build applications collaboratively</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-primary">
                <div className="bg-primary/10 p-3 rounded-lg inline-block mb-4">
                  {React.cloneElement(feature.icon, { className: "h-8 w-8 text-primary" })}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary Features with Alternate Background */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">More Capabilities</h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">Advanced features to enhance your collaborative experience</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {additionalFeatures.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-primary">
                <div className="bg-primary/10 p-3 rounded-lg inline-block mb-4">
                  {React.cloneElement(feature.icon, { className: "h-8 w-8 text-primary" })}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built With Modern Tech</h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">Powered by industry-leading technologies</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">Next.js</h3>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">React v19</h3>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">TypeScript</h3>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">Tailwind CSS</h3>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">Supabase</h3>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">Pusher</h3>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">AI SDK</h3>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <h3 className="text-lg font-medium text-gray-900">Dyte</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-primary/5 rounded-xl p-10 border border-primary/20 text-center shadow-md">
            <Github className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">100% Open Source</h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              View the code, contribute, or fork the project to create your own version.
            </p>
            <Button asChild size="lg" className="rounded-lg font-medium bg-primary text-white hover:bg-primary/90 h-12 px-6 shadow-md">
              <Link href="https://github.com/GenerousChat/GenerousChat" target="_blank" rel="noopener noreferrer">
                View on GitHub <Github className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-primary rounded-xl p-10 text-center shadow-lg">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-white mb-8 max-w-2xl mx-auto">
              Join Generous today and transform the way you build applications with your team.
            </p>
            <Button asChild size="lg" className="rounded-lg font-medium bg-white text-primary hover:bg-gray-100 h-12 px-8 shadow-md">
              <Link href="/sign-up">
                Create an Account <Zap className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bottom-right GitHub icon link */}
      <Link 
        href="https://github.com/GenerousChat/GenerousChat" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="View source code on GitHub"
        className="fixed bottom-8 right-8 z-50"
      >
        <Button variant="ghost" size="icon" className="w-10 h-10 bg-white text-gray-800 hover:text-primary hover:bg-gray-50 transition-all duration-300 rounded-full shadow-md border border-gray-200">
          <Github className="h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}