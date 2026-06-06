"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Heart, Bookmark, Share2 } from "lucide-react";

export type SocialPostData = {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
  content: string;
  position?: {
    type: "yes" | "no";
    candidate: string;
    market: string;
  };
  image?: string;
  likes: number;
  replies: number;
  liked?: boolean;
  saved?: boolean;
};

interface SocialPostProps {
  post: SocialPostData;
}

export function SocialPost({ post }: SocialPostProps) {
  return (
    <div className="border-b border-border p-4 hover:bg-secondary/50 transition-colors">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.user.avatar} alt={post.user.name} />
          <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">
              {post.user.name}
            </span>
            <span className="text-muted-foreground text-sm">
              @{post.user.username}
            </span>
            <span className="text-muted-foreground text-sm">
              {post.timestamp}
            </span>

            {post.position && (
              <Badge
                variant="secondary"
                className={
                  post.position.type === "yes"
                    ? "bg-yes-bg text-yes border-yes/20"
                    : "bg-no-bg text-no border-no/20"
                }
              >
                {post.position.type === "yes" ? "Yes" : "No"} ·{" "}
                {post.position.candidate} · {post.position.market}
              </Badge>
            )}
          </div>

          <p className="mt-2 text-foreground whitespace-pre-wrap">
            {post.content}
          </p>

          {post.image && (
            <div className="mt-3 rounded-xl overflow-hidden max-w-[400px]">
              <Image
                src={post.image}
                alt="Post attachment"
                width={400}
                height={260}
                unoptimized
                className="w-full h-auto"
              />
            </div>
          )}

          <div className="flex items-center gap-6 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-brand gap-1.5 h-8 px-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs tabular-nums">{post.replies}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 h-8 px-2 ${
                post.liked
                  ? "text-brand"
                  : "text-muted-foreground hover:text-brand"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`}
              />
              <span className="text-xs tabular-nums">{post.likes}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                post.saved
                  ? "text-brand"
                  : "text-muted-foreground hover:text-brand"
              }`}
            >
              <Bookmark
                className={`h-4 w-4 ${post.saved ? "fill-current" : ""}`}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-brand h-8 px-2"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
