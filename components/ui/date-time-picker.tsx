"use client";

import * as React from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string | null;
  onChange: (isoString: string) => void;
  minDate: Date;
  label: string;
  disabled?: boolean;
  variant?: "start" | "end";
}

function roundToNext30Min(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  result.setSeconds(0, 0);

  if (minutes === 0 || minutes === 30) {
    return result;
  }

  if (minutes < 30) {
    result.setMinutes(30);
  } else {
    result.setHours(result.getHours() + 1, 0, 0, 0);
  }

  return result;
}

function generateTimeSlots(variant?: "start" | "end"): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    slots.push(`${h.toString().padStart(2, "0")}:30`);
  }

  // Filter based on variant
  if (variant === "start") {
    // Début: exclure avant 08:00
    return slots.filter((slot) => {
      const [hours] = slot.split(":").map(Number);
      return hours >= 8;
    });
  }

  if (variant === "end") {
    // Fin: exclure entre 02:00 et 07:30 (garder 00:00-01:30 et 08:00+)
    return slots.filter((slot) => {
      const [hours, minutes] = slot.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      // Garder si <= 01:30 (90 min) ou >= 08:00 (480 min)
      return totalMinutes <= 90 || totalMinutes >= 480;
    });
  }

  return slots;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Aujourd'hui, ${format(date, "HH:mm")}`;
  }

  return format(date, "d MMM, HH:mm", { locale: fr });
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) return "Aujourd'hui";
  if (isTomorrow) return "Demain";

  return format(date, "EEE d MMM", { locale: fr });
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  label,
  disabled = false,
  variant,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const effectiveMin = roundToNext30Min(minDate);
  const minDateStart = getStartOfDay(minDate);
  const allTimeSlots = generateTimeSlots(variant);

  // Initialize selectedDate: from value, or minDate's day (not today which could be before minDate)
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    if (value) return getStartOfDay(new Date(value));
    return getStartOfDay(minDate);
  });

  // Sync selectedDate when value changes externally
  React.useEffect(() => {
    if (value) {
      setSelectedDate(getStartOfDay(new Date(value)));
    }
  }, [value]);

  // Filter time slots based on selected date
  const availableTimeSlots = React.useMemo(() => {
    if (isSameDay(selectedDate, effectiveMin)) {
      const minHour = effectiveMin.getHours();
      const minMinute = effectiveMin.getMinutes();

      return allTimeSlots.filter((slot) => {
        const [hours, minutes] = slot.split(":").map(Number);
        if (hours > minHour) return true;
        if (hours === minHour && minutes >= minMinute) return true;
        return false;
      });
    }

    return allTimeSlots;
  }, [selectedDate, effectiveMin, allTimeSlots]);

  // Get currently selected time from value
  const selectedTime = value ? format(new Date(value), "HH:mm") : null;

  const canGoPrevious = !isSameDay(selectedDate, minDateStart);

  const handlePreviousDay = () => {
    const prevDay = addDays(selectedDate, -1);
    if (prevDay >= minDateStart) {
      setSelectedDate(prevDay);
    }
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleSlotSelect = (slot: string) => {
    const [hours, minutes] = slot.split(":").map(Number);
    const newDate = new Date(selectedDate);
    newDate.setHours(hours, minutes, 0, 0);

    // Format as ISO local (without Z)
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const day = String(newDate.getDate()).padStart(2, "0");
    const hour = String(newDate.getHours()).padStart(2, "0");
    const minute = String(newDate.getMinutes()).padStart(2, "0");
    const isoLocal = `${year}-${month}-${day}T${hour}:${minute}:00`;

    onChange(isoLocal);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatDateTime(value) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="flex flex-col">
          {/* Header navigation jour */}
          <div className="flex items-center justify-between border-b px-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePreviousDay}
              disabled={!canGoPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {formatDayLabel(selectedDate)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grille des créneaux horaires */}
          <div className="max-h-[250px] overflow-y-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {availableTimeSlots.map((slot) => {
                const isSelected = selectedTime === slot && value && isSameDay(selectedDate, new Date(value));
                return (
                  <Button
                    key={slot}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 text-xs",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleSlotSelect(slot)}
                  >
                    {slot}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
