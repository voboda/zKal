import { fetchCalendar } from '$lib/fetchCalendar';

export async function GET(req) {
  const events = await fetchCalendar();

  return new Response(JSON.stringify(events), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

