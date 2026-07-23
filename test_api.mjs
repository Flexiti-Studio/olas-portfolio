fetch('http://localhost:3000/api/creators')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
