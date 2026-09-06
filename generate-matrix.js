const fs = require('fs');

// 1. Lógica de umbrales de color personalizada
function getColor(count) {
  if (count >= 1 && count <= 3) return '#ef4444'; // Rojo (1-3 commits)
  if (count >= 4 && count <= 7) return '#eab308'; // Amarillo (4-7 commits)
  if (count > 7)               return '#22c55e'; // Verde (7+ commits)
  return '#1e293b';                              // Neutro / Sin actividad (0 commits)
}

// 2. Consulta a la API de GitHub GraphQL
async function fetchGithubActivity(username, token) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  const json = await response.json();
  return json.data.user.contributionsCollection.contributionCalendar.weeks;
}

// 3. Renderizado de matriz en SVG
async function buildSVG() {
  const username = process.env.GITHUB_REPOSITORY_OWNER;
  const token = process.env.GITHUB_TOKEN;
  
  if (!username || !token) {
    console.error("Faltan variables de entorno necesarias.");
    process.exit(1);
  }

  const weeks = await fetchGithubActivity(username, token);
  
  const cellSize = 12;
  const cellGap = 4;
  const width = weeks.length * (cellSize + cellGap) + 20;
  const height = 7 * (cellSize + cellGap) + 30;

  let rectsSVG = '';

  weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day) => {
      const dateObj = new Date(day.date);
      const dayOfWeek = dateObj.getUTCDay(); // 0 (Dom) a 6 (Sáb)
      const x = wIndex * (cellSize + cellGap) + 10;
      const y = dayOfWeek * (cellSize + cellGap) + 10;
      const color = getColor(day.contributionCount);

      rectsSVG += `
        <rect 
          x="${x}" 
          y="${y}" 
          width="${cellSize}" 
          height="${cellSize}" 
          rx="2" 
          fill="${color}"
        >
          <title>${day.contributionCount} commits el ${day.date}</title>
        </rect>`;
    });
  });

  const svgContent = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: #0f172a; border-radius: 8px; font-family: system-ui, sans-serif;">
  <g>${rectsSVG}</g>
  <!-- Leyenda inferior -->
  <g transform="translate(10, ${height - 12})" font-size="10" fill="#94a3b8">
    <text x="0" y="8">Escala de actividad:</text>
    <rect x="110" y="0" width="8" height="8" rx="1" fill="#1e293b"/>
    <text x="122" y="8">0</text>
    <rect x="140" y="0" width="8" height="8" rx="1" fill="#ef4444"/>
    <text x="152" y="8">1-3</text>
    <rect x="180" y="0" width="8" height="8" rx="1" fill="#eab308"/>
    <text x="192" y="8">4-7</text>
    <rect x="220" y="0" width="8" height="8" rx="1" fill="#22c55e"/>
    <text x="232" y="8">7+</text>
  </g>
</svg>
`;

  fs.writeFileSync('activity-matrix.svg', svgContent);
  console.log('SVG generado con éxito: activity-matrix.svg');
}

buildSVG();
