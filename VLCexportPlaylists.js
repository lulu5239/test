// Make sure to put the vlc_media.db database in the same folder as the script (else try to edit the script).
// App that can run NodeJS scripts like this : https://play.google.com/store/apps/details?id=io.tempage.dorynode
// Modules required : sql.js

(async ()=>{
const initSqlJs = require('sql.js');
// or if you are in a browser:
// const initSqlJs = window.initSqlJs;

const SQL = await initSqlJs({
  // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
  // You can omit locateFile completely when running in node
  //locateFile: file => `vlc_media.db`
});

const fs = require('fs');

fs.readFile('vlc_media.db', (err, data) => {
  if (err) {
    console.error("Error reading database file:", err);
    return;
  }

  const db = new SQL.Database(data); // Initialize the database

  // Multi-table query to get playlist info with file paths
  const query = `
    SELECT
      p.name AS playlist_name,
      f.mrl AS media_path,  -- Use mrl from the File table
      pmr.position AS media_position
    FROM
      Playlist AS p
    INNER JOIN
      PlaylistMediaRelation AS pmr ON p.id_playlist = pmr.playlist_id
    INNER JOIN
      File AS f ON pmr.media_id = f.media_id  -- Join with File table
    ORDER BY
      p.name, pmr.position;
  `;

  const stmt = db.prepare(query);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  const playlists = {};

  rows.forEach(row => {
    const playlistName = row.playlist_name;
    const mediaPath = row.media_path; // Directly use the mrl
    const mediaPosition = row.media_position;

    if (!playlists[playlistName]) {
      playlists[playlistName] = [];
    }
    playlists[playlistName].push({ path: mediaPath, position: mediaPosition });
  });
  
  //return console.log(rows.slice(0,10), playlists)
  
  for (const playlistName in playlists) {
    playlists[playlistName].sort((a, b) => a.position - b.position);
  }

  for (const playlistName in playlists) {
    const m3uContent = playlists[playlistName].map(item => item.path).join('\n');
    fs.writeFileSync(`${playlistName}.m3u`, m3uContent);
  }

  console.log("Playlists generated:", Object.keys(playlists));
});


})()
