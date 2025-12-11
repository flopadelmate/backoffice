"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string | null;
  onChange: (isoString: string) => void;
  minDate: Date;
  label: string;
  disabled?: boolean;
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

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    slots.push(`${h.toString().padStart(2, "0")}:30`);
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

  return format(date, "d MMM, HH:mm");
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  label,
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>(
    value ? format(new Date(value), "HH:mm") : undefined
  );

  const effectiveMin = roundToNext30Min(minDate);
  const allTimeSlots = generateTimeSlots();

  // Filter time slots based on selected date
  const availableTimeSlots = React.useMemo(() => {
    if (!selectedDate) return allTimeSlots;

    // If selected date is the same as minDate's date, filter hours
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

    // For future dates, all slots are available
    return allTimeSlots;
  }, [selectedDate, effectiveMin, allTimeSlots]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);

    // Reset time if current time is no longer valid for the new date
    if (selectedTime) {
      const isTimeValid = availableTimeSlots.some((slot) => {
        if (isSameDay(date, effectiveMin)) {
          const [hours, minutes] = slot.split(":").map(Number);
          const [selectedHours, selectedMinutes] = selectedTime.split(":").map(Number);
          return hours === selectedHours && minutes === selectedMinutes;
        }
        return true;
      });

      if (!isTimeValid) {
        setSelectedTime(undefined);
      }
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);

    if (selectedDate) {
      const [hours, minutes] = time.split(":").map(Number);
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
    }
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
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDateTime(value) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date(minDate.setHours(0, 0, 0, 0))}
            initialFocus
          />
          {selectedDate && (
            <div className="border-t p-3">
              <Select value={selectedTime} onValueChange={handleTimeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir l'heure" />
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-[200px] overflow-y-auto">
                    {availableTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
