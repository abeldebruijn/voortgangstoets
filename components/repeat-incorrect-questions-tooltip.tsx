"use client";

import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function RepeatIncorrectQuestionsTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Uitleg over foute vragen later herhalen"
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
          Bij elk fout antwoord wordt dezelfde vraag later opnieuw ingepland op
          een willekeurige plek. Daardoor groeit het totaal aantal vragen in
          deze oefentoets.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
