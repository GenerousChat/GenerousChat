"use client";

import { FileTree, FileTreeItem } from "@/components/ui/magicui/file-tree";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Bot, User } from "lucide-react";
import { motion } from "framer-motion";

interface UserListProps {
  users: {
    id: string;
    name: string;
    email: string;
    isAgent?: boolean;
    isOnline?: boolean;
  }[];
  className?: string;
}

export function UserList({ users, className }: UserListProps) {
  const agents = users.filter(user => user.isAgent);
  const regularUsers = users.filter(user => !user.isAgent);

  const UserAvatar = ({ user }: { user: UserListProps["users"][0] }) => (
    <Avatar className="h-6 w-6">
      <AvatarImage src={`https://avatar.vercel.sh/${user.id}.png`} />
      <AvatarFallback>{user.name[0]}</AvatarFallback>
    </Avatar>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={className}
    >
      <FileTree>
        <FileTreeItem
          label="Online Users"
          icon={<Users className="h-4 w-4 text-blue-500" />}
          defaultOpen
        >
          {agents.length > 0 && (
            <FileTreeItem
              label="AI Agents"
              icon={<Bot className="h-4 w-4 text-purple-500" />}
              defaultOpen
            >
              {agents.map(user => (
                <FileTreeItem
                  key={user.id}
                  label={user.name}
                  icon={<UserAvatar user={user} />}
                />
              ))}
            </FileTreeItem>
          )}
          
          <FileTreeItem
            label="Users"
            icon={<User className="h-4 w-4 text-green-500" />}
            defaultOpen
          >
            {regularUsers.map(user => (
              <FileTreeItem
                key={user.id}
                label={user.name}
                icon={<UserAvatar user={user} />}
              />
            ))}
          </FileTreeItem>
        </FileTreeItem>
      </FileTree>
    </motion.div>
  );
} 