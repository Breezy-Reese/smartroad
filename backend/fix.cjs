const fs = require('fs');
let sms = fs.readFileSync('src/services/sms.service.ts', 'utf8');
const lines = sms.split('\n');
const newLines = lines.map(line => {
  if (line.includes('this.client = twilio(accountSid, authToken)')) {
    return line.replace(
      'this.client = twilio(accountSid, authToken);',
      'try { this.client = twilio(accountSid, authToken); } catch(e) { logger.warn("Twilio init failed: " + e.message); return; }'
    );
  }
  if (line.includes('if (accountSid && authToken)')) {
    return line.replace(
      'if (accountSid && authToken)',
      "if (accountSid && authToken && !accountSid.includes('your_'))"
    );
  }
  return line;
});
fs.writeFileSync('src/services/sms.service.ts', newLines.join('\n'));
console.log('Done');
