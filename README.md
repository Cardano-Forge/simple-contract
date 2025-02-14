# Simple Script

Simple Script is a Cardano smart contract written in Aiken that enforces time-locked minting with an authorized signer.

## Features
- **Time Lock**: Minting is restricted to transactions before a predefined expiration timestamp.
- **Authorized Signer**: Only transactions signed by a specific key can mint tokens.

## Project Structure
- **`validators/`**: Contains smart contract logic in Aiken (`.ak` files).
- **`lib/`**: Utility functions supporting contract logic.
- **`env/`**: Environment-based configuration files.

## Example Validator
```aiken
use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use time.{must_be_before_lower_bound}

/// Simple script simulator to mock the basic time-locked policy
validator simple_script {
  mint(_redeemer: Data, _policy_id: PolicyId, self: Transaction) {
    // Until what POSIX time you can mint
    let expiration_time = 0

    // Keyhash that needs to sign the transaction
    let signer = #""

    // Check that the signer is present in the extra_signatories
    let is_signed = list.has(self.extra_signatories, signer)

    // Check that the tx is before the expiration time
    let is_not_expired =
      must_be_before_lower_bound(self.validity_range, expiration_time)

    and {
      is_signed?,
      is_not_expired?,
    }
  }

  else(_) {
    False
  }
}
```

## Installation
Ensure you have Aiken installed. If not, install it using:
```sh
curl -sSL https://get.aiken-lang.org | bash
```

## Building
Compile the contract with:
```sh
aiken build
```

## Configuration
Edit **`aiken.toml`** to set network parameters:
```toml
[config.default]
network_id = 41
```

Alternatively, use conditional environment modules in the `env/` directory.

## Testing
Aiken allows writing tests using the `test` keyword. Example:
```aiken
test simple_script_mint() {
  config.network_id + 1 == 42
}
```
Run all tests:
```sh
aiken check
```
Run specific tests:
```sh
aiken check -m simple_script_mint
```

## Documentation
Generate project documentation:
```sh
aiken docs
```

## Resources
- [Aiken User Manual](https://aiken-lang.org)

