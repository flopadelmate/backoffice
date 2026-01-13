"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ClubBackofficeDetailDto, OverridableValue } from "@/types/api";
import type { ClubDraft } from "./utils";
import { OverridableFieldWrapper } from "@/components/overridable-field-wrapper";
import { formatGeoForCopy } from "@/lib/overridable-value";
import { cn } from "@/lib/utils";

interface ClubInfoContactProps {
  clubApi: ClubBackofficeDetailDto | null;
  draft: ClubDraft;
  onUpdate: (updates: Partial<ClubDraft>) => void;
  inputClassName: string;
  onGeoValidationChange: (isInvalid: boolean) => void;
}

export function ClubInfoContact({
  clubApi,
  draft,
  onUpdate,
  inputClassName,
  onGeoValidationChange,
}: ClubInfoContactProps) {
  // Local state for lat/lng inputs (string to handle validation)
  const [latInput, setLatInput] = useState(
    draft.latitude != null ? String(draft.latitude) : ""
  );
  const [lngInput, setLngInput] = useState(
    draft.longitude != null ? String(draft.longitude) : ""
  );

  // Update local inputs when draft changes from external source
  useEffect(() => {
    setLatInput(draft.latitude != null ? String(draft.latitude) : "");
    setLngInput(draft.longitude != null ? String(draft.longitude) : "");
  }, [draft.latitude, draft.longitude]);

  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLatInput(value);

    if (value === "") {
      onUpdate({ latitude: null });
      // Validation: si un champ est vide, l'autre doit l'être aussi
      onGeoValidationChange(lngInput !== "");
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        onUpdate({ latitude: num });
        // Validation: si un champ est rempli, l'autre est requis
        onGeoValidationChange(lngInput === "" || isNaN(parseFloat(lngInput)));
      } else {
        onGeoValidationChange(true);
      }
    }
  };

  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLngInput(value);

    if (value === "") {
      onUpdate({ longitude: null });
      // Validation: si un champ est vide, l'autre doit l'être aussi
      onGeoValidationChange(latInput !== "");
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        onUpdate({ longitude: num });
        // Validation: si un champ est rempli, l'autre est requis
        onGeoValidationChange(latInput === "" || isNaN(parseFloat(latInput)));
      } else {
        onGeoValidationChange(true);
      }
    }
  };

  // Validation: les deux doivent être valides ou les deux vides
  const isLatInvalid =
    latInput !== "" && isNaN(parseFloat(latInput));
  const isLngInvalid =
    lngInput !== "" && isNaN(parseFloat(lngInput));
  const isGeoIncomplete =
    (latInput !== "" && lngInput === "") || (latInput === "" && lngInput !== "");

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
            {clubApi ? (
              <OverridableFieldWrapper
                overridableValue={clubApi.phone}
                fieldLabel="Téléphone"
              >
                <Input
                  id="phone"
                  type="tel"
                  value={draft.phone || ""}
                  onChange={(e) => onUpdate({ phone: e.target.value })}
                  className={inputClassName}
                  placeholder="Ex: 01 23 45 67 89"
                />
              </OverridableFieldWrapper>
            ) : (
              <Input
                id="phone"
                type="tel"
                value={draft.phone || ""}
                onChange={(e) => onUpdate({ phone: e.target.value })}
                className={inputClassName}
                placeholder="Ex: 01 23 45 67 89"
              />
            )}
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="websiteUrl">Site web</Label>
            {clubApi ? (
              <OverridableFieldWrapper
                overridableValue={clubApi.websiteUrl}
                fieldLabel="Site web"
              >
                <Input
                  id="websiteUrl"
                  type="url"
                  value={draft.websiteUrl || ""}
                  onChange={(e) => onUpdate({ websiteUrl: e.target.value })}
                  className={inputClassName}
                  placeholder="https://..."
                />
              </OverridableFieldWrapper>
            ) : (
              <Input
                id="websiteUrl"
                type="url"
                value={draft.websiteUrl || ""}
                onChange={(e) => onUpdate({ websiteUrl: e.target.value })}
                className={inputClassName}
                placeholder="https://..."
              />
            )}
          </div>
        </div>

        {/* Address */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="street">Rue</Label>
            {clubApi ? (
              <OverridableFieldWrapper
                overridableValue={{
                  scraped: clubApi.address.scraped?.street ?? null,
                  admin: clubApi.address.admin?.street ?? null,
                }}
                fieldLabel="Rue"
              >
                <Input
                  id="street"
                  value={draft.address.street || ""}
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
              </OverridableFieldWrapper>
            ) : (
              <Input
                id="street"
                value={draft.address.street || ""}
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
            )}
          </div>

          <div>
            <Label htmlFor="zipCode">Code postal</Label>
            {clubApi ? (
              <OverridableFieldWrapper
                overridableValue={{
                  scraped: clubApi.address.scraped?.zipCode ?? null,
                  admin: clubApi.address.admin?.zipCode ?? null,
                }}
                fieldLabel="Code postal"
              >
                <Input
                  id="zipCode"
                  value={draft.address.zipCode || ""}
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
              </OverridableFieldWrapper>
            ) : (
              <Input
                id="zipCode"
                value={draft.address.zipCode || ""}
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
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="city">Ville</Label>
            {clubApi ? (
              <OverridableFieldWrapper
                overridableValue={{
                  scraped: clubApi.address.scraped?.city ?? null,
                  admin: clubApi.address.admin?.city ?? null,
                }}
                fieldLabel="Ville"
              >
                <Input
                  id="city"
                  value={draft.address.city || ""}
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
              </OverridableFieldWrapper>
            ) : (
              <Input
                id="city"
                value={draft.address.city || ""}
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
            )}
          </div>
        </div>

        {/* GPS Coordinates with validation */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Coordonnées GPS
          </h3>
          {isGeoIncomplete && (
            <p className="text-xs text-amber-600 mb-2">
              Les deux coordonnées doivent être renseignées ensemble
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              {clubApi ? (
                <OverridableFieldWrapper
                  overridableValue={{
                    scraped: clubApi.geo.scraped?.latitude ?? null,
                    admin: clubApi.geo.admin?.latitude ?? null,
                  }}
                  fieldLabel="Latitude"
                  formatForCopy={(lat) => String(lat)}
                >
                  <Input
                    id="latitude"
                    type="text"
                    value={latInput}
                    onChange={handleLatChange}
                    className={cn(
                      inputClassName,
                      isLatInvalid &&
                        "border-red-500 focus:border-red-500 focus:ring-red-200"
                    )}
                    placeholder="Ex: 48.856614"
                  />
                </OverridableFieldWrapper>
              ) : (
                <Input
                  id="latitude"
                  type="text"
                  value={latInput}
                  onChange={handleLatChange}
                  className={cn(
                    inputClassName,
                    isLatInvalid &&
                      "border-red-500 focus:border-red-500 focus:ring-red-200"
                  )}
                  placeholder="Ex: 48.856614"
                />
              )}
              {isLatInvalid && (
                <p className="text-xs text-red-600 mt-1">Valeur invalide</p>
              )}
            </div>

            <div>
              <Label htmlFor="longitude">Longitude</Label>
              {clubApi ? (
                <OverridableFieldWrapper
                  overridableValue={{
                    scraped: clubApi.geo.scraped?.longitude ?? null,
                    admin: clubApi.geo.admin?.longitude ?? null,
                  }}
                  fieldLabel="Longitude"
                  formatForCopy={(lng) => String(lng)}
                >
                  <Input
                    id="longitude"
                    type="text"
                    value={lngInput}
                    onChange={handleLngChange}
                    className={cn(
                      inputClassName,
                      isLngInvalid &&
                        "border-red-500 focus:border-red-500 focus:ring-red-200"
                    )}
                    placeholder="Ex: 2.352222"
                  />
                </OverridableFieldWrapper>
              ) : (
                <Input
                  id="longitude"
                  type="text"
                  value={lngInput}
                  onChange={handleLngChange}
                  className={cn(
                    inputClassName,
                    isLngInvalid &&
                      "border-red-500 focus:border-red-500 focus:ring-red-200"
                  )}
                  placeholder="Ex: 2.352222"
                />
              )}
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
