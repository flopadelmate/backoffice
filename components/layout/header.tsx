"use client";

import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-gray-600" />
        <div className="text-sm">
          <p className="font-medium text-gray-900">{user?.name || "Admin"}</p>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={logoutMutation.isPending}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {logoutMutation.isPending ? "Déconnexion..." : "Déconnexion"}
      </Button>
    </header>
  );
}
