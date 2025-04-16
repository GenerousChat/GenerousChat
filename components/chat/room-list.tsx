"use client";

import { BackgroundGradient } from "@/components/ui/background-gradient";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { MessageSquare, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  description: string;
  created_at: string;
  participant_count: number;
  message_count: number;
}

interface RoomListProps {
  rooms: Room[];
}

export function RoomList({ rooms }: RoomListProps) {
  return (
    <CardContainer className="w-full">
      <CardBody className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <BentoGrid className="p-4">
          {rooms.map((room) => (
            <Link href={`/chat/${room.id}`} key={room.id}>
              <BentoGridItem
                title={room.name}
                description={room.description || "No description provided"}
                header={
                  <BackgroundGradient className="rounded-[22px] h-48 w-full p-4 flex items-center justify-center">
                    <CardItem
                      translateZ="100"
                      className="text-4xl font-bold text-neutral-600 dark:text-white"
                    >
                      {room.name[0].toUpperCase()}
                    </CardItem>
                  </BackgroundGradient>
                }
                className="cursor-pointer"
              >
                <motion.div 
                  className="flex gap-4 mt-4 text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{room.participant_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{room.message_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(room.created_at).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              </BentoGridItem>
            </Link>
          ))}
        </BentoGrid>
      </CardBody>
    </CardContainer>
  );
} 