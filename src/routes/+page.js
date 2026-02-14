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

      // Calculate background color based on quartile
      let backgroundColor;
      const quartile = event.varQuartile;
      
      if (quartile === 1 || quartile === 2 || quartile === 3 ) {
        backgroundColor = '#6B6ACD';
      } else if (( quartile === 4) && normalizedVarScore !== 0) {
        const t = Math.max(0, Math.min(1, normalizedVarScore));
        const color1 = { r: 107, g: 106, b: 205 };    // #6B6ACD
        const color2 = { r: 107, g: 203, b: 0 };      // #FFCB00
        
        const r = Math.round(color1.r + (color2.r - color1.r) * t);
        const g = Math.round(color1.g + (color2.g - color1.g) * t);
        const b = Math.round(color1.b + (color2.b - color1.b) * t);
        
        backgroundColor = `rgb(${r}, ${g}, ${b})`;
      } else {
        backgroundColor = '#6B6ACD';
      }

      return {
        title: event.summary,
        start: startDate,
        end: endDate,
        backgroundColor: backgroundColor,
        extendedProps: {
          description: event.description,
          signupLink: event.signupLink,
          calendarName: event.calendarName,
          calendarColor: event.calendarColor,
          attendees,
          varScore: event.varScore,
          varQuartile: event.varQuartile,
          normalizedVarScore: normalizedVarScore,
        },
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
