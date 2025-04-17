'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Placeholder data for team members - Replace src with actual GitHub profile pic URLs
const teamMembers = [
  { name: "Ajax", role: "Full Stack Developer", src: "https://github.com/username1.png" }, 
  { name: "Lisa", role: "Prompt Engineer", src: "https://github.com/username2.png" },
  { name: "Kappa", role: "Design", src: "https://github.com/username3.png" },
  { name: "Traves", role: "Developer", src: "https://github.com/username4.png" },
];

export function TeamSection() {
  return (
    <section className="text-center pb-6">
      <h2 className="text-3xl font-semibold mb-6">Meet the Team</h2>
      <div className="flex flex-wrap justify-center gap-8 md:gap-12">
        {teamMembers.map((member) => (
          <div key={member.name} className="flex flex-col items-center space-y-2">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-2 border-primary/50 shadow-lg">
              <AvatarImage src={member.src} alt={member.name} />
              <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{member.name}</span>
            <span className="text-sm text-muted-foreground">{member.role}</span>
          </div>
        ))}
      </div>
    </section>
  );
} 