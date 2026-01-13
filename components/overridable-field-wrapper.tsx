import React, { cloneElement, isValidElement } from "react";
import { Info, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  hasAdminOverride,
  getScrapedValue,
  type OverridableValue,
} from "@/lib/overridable-value";

interface OverridableFieldWrapperProps<T> {
  overridableValue: OverridableValue<T> | null | undefined;
  children: React.ReactElement; // Input/Textarea/Select
  fieldLabel: string;
  formatForCopy?: (value: T) => string; // Fonction de formatage custom
}

export function OverridableFieldWrapper<T>({
  overridableValue,
  children,
  fieldLabel,
  formatForCopy,
}: OverridableFieldWrapperProps<T>) {
  const hasOverride = hasAdminOverride(overridableValue);
  const scrapedValue = getScrapedValue(overridableValue);

  const handleCopy = () => {
    if (scrapedValue == null) return;
    const textToCopy = formatForCopy
      ? formatForCopy(scrapedValue)
      : String(scrapedValue);
    navigator.clipboard.writeText(textToCopy);
  };

  // Clone l'Input et merge la className pour border + padding-right
  const enhancedChild = isValidElement(children)
    ? cloneElement(children as React.ReactElement<any>, {
        className: cn(
          (children.props as any).className,
          hasOverride && "border-primary border-2 pr-10"
        ),
      })
    : children;

  if (!hasOverride) {
    return enhancedChild;
  }

  return (
    <div className="relative">
      {enhancedChild}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
              type="button"
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <p className="text-sm font-medium">Valeur scrapée :</p>
              <p className="text-sm text-muted-foreground">
                {scrapedValue == null
                  ? "Aucune valeur scrapée"
                  : formatForCopy
                  ? formatForCopy(scrapedValue)
                  : String(scrapedValue)}
              </p>
              {scrapedValue != null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="w-full"
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copier
                </Button>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
