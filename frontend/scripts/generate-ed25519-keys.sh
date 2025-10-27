#!/bin/bash

# Generate Ed25519 keys for Veris MVP
# Per MVP §2.1 - Ed25519 cryptographic implementation

echo "🔑 Generating Ed25519 keys for Veris MVP..."

# Generate private key
openssl genpkey -algorithm ed25519 -out ed25519_private.pem

# Extract public key
openssl pkey -in ed25519_private.pem -pubout -out ed25519_public.pem

# Convert to base64 format for environment variables
echo ""
echo "📋 Add these to your .env.local:"
echo ""
echo "# Ed25519 Keys (MVP §2.1)"
echo "VERIS_ED25519_PRIVATE_KEY=\"$(cat ed25519_private.pem)\""
echo "VERIS_ED25519_PUBLIC_KEY=\"$(cat ed25519_public.pem)\""
echo "VERIS_ISSUER=\"did:web:veris.example\""
echo ""

# Show key locations
echo "✅ Keys generated:"
echo "  Private: ed25519_private.pem"
echo "  Public:  ed25519_public.pem"
echo ""
echo "⚠️  Keep the private key secure and never commit it to git!"
