const fs = require('fs');
const path = require('path');

// Read the .env file at build-time
const envPath = path.resolve(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); // strip quotes if any
      env[key] = value;
    }
  });
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    // Custom inline env replacement plugin (Zero dependencies)
    function () {
      return {
        name: 'inline-env-variables',
        visitor: {
          MemberExpression(nodePath) {
            if (nodePath.matchesPattern('process.env', true)) {
              const key = nodePath.node.property.name;
              if (key in env) {
                nodePath.replaceWith({ type: 'StringLiteral', value: env[key] });
              }
            }
          },
        },
      };
    },
  ],
};
