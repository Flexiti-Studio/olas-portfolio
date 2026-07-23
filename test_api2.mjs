fetch('http://localhost:3000/api/creators/cmrhm3ey6000076n566mv8qgq')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
