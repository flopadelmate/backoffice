interface PlayerSlotReadOnlyProps {
  name: string;
  pmr: number;
  position: "LEFT" | "RIGHT" | undefined;
}

export function PlayerSlotReadOnly({ name, pmr, position }: PlayerSlotReadOnlyProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm relative">
        {initials}
        {position && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center font-bold">
            {position === "LEFT" ? "G" : "D"}
          </div>
        )}
      </div>
      {/* Nom */}
      <span className="text-xs text-gray-700 text-center max-w-[60px] truncate">
        {name}
      </span>
      {/* PMR */}
      <span className="text-xs font-medium text-gray-500">{pmr.toFixed(1)}</span>
    </div>
  );
}
