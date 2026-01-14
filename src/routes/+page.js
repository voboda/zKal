export async function load({ fetch }) {
  const res = await fetch("/feed/json");
  const data = await res.json();
  const events = data.map((event) => {
    const startDate = new Date(
      Date.UTC(
        event.dtstart?.year ?? 0,
        (event.dtstart?.month ?? 1) - 1,
        event.dtstart?.day ?? 1,
        event.dtstart?.hour ?? 0,
        event.dtstart?.minute ?? 0,
        event.dtstart?.second ?? 0,
      ),
    );
    const endDate = new Date(
      Date.UTC(
        event.dtend?.year ?? 0,
        (event.dtend?.month ?? 1) - 1,
        event.dtend?.day ?? 1,
        event.dtend?.hour ?? 0,
        event.dtend?.minute ?? 0,
        event.dtend?.second ?? 0,
      ),
    );
    const attendees = parseInt(event.attendees, 10) || 0;

    return {
      title: event.summary,
      start: startDate,
      end: endDate,
      extendedProps: {
        description: event.description,
        signupLink: event.signupLink,
        calendarName: event.calendarName,
        attendees,
      },
      backgroundColor: event.calendarColor,
    };
  });

  return {
    props: {
      events,
    },
  };
}
