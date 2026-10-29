import content from "./tutorials.json";
import { tutorialMediaPaths } from "@three-acts/cms-schema";
import type { TutorialMediaUrls } from "@three-acts/cms-schema";

export type Tutorial = {
  id: string;
  slug: string;
  title: string;
  goal: string;
  category: string;
  duration: number;
  steps: string[];
  check: string;
  notes: string[];
  chapters: Array<{ start: number; text: string }>;
};

export const tutorials: readonly Tutorial[] = content;

export { tutorialMediaPaths };
export type { TutorialMediaUrls };

export function findTutorials(query: string): readonly Tutorial[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return tutorials;
  return tutorials.filter((tutorial) => {
    const text = [tutorial.id, tutorial.title, tutorial.category, tutorial.goal, ...tutorial.steps, ...tutorial.notes].join(" ").toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function formatVideoTime(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
