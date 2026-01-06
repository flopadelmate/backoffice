"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ClubBackofficeDetailDto } from "@/types/api";
import { cn } from "@/lib/utils";

interface ClubInfoContactProps {
  draft: ClubBackofficeDetailDto;
  onUpdate: (updates: Partial<ClubBackofficeDetailDto>) => void;
  inputClassName: string;
  onGeoValidationChange: (isInvalid: boolean) => void;
}

export function ClubInfoContact({
  draft,
  onUpdate,
  inputClassName,
  onGeoValidationChange,
}: ClubInfoContactProps) {
  // Local state for lat/lng inputs (string to handle validation)
  const [latInput, setLatInput] = useState(String(draft.latitude));
  const [lngInput, setLngInput] = useState(String(draft.longitude));

  // Update local inputs when draft changes from external source
  useEffect(() => {
    setLatInput(String(draft.latitude));
    setLngInput(String(draft.longitude));
  }, [draft.latitude, draft.longitude]);

  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLatInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onUpdate({ latitude: num });
      // Check if both are valid
      const lngNum = parseFloat(lngInput);
      onGeoValidationChange(isNaN(lngNum));
    } else {
      onGeoValidationChange(true);
    }
  };

  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLngInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onUpdate({ longitude: num });
      // Check if both are valid
      const latNum = parseFloat(latInput);
      onGeoValidationChange(isNaN(latNum));
    } else {
      onGeoValidationChange(true);
    }
  };

  const isLatInvalid = isNaN(parseFloat(latInput));
  const isLngInvalid = isNaN(parseFloat(lngInput));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations & Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Phone */}
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={draft.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              className={inputClassName}
              placeholder="Ex: 01 23 45 67 89"
            />
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="websiteUrl">Site web</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={draft.websiteUrl || ""}
              onChange={(e) => onUpdate({ websiteUrl: e.target.value })}
              className={inputClassName}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Address */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="street">Rue</Label>
            <Input
              id="street"
              value={draft.address.street}
              onChange={(e) =>
                onUpdate({
                  address: {
                    ...draft.address,
                    street: e.target.value,
                  },
                })
              }
              className={inputClassName}
            />
          </div>

          <div>
            <Label htmlFor="zipCode">Code postal</Label>
            <Input
              id="zipCode"
              value={draft.address.zipCode}
              onChange={(e) =>
                onUpdate({
                  address: {
                    ...draft.address,
                    zipCode: e.target.value,
                  },
                })
              }
              className={inputClassName}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={draft.address.city}
              onChange={(e) =>
                onUpdate({
                  address: {
                    ...draft.address,
                    city: e.target.value,
                  },
                })
              }
              className={inputClassName}
            />
          </div>
        </div>

        {/* GPS Coordinates with validation */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Coordonnées GPS
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="text"
                value={latInput}
                onChange={handleLatChange}
                className={cn(
                  inputClassName,
                  isLatInvalid && "border-red-500 focus:border-red-500 focus:ring-red-200"
                )}
                placeholder="Ex: 48.856614"
              />
              {isLatInvalid && (
                <p className="text-xs text-red-600 mt-1">Valeur invalide</p>
              )}
            </div>

            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="text"
                value={lngInput}
                onChange={handleLngChange}
                className={cn(
                  inputClassName,
                  isLngInvalid && "border-red-500 focus:border-red-500 focus:ring-red-200"
                )}
                placeholder="Ex: 2.352222"
              />
              {isLngInvalid && (
                <p className="text-xs text-red-600 mt-1">Valeur invalide</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
