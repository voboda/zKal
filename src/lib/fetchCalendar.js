import { promises as fs } from "node:fs";
import path from "node:path";
import eyes from "eyes";
//import env from '$env'
import {
  PUBLIC_CACHE_DIR,
  PUBLIC_CACHE_FILE,
  PUBLIC_CACHE_TIME,
  PUBLIC_CALENDAR_URLS,
  PUBLIC_SIGNUP_LINK_PATTERNS,
} from "$env/static/public";

const PUBLIC_CACHE_DIR_PATH = path.join(process.cwd(), PUBLIC_CACHE_DIR);
const PUBLIC_CACHE_FILE_PATH = path.join(
  PUBLIC_CACHE_DIR_PATH,
  PUBLIC_CACHE_FILE,
);
const inspector = eyes.inspector({ maxLength: false });

export async function fetchCalendar() {
  const now = Date.now();

  try {
    // Check if the cache directory exists, if not create it
    await fs.access(PUBLIC_CACHE_DIR_PATH);
  } catch (err) {
    await fs.mkdir(PUBLIC_CACHE_DIR_PATH);
  }

  try {
    // Check if the cache file exists and is less than 10 minutes old
    const stats = await fs.stat(PUBLIC_CACHE_FILE_PATH);
    if (now - stats.mtimeMs < PUBLIC_CACHE_TIME) {
      // If so, return the cached data
      const calendarData = JSON.parse(
        await fs.readFile(PUBLIC_CACHE_FILE_PATH, "utf8"),
      );
      return calendarData;
    }
    console.log("[fetchCalendar] no cache");
  } catch (err) {
    // Ignore errors (the file probably doesn't exist)
  }

  // Create a new iCalendar object
  const ICAL = (await import("ical.js")).default;
  let events = [];

  for (let calendar of JSON.parse(PUBLIC_CALENDAR_URLS)) {
    console.log("[fetchCalendar] feed url:", calendar.url);
    const response = await fetch(calendar.url);
    const data = await response.text();

    // Parse the .ics data
    let jcalData = ICAL.parse(data);
    let comp = new ICAL.Component(jcalData);

    // Iterate over the events
    comp.getAllSubcomponents("vevent").forEach((vevent) => {
      // Create a new event and set its properties
      let event = new ICAL.Component("vevent");

      let summary, dtstart, dtend;
      try {
        summary = vevent.getFirstPropertyValue("summary");
        dtstart = vevent.getFirstPropertyValue("dtstart");
        dtend = vevent.getFirstPropertyValue("dtend");
      } catch (err) {
        console.error("Error getting summary, dtstart, or dtend:", err);
        inspector(vevent);
        return; // Skip this event
      }

      if (summary) {
        event.updatePropertyWithValue("summary", summary);
      }

      let description = "";
      let attendees = [];
      try {
        description = vevent.getFirstPropertyValue("description") || "";
        attendees = vevent.getAllProperties("attendee");
      } catch (err) {
        console.error("Error getting description or attendees:", err);
        inspector(vevent);
      }
      event.updatePropertyWithValue("description", description);

      if (dtstart) {
        event.updatePropertyWithValue("dtstart", dtstart);
      }

      if (dtend) {
        event.updatePropertyWithValue("dtend", dtend);
      }

      // Search for links in the description
      let links = description.match(/https?:\/\/[^\s]+/g) || [];
      let signupLink = "";

      // Filter for specific domains and use the last one if multiple are found
      let specificLinks = links.filter((link) =>
        JSON.parse(PUBLIC_SIGNUP_LINK_PATTERNS).some((specLink) =>
          link.startsWith(specLink),
        ),
      );
      if (specificLinks.length > 0) {
        signupLink = specificLinks[specificLinks.length - 1];
      } else if (links.length > 0) {
        // If no specific links are found, use the last link
        signupLink = links[links.length - 1];
      }

      if (signupLink) {
        event.updatePropertyWithValue("X-SIGNUP-LINK", signupLink);
      }

      // Add the event to the JSON array
      events.push({
        summary: event.getFirstPropertyValue("summary"),
        description: event.getFirstPropertyValue("description"),
        dtstart: event.getFirstPropertyValue("dtstart"),
        dtend: event.getFirstPropertyValue("dtend"),
        calendarName: calendar.name || calendar.url,
        calendarColor: calendar.color,
        attendees: attendees.length + 1, // Add 1 to account for the proposer or host of the event
        signupLink: event.getFirstPropertyValue("X-SIGNUP-LINK"),
      });
    });
  }

  // Write the data to the cache file
  await fs.writeFile(PUBLIC_CACHE_FILE_PATH, JSON.stringify(events), "utf8");

  return events;
}
