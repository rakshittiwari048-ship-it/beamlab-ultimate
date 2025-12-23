# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in BeamLab Ultimate, please report it responsibly:

1. **Do NOT** open a public issue
2. Email the maintainers directly (add your email here)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices

### Environment Variables
- Never commit `.env` files
- Use Azure Key Vault for production secrets
- Rotate API keys regularly

### Authentication
- Uses Clerk for secure authentication
- JWT tokens expire after 1 hour
- All API routes are protected

### Database
- MongoDB Atlas with IP whitelisting
- Encrypted connections (TLS)
- Regular backups

## Response Timeline

- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix deployment: Depends on severity (critical < 24h)

Thank you for helping keep BeamLab secure!
