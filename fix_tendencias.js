const fs = require("fs");
const f = "frontend/src/components/Tendencias.jsx";
let c = fs.readFileSync(f, "utf8");
const greeting = "Hola \u{1F44B}. Puedes preguntarme por ventas, productos, clientes, comparativas por fechas, o lo que necesites.";
c = c.replace('"' + greeting + '"', "t('trends.aiGreeting')");
const clearMsg = "Chat reiniciado. Pregúntame cualquier cosa \u{1F642}";
c = c.replace('"' + clearMsg + '"', "t('trends.clearChatMsg')");
fs.writeFileSync(f, c, "utf8");
console.log("done");
