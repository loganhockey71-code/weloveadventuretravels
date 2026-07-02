const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { AUTH_FILE, DATA_DIR, ROOT } = require('./pages-config');

const ENV_FILE = path.join(ROOT, '.env');
// Only manage a local .env file for plain local-dev use. On a hosted platform
// (DATA_DIR pointed at a persistent disk), env vars are configured through
// the platform's dashboard instead, so leave them alone here.
const MANAGE_ENV_FILE = DATA_DIR === ROOT;

const CODE_CR = 13;
const CODE_LF = 10;
const CODE_ETX = 3; // Ctrl+C
const CODE_BACKSPACE = 8;
const CODE_DEL = 127;

function prompt(question, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => { rl.close(); resolve(answer); });
      return;
    }
    // Mask input for password prompts
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    const onData = (chunk) => {
      const code = chunk[0];
      if (code === CODE_CR || code === CODE_LF) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(value);
        return;
      }
      if (code === CODE_ETX) { process.exit(1); }
      if (code === CODE_BACKSPACE || code === CODE_DEL) { value = value.slice(0, -1); return; }
      value += chunk.toString('utf8');
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('\n  We Love Adventure Travels — Admin Panel Setup\n');

  const username = (await prompt('  Admin username [victoria]: ')) || 'victoria';
  let password = '';
  while (password.length < 8) {
    password = await prompt('  Set admin password (min 8 characters): ', true);
    if (password.length < 8) console.log('  Password too short, try again.');
  }
  const confirm = await prompt('  Confirm password: ', true);
  if (confirm !== password) {
    console.log('\n  Passwords did not match. Run "npm run setup" again.\n');
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const passwordHash = bcrypt.hashSync(password, 12);
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ username, passwordHash }, null, 2));

  if (MANAGE_ENV_FILE) {
    // Ensure .env has a session secret
    let envContent = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
    if (!/SESSION_SECRET=/.test(envContent)) {
      const secret = crypto.randomBytes(32).toString('hex');
      envContent += (envContent.endsWith('\n') || envContent === '' ? '' : '\n') + `SESSION_SECRET=${secret}\n`;
    }
    if (!/PORT=/.test(envContent)) {
      envContent += `PORT=3012\n`;
    }
    if (!/NETLIFY_AUTH_TOKEN=/.test(envContent)) {
      envContent += `NETLIFY_AUTH_TOKEN=\n`;
    }
    if (!/NETLIFY_SITE_ID=/.test(envContent)) {
      envContent += `NETLIFY_SITE_ID=\n`;
    }
    fs.writeFileSync(ENV_FILE, envContent);
  }

  console.log(`\n  Admin account created for "${username}".`);
  console.log('  Run "npm start" and open the admin panel to log in.\n');
}

main();
