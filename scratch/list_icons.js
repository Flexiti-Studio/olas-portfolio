const lucide = require('lucide-react');
const keys = Object.keys(lucide);
console.log("Instagram keys:", keys.filter(k => k.toLowerCase().includes("insta")));
console.log("Twitter keys:", keys.filter(k => k.toLowerCase().includes("twit")));
console.log("Youtube/YouTube keys:", keys.filter(k => k.toLowerCase().includes("yout")));
console.log("Linkedin/LinkedIn keys:", keys.filter(k => k.toLowerCase().includes("linke")));
console.log("Total keys:", keys.length);

