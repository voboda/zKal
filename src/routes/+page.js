export async function load({ fetch }) {
  const res = await fetch("/feed/json");
  const data = await res.json();

  // Calculate min and max VAR scores
  let minVarScore = Infinity;
  let maxVarScore = -Infinity;
  
  // First, find valid varScores
  data.forEach(event => {
    if (event.varScore !== null && event.varScore !== undefined) {
      const score = parseFloat(event.varScore);
      if (!isNaN(score)) {
        if (score < minVarScore) minVarScore = score;
        if (score > maxVarScore) maxVarScore = score;
      }
    }
  });

  // If no valid scores found, set defaults
  if (minVarScore === Infinity) minVarScore = 0;
  if (maxVarScore === -Infinity) maxVarScore = 0;

  let events;

  if (data.length) {
    events = data.map((event) => {
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

      // Calculate normalized varScore
      let normalizedVarScore = 0;
      if (event.varScore !== null && event.varScore !== undefined) {
        const score = parseFloat(event.varScore);
        if (!isNaN(score)) {
          normalizedVarScore = (score - minVarScore) / (maxVarScore - minVarScore || 1);
        }
      }

      return {
        title: event.summary,
        start: startDate,
        end: endDate,
        extendedProps: {
          description: event.description,
          signupLink: event.signupLink,
          calendarName: event.calendarName,
          attendees,
          varScore: event.varScore,
          varQuartile: event.varQuartile,
          normalizedVarScore: normalizedVarScore,
        },
        backgroundColor: event.calendarColor,
      };
    });
  }

  return {
    props: {
      events: events || [],
      varScoreRange: {
        min: minVarScore,
        max: maxVarScore
      }
    },
  };
}
