import { json } from '@sveltejs/kit';

export async function GET() {
  // For now, return a simple config
  // In the future, we might want to fetch POD-based config
  return json({
    entries: [],
    podEnabled: true,
    version: '1.0.0'
  });
}
