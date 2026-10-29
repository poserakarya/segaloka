const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");

const source = path.join(
  root,
  "services/api/public/traveler-auth/icons"
);

const destination = path.resolve(
  __dirname,
  "../public/images/auth"
);

fs.mkdirSync(destination, { recursive: true });

for (const name of ["google.svg", "phone.svg", "email.svg"]) {
  const from = path.join(source, name);
  const to = path.join(destination, name);

  if (!fs.existsSync(from)) {
    throw new Error(`Missing icon: ${from}`);
  }

  fs.copyFileSync(from, to);
  console.log(`Synced: ${name}`);
}