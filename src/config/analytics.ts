const fallbackGaMeasurementId = "G-RPQJB8FB9F";

function resolveGaMeasurementId(): string {
  const raw = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return raw || fallbackGaMeasurementId;
}

export const gaMeasurementId = resolveGaMeasurementId();
