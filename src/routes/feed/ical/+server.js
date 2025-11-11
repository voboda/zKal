import { fetchCalendar } from "$lib/fetchCalendar";

export async function GET(req) {
  const events = await fetchCalendar();

  // Create a new iCalendar object
  const ICAL = (await import("ical.js")).default;
  let newComp = new ICAL.Component(["vcalendar", [], []]);

  for (let eventData of events) {
    let event = new ICAL.Component("vevent");
    event.updatePropertyWithValue("summary", eventData.summary);
    event.updatePropertyWithValue("description", eventData.description);
    event.updatePropertyWithValue("dtstart", eventData.dtstart);
    event.updatePropertyWithValue("dtend", eventData.dtend);
    event.updatePropertyWithValue("X-CALENDAR-NAME", eventData.calendarName);
    event.updatePropertyWithValue("X-CALENDAR-COLOR", eventData.calendarColor);
    event.updatePropertyWithValue("X-ATTENDEES", eventData.attendees);
    event.updatePropertyWithValue("X-SIGNUP-LINK", eventData.signupLink);
    newComp.addSubcomponent(event);
  }

  // Generate the iCalendar data
  let icsData = newComp.toString();

  return new Response(icsData, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar",
    },
  });
}
