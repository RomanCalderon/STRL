export function mapPosterSrc(cityId: string): string {
  return `/api/maps/static?cityId=${encodeURIComponent(cityId)}`;
}
