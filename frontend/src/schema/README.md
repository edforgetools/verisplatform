# Veris Schema Documentation

## Canonicalization Rules

All proof JSON must be canonicalized according to these rules to ensure deterministic hashing and signing:

### 1. Character Encoding

- **UTF-8 only**: All JSON must be encoded as UTF-8
- **No BOM**: No Byte Order Mark allowed

### 2. Key Ordering

- **Stable key order**: Object keys must be sorted lexicographically (alphabetically)
- **Recursive**: Apply to all nested objects
- **Arrays**: Array element order must be preserved (no sorting)

### 3. String Formatting

- **No pretty printing**: No extra whitespace, newlines, or indentation
- **No trailing spaces**: Trim all whitespace
- **Compact**: Single line JSON output

### 4. Number Formatting

- **No leading zeros**: `1` not `01`
- **No trailing zeros**: `1.5` not `1.50`
- **No scientific notation**: Use decimal format only
- **Integers**: No decimal point for whole numbers

### 5. String Escaping

- **Minimal escaping**: Only escape required characters (`"`, `\`, control chars)
- **Unicode**: Use `\uXXXX` for non-ASCII characters
- **No unnecessary escapes**: Don't escape `/` or other safe characters

### 6. Boolean and Null

- **Lowercase**: `true`, `false`, `null` (not `True`, `False`, `NULL`)

### 7. Deterministic Stringification

- **Consistent output**: Same input always produces identical JSON bytes
- **No platform differences**: Works identically across systems
- **Hash stability**: Canonical JSON produces consistent SHA256 hashes

## Implementation Example

```typescript
import { stringify } from "canonical-json";

// Correct canonicalization
const canonicalJson = stringify(proofObject);

// Wrong - not canonical
const wrongJson = JSON.stringify(proofObject, null, 2);
```

## Validation

All proof JSON must:

1. Pass JSON Schema validation against `proof.v1.json`
2. Be canonicalized according to these rules
3. Produce consistent hashes across all implementations
4. Be signed over the exact canonical bytes

## Schema Versioning

- **v1**: Initial canonical proof schema
- **Future versions**: Will maintain backward compatibility
- **Migration**: Old proofs remain valid, new proofs use latest schema
