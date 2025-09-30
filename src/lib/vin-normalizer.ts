export type NhtsaRow = Record<string, string>;

export type VinNormalized = {
  make?: string;
  model?: string;
  year?: string;
  engine?: string;
  transmission?: string;
  axles?: string;
  typeHint?: string;
};

/**
 * Normalize NHTSA VIN decode response into structured fields
 * Never touches 'hours' - that's for equipment only and not in NHTSA data
 */
export function normalizeNhtsa(row: NhtsaRow): VinNormalized {
  const make = row.Make || undefined;
  const model = row.Model || undefined;
  const year = row.ModelYear || undefined;

  // Build engine string from available parts
  const engParts = [
    row.EngineManufacturer,
    row.EngineModel,
    row.DisplacementL ? `${row.DisplacementL}L` : undefined,
    row.EngineHP ? `${row.EngineHP} HP` : undefined,
  ].filter(Boolean);
  const engine = engParts.length ? engParts.join(' ') : undefined;

  // Build transmission string from available parts
  const transParts = [
    row.TransmissionManufacturer,
    row.TransmissionStyle,
    row.TransmissionSpeeds ? `${row.TransmissionSpeeds}-speed` : undefined,
  ].filter(Boolean);
  const transmission = transParts.length ? transParts.join(' ') : undefined;

  // Parse axles as string (form expects string for consistency)
  const axlesNum = Number(row.NumberOfAxles || row.Axles);
  const axles = axlesNum > 0 ? String(axlesNum) : undefined;

  // Best-effort type hint from body class or vehicle type
  const typeHint = row.BodyClass || row.VehicleType || undefined;

  return { make, model, year, engine, transmission, axles, typeHint };
}
