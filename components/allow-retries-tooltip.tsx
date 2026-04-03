"use client";

import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AllowRetriesTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Uitleg over herkansingen toestaan"
              className="text-muted-foreground"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <Info className="h-4 w-4" />
            </button>
          }
        />
        <TooltipContent className="max-w-64 font-sans">
          Als dit aan staat, kun je een fout beantwoorde vraag opnieuw proberen
          tot je hem goed hebt. Als dit uit staat, wordt je eerste antwoord
          direct vastgezet.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
